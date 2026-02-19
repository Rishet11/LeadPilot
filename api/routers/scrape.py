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
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_customer
from ..database import Customer, Job, JobStatus, get_db
from ..plans import get_entitlement, get_or_create_monthly_usage, increment_usage, remaining_credits
from ..rate_limit import SCRAPE_LIMIT, limiter
from ..schemas import BatchScrapeRequest, InstagramScrapeRequest, ScrapeResponse, ScrapeTarget

logger = logging.getLogger("leadpilot")
router = APIRouter(prefix="/scrape", tags=["scrape"])


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
