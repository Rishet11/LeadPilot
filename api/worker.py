"""Durable DB-backed worker for scrape jobs."""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime
from typing import Callable, Dict, Optional

from sqlalchemy.orm import Session

from .database import Job, JobStatus, Lead, SessionLocal
from .plans import increment_usage

logger = logging.getLogger("leadpilot")


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
        ai_outreach=lead_dict.get("ai_outreach"),
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
        ai_outreach=lead_dict.get("ai_outreach"),
        source="instagram",
        country=lead_dict.get("country"),
    )
    db.add(lead)


def _run_google_maps_job(db: Session, job: Job, targets: list, customer_id: Optional[int]) -> int:
    from batch_processor import process_batch_targets

    total_leads = 0
    for target in targets:
        try:
            leads_data = process_batch_targets([target])
            for lead_dict in leads_data:
                _persist_google_map_lead(db, customer_id, lead_dict)
                total_leads += 1
            db.commit()
        except Exception as exc:
            logger.error("Error processing Google Maps target %s: %s", target, exc)
            db.rollback()
            continue
    return total_leads


def _run_instagram_job(db: Session, job: Job, targets: list, customer_id: Optional[int]) -> int:
    from instagram_pipeline import process_instagram_targets

    total_leads = 0
    for target in targets:
        try:
            leads_data = process_instagram_targets([target])
            for lead_dict in leads_data:
                _persist_instagram_lead(db, customer_id, lead_dict)
                total_leads += 1
            db.commit()
        except Exception as exc:
            logger.error("Error processing Instagram target %s: %s", target, exc)
            db.rollback()
            continue
    return total_leads


def process_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        if job.status not in (JobStatus.PENDING.value, JobStatus.RUNNING.value):
            return

        job.status = JobStatus.RUNNING.value
        job.started_at = datetime.utcnow()
        db.commit()

        customer_id = job.customer_id
        targets = json.loads(job.targets or "[]")

        handlers: Dict[str, Callable[[Session, Job, list, Optional[int]], int]] = {
            "google_maps": _run_google_maps_job,
            "instagram": _run_instagram_job,
        }
        handler = handlers.get(job.job_type)
        if not handler:
            raise ValueError(f"Unknown job type: {job.job_type}")

        total_leads = handler(db, job, targets, customer_id)

        job.status = JobStatus.COMPLETED.value
        job.leads_found = total_leads
        job.completed_at = datetime.utcnow()
        db.commit()

        if customer_id:
            increment_usage(db, customer_id, leads_delta=total_leads)
    except Exception as exc:
        db.rollback()
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED.value
            job.error_message = str(exc)[:500]
            job.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def process_next_pending_job() -> bool:
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.status == JobStatus.PENDING.value).order_by(Job.created_at.asc()).first()
        if not job:
            return False
        job_id = job.id
    finally:
        db.close()

    process_job(job_id)
    return True


def run_worker(poll_interval: float = 2.0) -> None:
    logger.info("LeadPilot worker started")
    while True:
        processed = process_next_pending_job()
        if not processed:
            time.sleep(poll_interval)


if __name__ == "__main__":
    poll = float(os.getenv("LEADPILOT_WORKER_POLL_SECONDS", "2.0"))
    run_worker(poll_interval=poll)
