"""
Scrape router - endpoints to enqueue scraping jobs.

Security & SaaS features:
- Google OAuth bearer authentication required (per-customer)
- Rate limiting for scrape endpoints
- Plan-gated features (e.g., Instagram)
- Monthly usage/credit enforcement
- Concurrent job limits per plan
"""

import json
import logging
import hashlib
import os
import time
from datetime import date, datetime, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_customer
from ..database import Customer, GuestPreviewUsage, Job, JobStatus, get_db
from ..plans import get_entitlement, get_or_create_monthly_usage, increment_usage, remaining_credits
from ..rate_limit import SCRAPE_LIMIT, limiter
from ..schemas import (
    BatchScrapeRequest,
    GuestPreviewLead,
    GuestPreviewUsageResponse,
    GuestScrapeResponse,
    GuestScrapeTarget,
    InstagramScrapeRequest,
    ScrapeResponse,
    ScrapeTarget,
)
from apify_client import fetch_dataset, poll_run_status, run_google_maps_scraper
from cleaner import add_derived_columns, clean_dataframe
from scorer import score_dataframe

logger = logging.getLogger("leadpilot")
router = APIRouter(prefix="/scrape", tags=["scrape"])
_GUEST_PREVIEW_CACHE: dict[str, tuple[datetime, dict[str, Any]]] = {}


def _env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        parsed = int(raw)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, parsed)


def _guest_preview_enabled() -> bool:
    return _env_bool("GUEST_PREVIEW_ENABLED", True)


def _guest_preview_mode() -> str:
    mode = (os.getenv("GUEST_PREVIEW_MODE", "demo") or "demo").strip().lower()
    if mode in {"demo", "live", "auto"}:
        return mode
    return "demo"


def _guest_preview_live_enabled() -> bool:
    mode = _guest_preview_mode()
    if mode == "live":
        return True
    if mode == "demo":
        return False
    return bool((os.getenv("APIFY_API_TOKEN", "") or "").strip())


def _guest_preview_cache_ttl_seconds() -> int:
    return _env_int("GUEST_PREVIEW_CACHE_TTL_SECONDS", 600, minimum=30)


def _guest_preview_timeout_seconds() -> int:
    return _env_int("GUEST_PREVIEW_TIMEOUT_SECONDS", 12, minimum=3)


def _guest_preview_cache_key(city: str, category: str, limit: int, dry_run: bool) -> str:
    mode = "demo" if dry_run else "live"
    return f"{city.strip().lower()}|{category.strip().lower()}|{int(limit)}|{mode}"


def _guest_preview_cache_get(cache_key: str) -> Optional[dict[str, Any]]:
    cached = _GUEST_PREVIEW_CACHE.get(cache_key)
    if not cached:
        return None
    expires_at, payload = cached
    if expires_at <= datetime.utcnow():
        _GUEST_PREVIEW_CACHE.pop(cache_key, None)
        return None
    return dict(payload)


def _guest_preview_cache_set(cache_key: str, payload: dict[str, Any]) -> None:
    ttl = _guest_preview_cache_ttl_seconds()
    _GUEST_PREVIEW_CACHE[cache_key] = (datetime.utcnow() + timedelta(seconds=ttl), dict(payload))


def _should_cache_guest_preview(payload: dict[str, Any]) -> bool:
    source = str(payload.get("data_source") or "")
    # Cache only trustworthy deterministic payloads:
    # - apify_live: successful live run output
    # - demo: explicit demo mode output
    # Do not cache fallback_timeout/fallback_error, so next attempt can retry live run.
    return source in {"apify_live", "demo"}


def _guest_preview_max_jobs() -> int:
    return _env_int("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", 2)


def _guest_preview_max_leads() -> int:
    return _env_int("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", 20)


def _build_guest_preview_fallback_leads(city: str, category: str, limit: int) -> list[dict]:
    base_names = [
        f"{city} {category} Center",
        f"Downtown {category} Studio",
        f"{city} Family {category}",
        f"{category} Hub {city}",
        f"Prime {category} {city}",
    ]
    reasons = [
        "Strong reviews but weak website conversion flow.",
        "Good local visibility with inconsistent follow-up signals.",
        "High intent search category with limited online trust assets.",
        "Solid profile but low review velocity in the last months.",
        "Good ranking potential with missing offer clarity.",
    ]
    leads: list[dict] = []
    requested = max(1, int(limit))
    for idx in range(requested):
        name = base_names[idx % len(base_names)]
        leads.append(
            {
                "name": name,
                "city": city,
                "category": category,
                "rating": round(3.8 + (idx % 5) * 0.2, 1),
                "reviews": 18 + (idx * 9),
                "website": None if idx % 2 else f"https://{name.lower().replace(' ', '')}.com",
                "maps_url": None,
                "lead_score": max(55, 82 - (idx * 4)),
                "reason": reasons[idx % len(reasons)],
                "ai_outreach": (
                    f"Hi {name}, noticed your {category.lower()} profile in {city}. "
                    "We can help turn local traffic into booked calls with a cleaner first-touch funnel."
                ),
            }
        )
    return leads


