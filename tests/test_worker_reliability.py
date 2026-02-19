"""Tests for worker reliability features (retry helpers + stale job recovery)."""

from datetime import datetime, timedelta

from api.database import Job, JobStatus
from api.worker import _retry_delay_seconds, _select_outreach_text, recover_stuck_running_jobs


def test_select_outreach_text_prefers_ai_outreach():
    lead = {
        "ai_outreach": "Primary outreach",
        "outreach_friendly": "Friendly fallback",
        "outreach_value": "Value fallback",
    }
    assert _select_outreach_text(lead) == "Primary outreach"


def test_select_outreach_text_falls_back_to_generated_variants():
    lead = {
        "outreach_friendly": "Friendly draft",
        "outreach_value": "Value draft",
        "outreach_direct": "Direct draft",
    }
    assert _select_outreach_text(lead) == "Friendly draft"


def test_retry_delay_seconds_is_exponential():
    assert _retry_delay_seconds(1, base_backoff_seconds=30) == 30
    assert _retry_delay_seconds(2, base_backoff_seconds=30) == 60
    assert _retry_delay_seconds(3, base_backoff_seconds=30) == 120


def test_recover_stuck_running_job_requeues_pending(db_session, monkeypatch):
    monkeypatch.setenv("LEADPILOT_WORKER_MAX_ATTEMPTS", "3")

    stale_started = datetime.utcnow() - timedelta(minutes=30)
    job = Job(
        customer_id=1,
        job_type="google_maps",
        targets="[]",
        status=JobStatus.RUNNING.value,
        started_at=stale_started,
        attempt_count=1,
    )
    db_session.add(job)
    db_session.commit()

    recovered = recover_stuck_running_jobs(
        db_session,
        now=datetime.utcnow(),
        timeout_seconds=60,
    )
    db_session.refresh(job)

    assert recovered == 1
    assert job.status == JobStatus.PENDING.value
    assert job.next_retry_at is not None
    assert "requeued" in (job.error_message or "").lower()


def test_recover_stuck_running_job_marks_failed_when_attempts_exhausted(db_session, monkeypatch):
    monkeypatch.setenv("LEADPILOT_WORKER_MAX_ATTEMPTS", "2")

    stale_started = datetime.utcnow() - timedelta(minutes=30)
    job = Job(
        customer_id=1,
        job_type="google_maps",
        targets="[]",
        status=JobStatus.RUNNING.value,
        started_at=stale_started,
        attempt_count=2,
    )
    db_session.add(job)
    db_session.commit()

    recovered = recover_stuck_running_jobs(
        db_session,
        now=datetime.utcnow(),
        timeout_seconds=60,
    )
    db_session.refresh(job)

    assert recovered == 1
    assert job.status == JobStatus.FAILED.value
    assert job.next_retry_at is None
    assert job.completed_at is not None
    assert "marked failed" in (job.error_message or "").lower()
