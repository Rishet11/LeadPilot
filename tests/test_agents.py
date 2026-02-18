"""Tests for agent endpoints."""

from api.database import Customer


class TestTargetBuilderAgent:
    def test_target_builder_generates_google_targets(self, client):
        response = client.post(
            "/api/agents/target-builder",
            json={
                "objective": "find dentists and salons in miami and austin",
                "max_targets": 6,
                "default_limit": 40,
                "include_instagram": False,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["objective"]
        assert isinstance(data["google_maps_targets"], list)
        assert len(data["google_maps_targets"]) > 0
        assert data["google_maps_targets"][0]["city"]
        assert data["google_maps_targets"][0]["category"]
        assert data["google_maps_targets"][0]["limit"] > 0

    def test_target_builder_warns_when_city_missing(self, client):
        response = client.post(
            "/api/agents/target-builder",
            json={
                "objective": "find high converting local dentists and salons",
                "max_targets": 4,
                "default_limit": 30,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["google_maps_targets"] == []
        assert any("city" in warning.lower() for warning in data["warnings"])

    def test_target_builder_instagram_plan_gating(self, client, db_session):
        customer = db_session.query(Customer).filter(Customer.id == 1).first()
        customer.plan_tier = "free"
        customer.subscription_status = "free"
        db_session.commit()

        response = client.post(
            "/api/agents/target-builder",
            json={
                "objective": "find gyms in miami",
                "max_targets": 4,
                "default_limit": 30,
                "include_instagram": True,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["instagram_targets"] == []
        assert any("disabled" in warning.lower() for warning in data["warnings"])

    def test_agent_templates_endpoint_returns_templates(self, client):
        response = client.get("/api/agents/templates")
        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["id"]
        assert data[0]["name"]
        assert isinstance(data[0]["google_maps_targets"], list)

    def test_agent_templates_strip_instagram_for_free_plan(self, client, db_session):
        customer = db_session.query(Customer).filter(Customer.id == 1).first()
        customer.plan_tier = "free"
        customer.subscription_status = "free"
        db_session.commit()

        response = client.get("/api/agents/templates")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all(item["instagram_targets"] == [] for item in data)

    def test_agent_templates_include_instagram_for_growth(self, client, db_session):
        customer = db_session.query(Customer).filter(Customer.id == 1).first()
        customer.plan_tier = "growth"
        customer.subscription_status = "active"
        db_session.commit()

        response = client.get("/api/agents/templates")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert any(len(item["instagram_targets"]) > 0 for item in data)

    def test_agent_templates_vertical_filter_normalizes_slug(self, client):
        response = client.get("/api/agents/templates?vertical=med-spa")
        assert response.status_code == 200
        data = response.json()

        assert len(data) > 0
        assert all(item["vertical"] == "med_spa" for item in data)
