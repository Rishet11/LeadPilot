"""Tests for no-login guest preview scraping."""

import batch_processor


def _fake_lead(name: str, city: str, category: str, score: int) -> dict:
    return {
        "name": name,
        "city": city,
        "category": category,
        "rating": 4.4,
        "reviews": 42,
        "website": "https://example.com",
        "maps_url": "https://maps.google.com/example",
        "lead_score": score,
        "reason": "Weak local conversion flow",
        "ai_outreach": "Quick personalized outreach draft",
    }


def test_guest_preview_success(client, monkeypatch):
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "2")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "20")

    monkeypatch.setattr(
        batch_processor,
        "process_batch_targets",
        lambda targets: [
            _fake_lead("A Dental", "Miami", "Dentist", 78),
            _fake_lead("B Dental", "Miami", "Dentist", 74),
            _fake_lead("C Dental", "Miami", "Dentist", 69),
        ],
    )

    res = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 3})
    assert res.status_code == 200
    payload = res.json()
    assert payload["status"] == "completed"
    assert len(payload["leads"]) == 3
    assert payload["usage"]["jobs_used"] == 1
    assert payload["usage"]["leads_used"] == 3


def test_guest_preview_blocks_when_job_quota_exhausted(client, monkeypatch):
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "1")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "20")
    monkeypatch.setattr(
        batch_processor,
        "process_batch_targets",
        lambda targets: [_fake_lead("A Dental", "Miami", "Dentist", 78)],
    )

    first = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 1})
    assert first.status_code == 200

    second = client.post("/api/scrape/guest-preview", json={"city": "Austin", "category": "HVAC", "limit": 1})
    assert second.status_code == 429
    assert "Guest preview limit reached" in second.json()["detail"]


def test_guest_preview_blocks_when_lead_budget_exhausted(client, monkeypatch):
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "5")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "3")
    monkeypatch.setattr(
        batch_processor,
        "process_batch_targets",
        lambda targets: [
            _fake_lead("A Dental", "Miami", "Dentist", 78),
            _fake_lead("B Dental", "Miami", "Dentist", 74),
        ],
    )

    first = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})
    assert first.status_code == 200

    second = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})
    assert second.status_code == 429
    assert "Guest preview lead budget reached" in second.json()["detail"]


def test_guest_preview_can_be_disabled(client, monkeypatch):
    monkeypatch.setenv("GUEST_PREVIEW_ENABLED", "false")
    monkeypatch.setattr(
        batch_processor,
        "process_batch_targets",
        lambda targets: [_fake_lead("A Dental", "Miami", "Dentist", 78)],
    )

    res = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 1})
    assert res.status_code == 403
    assert "disabled" in res.json()["detail"].lower()
