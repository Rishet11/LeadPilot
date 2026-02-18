"""Tests for webhook admin endpoints access control."""

from api.auth import get_current_customer
from api.main import app


def test_webhook_events_list_allows_admin(client):
    response = client.get("/api/webhooks/lemonsqueezy/events")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_webhook_events_list_blocks_non_admin(client):
    previous_override = app.dependency_overrides.get(get_current_customer)
    app.dependency_overrides[get_current_customer] = lambda: {
        "id": 1,
        "name": "Test Customer",
        "email": "test@example.com",
        "is_admin": False,
    }
    try:
        response = client.get("/api/webhooks/lemonsqueezy/events")
        assert response.status_code == 403
        assert response.json()["detail"] == "Admin access required"
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_current_customer, None)
        else:
            app.dependency_overrides[get_current_customer] = previous_override


def test_webhook_retry_blocks_non_admin(client):
    previous_override = app.dependency_overrides.get(get_current_customer)
    app.dependency_overrides[get_current_customer] = lambda: {
        "id": 1,
        "name": "Test Customer",
        "email": "test@example.com",
        "is_admin": False,
    }
    try:
        response = client.post("/api/webhooks/lemonsqueezy/retry/test-event")
        assert response.status_code == 403
        assert response.json()["detail"] == "Admin access required"
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_current_customer, None)
        else:
            app.dependency_overrides[get_current_customer] = previous_override