def _run_guest_preview_live(city: str, category: str, limit: int, dry_run: bool) -> dict[str, Any]:
    started = time.monotonic()
    execution_mode = "demo" if dry_run else "live"

    def _elapsed() -> int:
        return max(1, int(time.monotonic() - started))

    def _fallback(reason: str, source: str, run_id: Optional[str] = None, dataset_id: Optional[str] = None, status: Optional[str] = None) -> dict[str, Any]:
        return {
            "execution_mode": execution_mode,
            "data_source": source,
            "apify_run_id": run_id,
            "apify_dataset_id": dataset_id,
            "apify_final_status": status,
            "elapsed_seconds": _elapsed(),
            "fallback_reason": reason,
            "leads_data": _build_guest_preview_fallback_leads(city, category, limit),
        }

    # Demo mode returns static sample only.
    if dry_run:
        logger.info(
            "[guest-preview] Demo preview generated city=%s category=%s limit=%s",
            city,
            category,
            limit,
        )
        return {
            "execution_mode": execution_mode,
            "data_source": "demo",
            "apify_run_id": None,
            "apify_dataset_id": None,
            "apify_final_status": None,
            "elapsed_seconds": _elapsed(),
            "fallback_reason": None,
            "leads_data": _build_guest_preview_fallback_leads(city, category, limit),
        }

    timeout_seconds = _guest_preview_timeout_seconds()
    logger.info(
        "[guest-preview] Live preview started city=%s category=%s limit=%s timeout=%ss",
        city,
        category,
        limit,
        timeout_seconds,
    )

    run_id: Optional[str] = None
    dataset_id: Optional[str] = None
    final_status: Optional[str] = None

    try:
        run_info = run_google_maps_scraper(city=city, category=category, limit=limit)
        run_id = run_info.get("run_id")
        dataset_id = run_info.get("dataset_id")
        logger.info(
            "[guest-preview] Apify run created city=%s category=%s run_id=%s dataset_id=%s",
            city,
            category,
            run_id,
            dataset_id,
        )
    except Exception as exc:
        logger.error(
            "[guest-preview] Live run creation failed city=%s category=%s err=%s",
            city,
            category,
            exc,
        )
        return _fallback("run_creation_failed", "fallback_error")

    try:
        final_status = poll_run_status(
            run_id=run_id or "",
            max_wait=timeout_seconds,
            poll_interval=5,
        )
        logger.info(
            "[guest-preview] Apify run finished run_id=%s status=%s elapsed=%ss",
            run_id,
            final_status,
            _elapsed(),
        )
    except TimeoutError:
        logger.warning(
            "[guest-preview] Live run status timeout run_id=%s city=%s category=%s timeout=%ss",
            run_id,
            city,
            category,
            timeout_seconds,
        )
        return _fallback("run_status_timeout", "fallback_timeout", run_id=run_id, dataset_id=dataset_id)
    except Exception as exc:
        logger.error(
            "[guest-preview] Live run status failed run_id=%s err=%s",
            run_id,
            exc,
        )
        return _fallback("run_status_failed", "fallback_error", run_id=run_id, dataset_id=dataset_id)

    if final_status != "SUCCEEDED":
        logger.warning(
            "[guest-preview] Live run ended without success run_id=%s status=%s",
            run_id,
            final_status,
        )
        return _fallback(
            f"run_final_status_{str(final_status or 'unknown').lower()}",
            "fallback_error",
            run_id=run_id,
            dataset_id=dataset_id,
            status=final_status,
        )

    try:
        raw_rows = fetch_dataset(dataset_id=dataset_id or "")
        logger.info(
            "[guest-preview] Dataset rows fetched run_id=%s dataset_id=%s rows=%s",
            run_id,
            dataset_id,
            len(raw_rows or []),
        )
    except Exception as exc:
        logger.error(
            "[guest-preview] Dataset fetch failed run_id=%s dataset_id=%s err=%s",
            run_id,
            dataset_id,
            exc,
        )
        return _fallback(
            "dataset_fetch_failed",
            "fallback_error",
            run_id=run_id,
            dataset_id=dataset_id,
            status=final_status,
        )

    try:
        df = clean_dataframe(raw_rows or [])
        if df.empty:
            logger.warning("[guest-preview] Cleaned dataset is empty run_id=%s dataset_id=%s", run_id, dataset_id)
            return _fallback(
                "no_rows_after_clean",
                "fallback_error",
                run_id=run_id,
                dataset_id=dataset_id,
                status=final_status,
            )
        df = add_derived_columns(df)
        df = score_dataframe(df, check_websites=False)
        result = df.head(max(1, int(limit))).to_dict("records")
        logger.info(
            "[guest-preview] Live preview finished city=%s category=%s rows=%s run_id=%s",
            city,
            category,
            len(result or []),
            run_id,
        )
        if not result:
            return _fallback(
                "no_rows_after_score",
                "fallback_error",
                run_id=run_id,
                dataset_id=dataset_id,
                status=final_status,
            )
        return {
            "execution_mode": execution_mode,
            "data_source": "apify_live",
            "apify_run_id": run_id,
            "apify_dataset_id": dataset_id,
            "apify_final_status": final_status,
            "elapsed_seconds": _elapsed(),
            "fallback_reason": None,
            "leads_data": list(result),
        }
    except Exception as exc:
        logger.error(
            "[guest-preview] Normalization/scoring failed run_id=%s dataset_id=%s err=%s",
            run_id,
            dataset_id,
            exc,
        )
        return _fallback(
            "normalization_failed",
            "fallback_error",
            run_id=run_id,
            dataset_id=dataset_id,
            status=final_status,
        )


