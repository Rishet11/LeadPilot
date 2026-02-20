"""Durable DB-backed worker for scrape jobs.

Reliability behavior:
- Retries failed jobs with exponential backoff.
- Recovers stale RUNNING jobs after worker restarts/crashes.
- Tracks attempts per job.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Callable, Dict, Iterable, List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from .database import Job, JobStatus, Lead, SessionLocal
from .plans import increment_usage

logger = logging.getLogger("leadpilot")


@dataclass
class JobRunOutcome:
    total_leads: int = 0
    failed_targets: int = 0
    target_errors: Optional[List[str]] = None


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return max(minimum, default)
    return max(minimum, value)


def _max_attempts() -> int:
    return _env_int("LEADPILOT_WORKER_MAX_ATTEMPTS", default=3, minimum=1)


def _base_backoff_seconds() -> int:
    return _env_int("LEADPILOT_WORKER_BASE_BACKOFF_SECONDS", default=30, minimum=1)


def _stuck_timeout_seconds() -> int:
    return _env_int("LEADPILOT_WORKER_STUCK_TIMEOUT_SECONDS", default=900, minimum=30)


def _retry_delay_seconds(attempt_count: int, base_backoff_seconds: Optional[int] = None) -> int:
    """
    Exponential backoff delay by attempt number.

    attempt_count is 1-indexed (1 = first failed attempt).
    """
    base = base_backoff_seconds if base_backoff_seconds is not None else _base_backoff_seconds()
    safe_attempt = max(1, int(attempt_count))
    return int(base) * (2 ** (safe_attempt - 1))


def _first_non_empty_text(candidates: Iterable[object]) -> Optional[str]:
    for value in candidates:
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned:
                return cleaned
    return None


def _select_outreach_text(lead_dict: dict) -> Optional[str]:
    # Google Maps pipeline can produce outreach_friendly/value/direct without ai_outreach.
    # We normalize to a single primary ai_outreach so CRM/export behavior is consistent.
    return _first_non_empty_text(
        (
            lead_dict.get("ai_outreach"),
            lead_dict.get("outreach_friendly"),
            lead_dict.get("outreach_value"),
            lead_dict.get("outreach_direct"),
            lead_dict.get("dm_message"),
        )
    )


def _persist_google_map_lead(db: Session, customer_id: Optional[int], lead_dict: dict) -> None:
    lead = Lead(
        customer_id=customer_id,
        name=lead_dict.get("name", ""),
        phone=lead_dict.get("phone"),
        city=lead_dict.get("city"),
        category=lead_dict.get("category"),
        rating=lead_dict.get("rating"),
        reviews=lead_dict.get("reviews"),
        website=lead_dict.get("website"),
        maps_url=lead_dict.get("maps_url") or lead_dict.get("url"),
        email=lead_dict.get("email"),
        lead_score=lead_dict.get("lead_score", 0),
        reason=lead_dict.get("reason"),
        ai_outreach=_select_outreach_text(lead_dict),
        source="google_maps",
        country=lead_dict.get("country"),
    )
    db.add(lead)


def _persist_instagram_lead(db: Session, customer_id: Optional[int], lead_dict: dict) -> None:
    lead = Lead(
        customer_id=customer_id,
        name=lead_dict.get("name", lead_dict.get("username", "")),
        phone=lead_dict.get("phone"),
        city=lead_dict.get("city"),
        category=lead_dict.get("category"),
        rating=lead_dict.get("rating"),
        reviews=lead_dict.get("followers"),
        website=lead_dict.get("website"),
        instagram=lead_dict.get("username"),
        email=lead_dict.get("email"),
        lead_score=lead_dict.get("lead_score", 0),
        reason=lead_dict.get("reason"),
        ai_outreach=_select_outreach_text(lead_dict),
        source="instagram",
        country=lead_dict.get("country"),
    )
    db.add(lead)


def _format_target_error(target: dict, exc: Exception) -> str:
    city = str(target.get("city") or "").strip()
    category = str(target.get("category") or "").strip()
    keyword = str(target.get("keyword") or "").strip()
    label = keyword or " / ".join(part for part in (city, category) if part) or "target"
    return f"{label}: {str(exc).strip()[:120] or 'Unknown error'}"


def _run_google_maps_job(db: Session, job: Job, targets: list, customer_id: Optional[int]) -> JobRunOutcome:
    from batch_processor import process_batch_targets

    outcome = JobRunOutcome(total_leads=0, failed_targets=0, target_errors=[])
    for target in targets:
        try:
            leads_data = process_batch_targets([target])
            for lead_dict in leads_data:
                _persist_google_map_lead(db, customer_id, lead_dict)
                outcome.total_leads += 1
            db.commit()
        except Exception as exc:
            logger.error("Error processing Google Maps target %s: %s", target, exc)
            db.rollback()
            outcome.failed_targets += 1
            outcome.target_errors.append(_format_target_error(target, exc))
            continue
    return outcome


def _run_instagram_job(db: Session, job: Job, targets: list, customer_id: Optional[int]) -> JobRunOutcome:
    from instagram_pipeline import process_instagram_targets

    outcome = JobRunOutcome(total_leads=0, failed_targets=0, target_errors=[])
    for target in targets:
        try:
            leads_data = process_instagram_targets([target])
            for lead_dict in leads_data:
                _persist_instagram_lead(db, customer_id, lead_dict)
                outcome.total_leads += 1
            db.commit()
        except Exception as exc:
            logger.error("Error processing Instagram target %s: %s", target, exc)
            db.rollback()
            outcome.failed_targets += 1
            outcome.target_errors.append(_format_target_error(target, exc))
            continue
    return outcome


def _mark_job_running(job: Job) -> int:
    attempt_number = int(job.attempt_count or 0) + 1
    job.attempt_count = attempt_number
    job.status = JobStatus.RUNNING.value
    job.started_at = datetime.utcnow()
    job.completed_at = None
    job.next_retry_at = None
    job.error_message = None
    return attempt_number


def _schedule_retry_or_fail(job: Job, exc: Exception) -> str:
    max_attempts = _max_attempts()
    current_attempt = int(job.attempt_count or 1)
    error_text = str(exc).strip() or "Unknown worker error"

    if current_attempt < max_attempts:
        delay_seconds = _retry_delay_seconds(current_attempt)
        retry_at = datetime.utcnow() + timedelta(seconds=delay_seconds)
        job.status = JobStatus.PENDING.value
        job.next_retry_at = retry_at
        job.completed_at = None
        job.error_message = (
            f"Attempt {current_attempt}/{max_attempts} failed: "
            f"{error_text[:320]}. Retrying in {delay_seconds}s."
        )
        return "retrying"

    job.status = JobStatus.FAILED.value
    job.next_retry_at = None
    job.completed_at = datetime.utcnow()
    job.error_message = f"Attempt {current_attempt}/{max_attempts} failed: {error_text[:480]}"
    return "failed"


def recover_stuck_running_jobs(
    db: Session,
    now: Optional[datetime] = None,
    timeout_seconds: Optional[int] = None,
) -> int:
    now = now or datetime.utcnow()
    timeout = timeout_seconds if timeout_seconds is not None else _stuck_timeout_seconds()
    threshold = now - timedelta(seconds=max(30, int(timeout)))

    stuck_jobs = db.query(Job).filter(
        Job.status == JobStatus.RUNNING.value,
        Job.started_at.isnot(None),
        Job.started_at < threshold,
    ).all()

    if not stuck_jobs:
        return 0

    max_attempts = _max_attempts()
    recovered = 0
    for job in stuck_jobs:
        attempts = int(job.attempt_count or 0)
        if attempts >= max_attempts:
            job.status = JobStatus.FAILED.value
            job.next_retry_at = None
            job.completed_at = now
            job.error_message = (
                f"Marked failed after stale RUNNING timeout "
                f"({attempts}/{max_attempts} attempts)."
            )
        else:
            job.status = JobStatus.PENDING.value
            job.next_retry_at = now
            job.completed_at = None
            job.started_at = None
            job.error_message = (
                f"Recovered stale RUNNING job; requeued for retry "
                f"({attempts + 1}/{max_attempts})."
            )
        recovered += 1

    db.commit()
    return recovered


def process_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        if job.status not in (JobStatus.PENDING.value, JobStatus.RUNNING.value):
            return

        attempt_number = _mark_job_running(job)
        db.commit()
        logger.info(
            "Processing job %s (%s), attempt %s/%s",
            job.id,
            job.job_type,
            attempt_number,
            _max_attempts(),
        )

        customer_id = job.customer_id
        targets = json.loads(job.targets or "[]")

        handlers: Dict[str, Callable[[Session, Job, list, Optional[int]], JobRunOutcome]] = {
            "google_maps": _run_google_maps_job,
            "instagram": _run_instagram_job,
        }
        handler = handlers.get(job.job_type)
        if not handler:
            raise ValueError(f"Unknown job type: {job.job_type}")

        run_outcome = handler(db, job, targets, customer_id)

        if run_outcome.failed_targets > 0 and run_outcome.total_leads == 0:
            example_errors = "; ".join((run_outcome.target_errors or [])[:3])
            raise RuntimeError(
                f"All {run_outcome.failed_targets} target(s) failed. {example_errors}".strip()
            )

        if run_outcome.failed_targets > 0:
            job.status = JobStatus.COMPLETED_WITH_ERRORS.value
            preview_errors = "; ".join((run_outcome.target_errors or [])[:3])
            job.error_message = (
                f"{run_outcome.failed_targets}/{len(targets)} target(s) failed. "
                f"{preview_errors}".strip()
            )[:480]
        else:
            job.status = JobStatus.COMPLETED.value
            job.error_message = None

        job.leads_found = run_outcome.total_leads
        job.completed_at = datetime.utcnow()
        job.next_retry_at = None
        db.commit()

        if customer_id:
            increment_usage(db, customer_id, leads_delta=run_outcome.total_leads)
    except Exception as exc:
        db.rollback()
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            outcome = _schedule_retry_or_fail(job, exc)
            db.commit()
            if outcome == "retrying":
                logger.warning(
                    "Job %s failed attempt %s/%s; retry scheduled at %s. Error: %s",
                    job.id,
                    job.attempt_count,
                    _max_attempts(),
                    job.next_retry_at,
                    str(exc)[:200],
                )
            else:
                logger.error(
                    "Job %s failed permanently after %s attempt(s): %s",
                    job.id,
                    job.attempt_count,
                    str(exc)[:300],
                )
    finally:
        db.close()


def process_next_pending_job() -> bool:
    db = SessionLocal()
    try:
        recovered = recover_stuck_running_jobs(db)
        if recovered:
            logger.warning("Recovered %d stale running job(s)", recovered)

        now = datetime.utcnow()
        job = db.query(Job).filter(
            Job.status == JobStatus.PENDING.value,
            or_(Job.next_retry_at.is_(None), Job.next_retry_at <= now),
        ).order_by(Job.created_at.asc()).first()
        if not job:
            return False
        job_id = job.id
    finally:
        db.close()

    process_job(job_id)
    return True


def run_worker(poll_interval: float = 2.0) -> None:
    logger.info(
        "LeadPilot worker started (poll=%ss, max_attempts=%s, backoff_base=%ss, stuck_timeout=%ss)",
        poll_interval,
        _max_attempts(),
        _base_backoff_seconds(),
        _stuck_timeout_seconds(),
    )
    while True:
        processed = process_next_pending_job()
        if not processed:
            time.sleep(poll_interval)


if __name__ == "__main__":
    poll = float(os.getenv("LEADPILOT_WORKER_POLL_SECONDS", "2.0"))
    run_worker(poll_interval=poll)
