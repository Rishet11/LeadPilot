"""Tests for Google auth login endpoint."""

from api.database import Customer
from api.routers import auth as auth_router


def test_google_auth_creates_customer(client, db_session, monkeypatch):
    def mock_verify(_token: str):
        return {
            "email": "newuser@example.com",
            "name": "New User",
            "email_verified": True,
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr(auth_router, "_verify_google_id_token", mock_verify)

    res = client.post("/api/auth/google", json={"id_token": "x" * 32})
    assert res.status_code == 200

    payload = res.json()
    assert "api_key" not in payload
    assert payload["email"] == "newuser@example.com"
    assert payload["name"] == "New User"
    assert payload["is_new_customer"] is True
    assert payload["access_token"].startswith("lps_")
    assert payload["token_type"] == "bearer"

    customer = db_session.query(Customer).filter(Customer.email == "newuser@example.com").first()
    assert customer is not None
    assert customer.plan_tier == "free"
    assert customer.subscription_status == "free"


def test_google_auth_returns_existing_customer(client, db_session, monkeypatch):
    def mock_verify(_token: str):
        return {
            "email": "test@example.com",
            "name": "Test Customer",
            "email_verified": True,
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr(auth_router, "_verify_google_id_token", mock_verify)

    res = client.post("/api/auth/google", json={"id_token": "x" * 48})
    assert res.status_code == 200

    payload = res.json()
    assert "api_key" not in payload
    assert payload["email"] == "test@example.com"
    assert payload["is_new_customer"] is False
    assert payload["access_token"].startswith("lps_")
    assert payload["token_type"] == "bearer"