def _guest_fingerprint(request: Request) -> str:
    ip_addr = request.client.host if request.client else "unknown"
    user_agent = (request.headers.get("user-agent", "unknown") or "unknown").strip()[:200]
    return hashlib.sha256(f"{ip_addr}|{user_agent}".encode("utf-8")).hexdigest()


def _guest_usage_for_current_period(db: Session, fingerprint: str) -> GuestPreviewUsage:
    period_start = date.today().replace(day=1)
    usage = db.query(GuestPreviewUsage).filter(
        GuestPreviewUsage.fingerprint == fingerprint,
        GuestPreviewUsage.period_start == period_start,
    ).first()
    if usage:
        return usage

    usage = GuestPreviewUsage(
        fingerprint=fingerprint,
        period_start=period_start,
        preview_jobs=0,
        preview_leads=0,
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage


def _build_guest_usage_payload(usage: GuestPreviewUsage) -> GuestPreviewUsageResponse:
    max_jobs = _guest_preview_max_jobs()
    max_leads = _guest_preview_max_leads()
    return GuestPreviewUsageResponse(
        monthly_job_limit=max_jobs,
        monthly_lead_limit=max_leads,
        jobs_used=max(0, int(usage.preview_jobs or 0)),
        leads_used=max(0, int(usage.preview_leads or 0)),
        jobs_remaining=max(0, max_jobs - int(usage.preview_jobs or 0)),
        leads_remaining=max(0, max_leads - int(usage.preview_leads or 0)),
    )


def _guest_usage_reset_date(period_start: date) -> date:
    next_month = period_start.replace(day=28) + timedelta(days=4)
    return next_month.replace(day=1)


def _get_customer_orm(db: Session, customer: dict):
    if customer is None:
        return None
    return db.query(Customer).filter(Customer.id == customer["id"]).first()


def _check_concurrent_jobs(db: Session, customer_id: int, max_concurrent_jobs: int) -> None:
    running_jobs = db.query(Job).filter(
        Job.customer_id == customer_id,
        Job.status.in_([JobStatus.PENDING.value, JobStatus.RUNNING.value]),
    ).count()

    if running_jobs >= max_concurrent_jobs:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Too many running jobs ({running_jobs}/{max_concurrent_jobs}) "
                "for your plan. Upgrade to increase concurrency."
            ),
        )


def _enforce_usage_gate(
    db: Session,
    customer_orm: Customer,
    requested_lead_budget: int,
    source: str,
) -> None:
    entitlement = get_entitlement(customer_orm)

    if source == "instagram" and not entitlement.instagram_enabled:
        raise HTTPException(
            status_code=403,
            detail="Instagram scraping is not available on your current plan.",
        )

    usage = get_or_create_monthly_usage(db, customer_orm.id)
    credits_left = remaining_credits(customer_orm, usage)
    if credits_left is not None and requested_lead_budget > credits_left:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Monthly lead credits exceeded. Requested {requested_lead_budget}, "
                f"remaining {credits_left}."
            ),
        )


