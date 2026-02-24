"""Tests for SaaS tenant isolation, usage gates, and billing-facing APIs."""

from datetime import date

from api.database import Customer, Settings, UsageMonthly


def test_settings_are_isolated_per_customer(client, db_session):
    db_session.add(Customer(
        name="Other Customer",
        email="other@example.com",
        api_key="lp_other",
        is_active=True,
        plan_tier="starter",
        subscription_status="active",
    ))
    db_session.commit()

    other = db_session.query(Customer).filter(Customer.email == "other@example.com").first()
    db_session.add(Settings(customer_id=other.id, key="ai_system_prompt", value="OTHER_PROMPT"))
    db_session.commit()

    res = client.get("/api/settings")
    assert res.status_code == 200
    keys = {item["key"] for item in res.json()}
    assert "ai_system_prompt" in keys

    # Customer #1 updates their prompt; customer #2 stays unchanged
    update = client.put("/api/settings/ai_system_prompt", json={"key": "ai_system_prompt", "value": "MINE"})
    assert update.status_code == 200

    other_setting = db_session.query(Settings).filter(
        Settings.customer_id == other.id,
        Settings.key == "ai_system_prompt"
    ).first()
    assert other_setting.value == "OTHER_PROMPT"


def test_bulk_settings_update_succeeds_transactionally(client):
    res = client.put(
        "/api/settings/bulk",
        json={
            "items": [
                {"key": "ai_system_prompt", "value": "NEW_PROMPT"},
                {"key": "scoring_no_website", "value": "77"},
                {"key": "instagram_followers_min", "value": "1200"},
            ]
        },
    )
    assert res.status_code == 200
    payload = res.json()
    assert len(payload) == 3

    settings = client.get("/api/settings").json()
    values = {item["key"]: item["value"] for item in settings}
    assert values["ai_system_prompt"] == "NEW_PROMPT"
    assert values["scoring_no_website"] == "77"
    assert values["instagram_followers_min"] == "1200"


def test_bulk_settings_rejects_invalid_key_without_partial_write(client):
    seed = client.put("/api/settings/scoring_no_website", json={"key": "scoring_no_website", "value": "55"})
    assert seed.status_code == 200

    res = client.put(
        "/api/settings/bulk",
        json={
            "items": [
                {"key": "scoring_no_website", "value": "99"},
                {"key": "unknown_setting_key", "value": "1"},
            ]
        },
    )
    assert res.status_code == 400
    assert "Invalid setting key" in res.json()["detail"]

    current = client.get("/api/settings/scoring_no_website")
    assert current.status_code == 200
    assert current.json()["value"] == "55"


def test_usage_gate_blocks_when_credits_exhausted(client, db_session):
    customer = db_session.query(Customer).filter(Customer.id == 1).first()
    customer.plan_tier = "free"
    customer.subscription_status = "free"

    period_start = date.today().replace(day=1)
    usage = db_session.query(UsageMonthly).filter(
        UsageMonthly.customer_id == customer.id,
        UsageMonthly.period_start == period_start,
    ).first()
    if not usage:
        usage = UsageMonthly(customer_id=customer.id, period_start=period_start)
        db_session.add(usage)
    usage.leads_generated = 100
    db_session.commit()

    res = client.post("/api/scrape/single", json={"city": "Austin", "category": "Gym", "limit": 10})
    assert res.status_code == 402
    assert "Monthly lead credits exceeded" in res.json()["detail"]


def test_instagram_gate_blocks_free_plan(client, db_session):
    customer = db_session.query(Customer).filter(Customer.id == 1).first()
    customer.plan_tier = "free"
    customer.subscription_status = "free"
    db_session.commit()

    res = client.post("/api/scrape/instagram", json={"targets": [{"keyword": "plumber miami", "limit": 20}]})
    assert res.status_code == 403
    assert "Instagram scraping" in res.json()["detail"]


def test_usage_and_plan_endpoints(client):
    usage = client.get("/api/usage/current")
    assert usage.status_code == 200
    assert "leads_generated" in usage.json()

    plan = client.get("/api/plans/current")
    assert plan.status_code == 200
    assert "plan_tier" in plan.json()
    assert "instagram_enabled" in plan.json()


def test_legacy_agency_tier_maps_to_starter(client, db_session):
    customer = db_session.query(Customer).filter(Customer.id == 1).first()
    customer.plan_tier = "agency"
    customer.subscription_status = "active"
    db_session.commit()

    plan = client.get("/api/plans/current")
    assert plan.status_code == 200
    payload = plan.json()
    assert payload["plan_tier"] == "starter"
    assert payload["instagram_enabled"] is True
