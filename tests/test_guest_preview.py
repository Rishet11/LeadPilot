"""Tests for no-login guest preview scraping."""

import api.routers.scrape as scrape_router


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


def _fake_result(city: str, category: str, source: str = "apify_live") -> dict:
    return {
        "execution_mode": "live" if source != "demo" else "demo",
        "data_source": source,
        "apify_run_id": "run_test_123" if source != "demo" else None,
        "apify_dataset_id": "dataset_test_123" if source != "demo" else None,
        "apify_final_status": "SUCCEEDED" if source in {"apify_live", "cache_live"} else None,
        "elapsed_seconds": 4,
        "fallback_reason": None if source in {"apify_live", "cache_live", "demo"} else "run_status_timeout",
        "leads_data": [
            _fake_lead("A Dental", city, category, 78),
            _fake_lead("B Dental", city, category, 74),
            _fake_lead("C Dental", city, category, 69),
        ],
    }


def test_guest_preview_success(client, monkeypatch):
    scrape_router._GUEST_PREVIEW_CACHE.clear()
    monkeypatch.setenv("GUEST_PREVIEW_MODE", "live")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "2")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "20")
    monkeypatch.setattr(scrape_router, "_run_guest_preview_live", lambda city, category, limit, dry_run: _fake_result(city, category))

    res = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 3})
    assert res.status_code == 200
    payload = res.json()
    assert payload["status"] == "completed"
    assert len(payload["leads"]) == 3
    assert payload["data_source"] == "apify_live"
    assert payload["apify_run_id"] == "run_test_123"
    assert payload["usage"]["jobs_used"] == 1
    assert payload["usage"]["leads_used"] == 3


def test_guest_preview_blocks_when_job_quota_exhausted(client, monkeypatch):
    scrape_router._GUEST_PREVIEW_CACHE.clear()
    monkeypatch.setenv("GUEST_PREVIEW_MODE", "live")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "1")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "20")
    monkeypatch.setattr(scrape_router, "_run_guest_preview_live", lambda city, category, limit, dry_run: _fake_result(city, category))

    first = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 1})
    assert first.status_code == 200

    second = client.post("/api/scrape/guest-preview", json={"city": "Austin", "category": "HVAC", "limit": 1})
    assert second.status_code == 429
    assert "Guest preview limit reached" in second.json()["detail"]


def test_guest_preview_blocks_when_lead_budget_exhausted(client, monkeypatch):
    scrape_router._GUEST_PREVIEW_CACHE.clear()
    monkeypatch.setenv("GUEST_PREVIEW_MODE", "live")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "5")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "3")
    monkeypatch.setattr(scrape_router, "_run_guest_preview_live", lambda city, category, limit, dry_run: _fake_result(city, category))

    first = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})
    assert first.status_code == 200

    second = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})
    assert second.status_code == 429
    assert "Guest preview lead budget reached" in second.json()["detail"]


def test_guest_preview_can_be_disabled(client, monkeypatch):
    scrape_router._GUEST_PREVIEW_CACHE.clear()
    monkeypatch.setenv("GUEST_PREVIEW_ENABLED", "false")

    res = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 1})
    assert res.status_code == 403
    assert "disabled" in res.json()["detail"].lower()


def test_guest_preview_live_cache_hits_return_cache_live(client, monkeypatch):
    scrape_router._GUEST_PREVIEW_CACHE.clear()
    monkeypatch.setenv("GUEST_PREVIEW_MODE", "live")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "5")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "20")

    calls = {"count": 0}

    def fake_live(city, category, limit, dry_run):
        calls["count"] += 1
        return _fake_result(city, category, source="apify_live")

    monkeypatch.setattr(scrape_router, "_run_guest_preview_live", fake_live)

    first = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})
    second = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["data_source"] == "apify_live"
    assert second.json()["data_source"] == "cache_live"
    assert calls["count"] == 1


def test_guest_preview_fallback_is_not_cached(client, monkeypatch):
    scrape_router._GUEST_PREVIEW_CACHE.clear()
    monkeypatch.setenv("GUEST_PREVIEW_MODE", "live")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_JOBS_PER_MONTH", "5")
    monkeypatch.setenv("GUEST_PREVIEW_MAX_LEADS_PER_MONTH", "20")

    calls = {"count": 0}

    def fake_live(city, category, limit, dry_run):
        calls["count"] += 1
        return _fake_result(city, category, source="fallback_timeout")

    monkeypatch.setattr(scrape_router, "_run_guest_preview_live", fake_live)

    first = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})
    second = client.post("/api/scrape/guest-preview", json={"city": "Miami", "category": "Dentist", "limit": 2})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["data_source"] == "fallback_timeout"
    assert second.json()["data_source"] == "fallback_timeout"
    assert calls["count"] == 2