def _create_job(db: Session, customer_id: int, job_type: str, targets_payload: list) -> Job:
    job = Job(
        customer_id=customer_id,
        job_type=job_type,
        targets=json.dumps(targets_payload),
        status=JobStatus.PENDING.value,
        attempt_count=0,
        next_retry_at=None,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.post("/google-maps", response_model=ScrapeResponse)
@limiter.limit(SCRAPE_LIMIT)
def scrape_google_maps(
    request: Request,
    scrape_request: BatchScrapeRequest,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    customer_id = customer["id"] if customer else None

    if customer_id:
        customer_orm = _get_customer_orm(db, customer)
        entitlement = get_entitlement(customer_orm)
        _check_concurrent_jobs(db, customer_id, entitlement.max_concurrent_jobs)

        requested = sum(max(1, t.limit) for t in scrape_request.targets)
        _enforce_usage_gate(db, customer_orm, requested, source="google_maps")

    targets = [t.model_dump() for t in scrape_request.targets]
    job = _create_job(db, customer_id, "google_maps", targets)

    if customer_id:
        increment_usage(db, customer_id, jobs_delta=1)

    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=(
            f"Batch job queued with {len(scrape_request.targets)} targets. "
            "Run `python worker.py` to process queued jobs."
        ),
    )


@router.post("/instagram", response_model=ScrapeResponse)
@limiter.limit(SCRAPE_LIMIT)
def scrape_instagram(
    request: Request,
    scrape_request: InstagramScrapeRequest,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    customer_id = customer["id"] if customer else None

    if customer_id:
        customer_orm = _get_customer_orm(db, customer)
        entitlement = get_entitlement(customer_orm)
        _check_concurrent_jobs(db, customer_id, entitlement.max_concurrent_jobs)

        requested = sum(max(1, t.limit) for t in scrape_request.targets)
        _enforce_usage_gate(db, customer_orm, requested, source="instagram")

    targets = [t.model_dump() for t in scrape_request.targets]
    job = _create_job(db, customer_id, "instagram", targets)

    if customer_id:
        increment_usage(db, customer_id, jobs_delta=1)

    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=(
            f"Instagram job queued with {len(scrape_request.targets)} keywords. "
            "Run `python worker.py` to process queued jobs."
        ),
    )


@router.post("/single", response_model=ScrapeResponse)
@limiter.limit(SCRAPE_LIMIT)
def scrape_single(
    request: Request,
    target: ScrapeTarget,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    customer_id = customer["id"] if customer else None

    if customer_id:
        customer_orm = _get_customer_orm(db, customer)
        entitlement = get_entitlement(customer_orm)
        _check_concurrent_jobs(db, customer_id, entitlement.max_concurrent_jobs)
        _enforce_usage_gate(db, customer_orm, requested_lead_budget=max(1, target.limit), source="google_maps")

    job = _create_job(db, customer_id, "google_maps", [target.model_dump()])

    if customer_id:
        increment_usage(db, customer_id, jobs_delta=1)

    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=(
            f"Job queued for {target.city} - {target.category}. "
            "Run `python worker.py` to process queued jobs."
        ),
    )


@router.post("/guest-preview", response_model=GuestScrapeResponse)
@limiter.limit("4/hour")
def scrape_guest_preview(
    request: Request,
    target: GuestScrapeTarget,
    db: Session = Depends(get_db),
):
    logger.info(
        "[guest-preview] Request received city=%s category=%s limit=%s",
        target.city,
        target.category,
        target.limit,
    )
    if not _guest_preview_enabled():
        raise HTTPException(status_code=403, detail="Guest preview is disabled right now.")

    fingerprint = _guest_fingerprint(request)
    usage = _guest_usage_for_current_period(db, fingerprint)

    max_jobs = _guest_preview_max_jobs()
    max_leads = _guest_preview_max_leads()
    requested_limit = max(1, int(target.limit))

    if int(usage.preview_jobs or 0) >= max_jobs:
        usage_payload = _build_guest_usage_payload(usage)
        reset_on = _guest_usage_reset_date(usage.period_start)
        raise HTTPException(
            status_code=429,
            detail=(
                "Guest preview limit reached. "
                f"Used {usage_payload.jobs_used}/{usage_payload.monthly_job_limit} monthly preview runs. "
                f"Resets on {reset_on.isoformat()}."
            ),
        )

    remaining_leads = max_leads - int(usage.preview_leads or 0)
    if requested_limit > remaining_leads:
        usage_payload = _build_guest_usage_payload(usage)
        reset_on = _guest_usage_reset_date(usage.period_start)
        raise HTTPException(
            status_code=429,
            detail=(
                "Guest preview lead budget reached. "
                f"Only {usage_payload.leads_remaining} preview lead(s) left this month. "
                f"Resets on {reset_on.isoformat()}."
            ),
        )

    dry_run = not _guest_preview_live_enabled()
    cache_key = _guest_preview_cache_key(target.city, target.category, requested_limit, dry_run)
    cached_payload = _guest_preview_cache_get(cache_key)
    used_cache = cached_payload is not None
    response_meta: dict[str, Any]

    if cached_payload is None:
        response_meta = _run_guest_preview_live(
            city=target.city,
            category=target.category,
            limit=requested_limit,
            dry_run=dry_run,
        )
        if _should_cache_guest_preview(response_meta):
            _guest_preview_cache_set(cache_key, response_meta)
    else:
        response_meta = dict(cached_payload)
        original_source = str(response_meta.get("data_source") or "")
        if original_source == "apify_live":
            response_meta["data_source"] = "cache_live"
            response_meta["fallback_reason"] = None
        elif original_source == "demo":
            response_meta["data_source"] = "demo"
        logger.info(
            "[guest-preview] Cache hit city=%s category=%s limit=%s dry_run=%s",
            target.city,
            target.category,
            requested_limit,
            dry_run,
        )

    leads_data = list(response_meta.get("leads_data") or [])
    try:
        leads = []
        for lead in (leads_data or [])[:requested_limit]:
            leads.append(GuestPreviewLead(
                name=lead.get("name") or "",
                city=lead.get("city"),
                category=lead.get("category"),
                rating=lead.get("rating"),
                reviews=lead.get("reviews"),
                website=lead.get("website"),
                maps_url=lead.get("maps_url") or lead.get("url"),
                lead_score=int(lead.get("lead_score") or 0),
                reason=lead.get("reason"),
                ai_outreach=(
                    lead.get("ai_outreach")
                    or lead.get("outreach_friendly")
                    or lead.get("outreach_value")
                    or lead.get("outreach_direct")
                ),
            ))
    except Exception as exc:
        logger.error("Guest preview normalization failed: %s", exc)
        raise HTTPException(status_code=503, detail="Unable to format guest preview right now.") from exc

    usage.preview_jobs = int(usage.preview_jobs or 0) + 1
    usage.preview_leads = int(usage.preview_leads or 0) + len(leads)
    db.commit()
    db.refresh(usage)

    data_source = str(response_meta.get("data_source") or "demo")
    if data_source == "apify_live":
        preview_message = "Live run completed."
    elif data_source == "cache_live":
        preview_message = "Loaded recent live preview from cache."
    elif data_source == "fallback_timeout":
        preview_message = (
            f"Live run timed out after {_guest_preview_timeout_seconds()}s; showing fallback sample."
        )
    elif data_source == "fallback_error":
        fallback_reason = response_meta.get("fallback_reason") or "unknown"
        preview_message = f"Live run failed ({fallback_reason}); showing fallback sample."
    else:
        cache_label = " (cached)" if used_cache else ""
        preview_message = f"Preview complete in demo mode{cache_label}."
    logger.info(
        "[guest-preview] Response ready city=%s category=%s source=%s run_id=%s dataset_id=%s status=%s elapsed=%ss leads=%s fallback_reason=%s",
        target.city,
        target.category,
        data_source,
        response_meta.get("apify_run_id"),
        response_meta.get("apify_dataset_id"),
        response_meta.get("apify_final_status"),
        response_meta.get("elapsed_seconds"),
        len(leads),
        response_meta.get("fallback_reason"),
    )
    return GuestScrapeResponse(
        status="completed",
        message=preview_message,
        leads=leads,
        usage=_build_guest_usage_payload(usage),
        execution_mode=str(response_meta.get("execution_mode") or ("demo" if dry_run else "live")),
        data_source=data_source,
        apify_run_id=response_meta.get("apify_run_id"),
        apify_dataset_id=response_meta.get("apify_dataset_id"),
        apify_final_status=response_meta.get("apify_final_status"),
        elapsed_seconds=int(response_meta.get("elapsed_seconds") or 0),
        fallback_reason=response_meta.get("fallback_reason"),
    )
