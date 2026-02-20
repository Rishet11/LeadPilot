"""
Tests for API endpoints.
"""

from api.database import Lead



class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    def test_health_check(self, client):
        """Health check should return healthy status."""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    def test_root_endpoint(self, client):
        """Root endpoint should return API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data


class TestSecurityHeaders:
    """Tests for security headers middleware."""
    
    def test_security_headers_present(self, client):
        """Security headers should be present in responses."""
        response = client.get("/api/health")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert "X-Request-ID" in response.headers


class TestLeadsEndpoints:
    """Tests for leads API endpoints."""
    
    def test_get_leads_empty(self, client):
        """Get leads should return empty list when no leads exist."""
        response = client.get("/api/leads/")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_leads_page_empty(self, client):
        response = client.get("/api/leads/page")
        assert response.status_code == 200
        payload = response.json()
        assert payload["items"] == []
        assert payload["total"] == 0
        assert payload["limit"] == 50
    
    def test_get_lead_stats(self, client):
        """Get lead stats should return proper structure."""
        response = client.get("/api/leads/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "high_priority_leads" in data
        assert "leads_by_status" in data
    
    def test_get_nonexistent_lead(self, client):
        """Getting nonexistent lead should return 404."""
        response = client.get("/api/leads/99999")
        assert response.status_code == 404


class TestLeadsWithData:
    """Tests for leads endpoints with data."""
    
    def test_batch_delete_empty(self, client):
        """Batch delete with empty list should succeed."""
        response = client.post(
            "/api/leads/batch-delete",
            json={"lead_ids": []}
        )
        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_get_leads_page_with_data(self, client, db_session):
        db_session.add_all([
            Lead(
                customer_id=1,
                name="Lead One",
                city="City One",
                category="Dentist",
                source="google_maps",
                lead_score=90,
            ),
            Lead(
                customer_id=1,
                name="Lead Two",
                city="City Two",
                category="Gym",
                source="google_maps",
                lead_score=80,
            ),
        ])
        db_session.commit()

        response = client.get("/api/leads/page?limit=1&skip=0")
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] == 2
        assert payload["limit"] == 1
        assert len(payload["items"]) == 1
