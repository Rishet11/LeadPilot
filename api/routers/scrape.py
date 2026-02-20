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
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from datetime import date, datetime, timedelta
from typing import Optional
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

logger = logging.getLogger("leadpilot")
router = APIRouter(prefix="/scrape", tags=["scrape"])
_GUEST_PREVIEW_CACHE: dict[str, tuple[datetime, list]] = {}


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


def _guest_preview_cache_get(cache_key: str) -> Optional[list]:
    cached = _GUEST_PREVIEW_CACHE.get(cache_key)
    if not cached:
        return None
    expires_at, leads_data = cached
    if expires_at <= datetime.utcnow():
        _GUEST_PREVIEW_CACHE.pop(cache_key, None)
        return None
    # Return a shallow copy to avoid accidental mutation of cached objects.
    return list(leads_data)


def _guest_preview_cache_set(cache_key: str, leads_data: list) -> None:
    ttl = _guest_preview_cache_ttl_seconds()
    _GUEST_PREVIEW_CACHE[cache_key] = (
        datetime.utcnow() + timedelta(seconds=ttl),
        list(leads_data or []),
    )


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


def _run_guest_preview_with_timeout(city: str, category: str, limit: int, dry_run: bool) -> tuple[list, str]:
    # In demo mode we should always return immediately.
    if dry_run:
        return _build_guest_preview_fallback_leads(city, category, limit), "demo_fast"

    timeout_seconds = _guest_preview_timeout_seconds()
    payload = [{
        "city": city,
        "category": category,
        "limit": limit,
        "agent_mode": False,
        "dry_run": dry_run,
    }]

    def _run_pipeline_payload() -> list:
        # Keep import inside the worker so timeout also covers import cost.
        from batch_processor import process_batch_targets
        return process_batch_targets(payload)

    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_run_pipeline_payload)
    try:
        result = future.result(timeout=timeout_seconds)
        return list(result or []), "pipeline"
    except FuturesTimeoutError:
        future.cancel()
        logger.warning(
            "Guest preview timed out after %ss for city=%s category=%s dry_run=%s",
            timeout_seconds,
            city,
            category,
            dry_run,
        )
        return _build_guest_preview_fallback_leads(city, category, limit), "fallback_timeout"
    except Exception as exc:
        logger.error("Guest preview scrape failed: %s", exc)
        return _build_guest_preview_fallback_leads(city, category, limit), "fallback_error"
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


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
    if not _guest_preview_enabled():
        raise HTTPException(status_code=403, detail="Guest preview is disabled right now.")

    fingerprint = _guest_fingerprint(request)
    usage = _guest_usage_for_current_period(db, fingerprint)

    max_jobs = _guest_preview_max_jobs()
    max_leads = _guest_preview_max_leads()
    requested_limit = max(1, int(target.limit))

    if int(usage.preview_jobs or 0) >= max_jobs:
        usage_payload = _build_guest_usage_payload(usage)
        raise HTTPException(
            status_code=429,
            detail=(
                "Guest preview limit reached. "
                f"Used {usage_payload.jobs_used}/{usage_payload.monthly_job_limit} monthly preview runs."
            ),
        )

    remaining_leads = max_leads - int(usage.preview_leads or 0)
    if requested_limit > remaining_leads:
        usage_payload = _build_guest_usage_payload(usage)
        raise HTTPException(
            status_code=429,
            detail=(
                "Guest preview lead budget reached. "
                f"Only {usage_payload.leads_remaining} preview lead(s) left this month."
            ),
        )

    dry_run = not _guest_preview_live_enabled()
    cache_key = _guest_preview_cache_key(target.city, target.category, requested_limit, dry_run)
    leads_data = _guest_preview_cache_get(cache_key)
    used_cache = leads_data is not None
    source = "cache"

    if leads_data is None:
        leads_data, source = _run_guest_preview_with_timeout(
            city=target.city,
            category=target.category,
            limit=requested_limit,
            dry_run=dry_run,
        )
        _guest_preview_cache_set(cache_key, leads_data or [])

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

    mode_label = "demo mode" if dry_run else "live mode"
    if source == "fallback_timeout":
        preview_message = "Preview complete in fast mode (live query timed out)."
    elif source == "fallback_error":
        preview_message = "Preview complete in fast mode (fallback data used)."
    elif source == "demo_fast":
        preview_message = "Preview complete in demo mode."
    else:
        cache_label = " (cached)" if used_cache else ""
        preview_message = f"Preview complete in {mode_label}{cache_label}."
    return GuestScrapeResponse(
        status="completed",
        message=preview_message,
        leads=leads,
        usage=_build_guest_usage_payload(usage),
    )
