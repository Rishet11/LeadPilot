"""
Tests for lead scoring functions.
"""

from scorer import score_lead, has_website, DEFAULT_CONFIG


class TestScoreLead:
    """Tests for the score_lead function."""
    
    def test_no_website_gives_high_score(self):
        """Lead without website should get high score."""
        lead = {
            "name": "Test Business",
            "website": "",
            "rating": 4.5,
            "reviews": 100,
        }
        score, reason = score_lead(lead)
        assert score >= 50  # No website bonus
        assert "website" in reason.lower()
    
    def test_has_website_lower_score(self):
        """Lead with website should get lower score."""
        lead = {
            "name": "Test Business",
            "website": "https://example.com",
            "rating": 4.5,
            "reviews": 100,
        }
        score, reason = score_lead(lead)
        # Should be lower than no-website case
        assert score <= 80
    
    def test_high_reviews_add_score(self):
        """Lead with high reviews should get bonus."""
        lead = {
            "name": "Test Business",
            "website": "",
            "rating": 4.5,
            "reviews": 150,  # High volume
        }
        score, reason = score_lead(lead)
        assert score >= 70  # Should include review bonus
    
    def test_low_rating_lead(self):
        """Lead with low rating should have appropriate score."""
        lead = {
            "name": "Test Business",
            "website": "",
            "rating": 2.5,
            "reviews": 50,
        }
        score, reason = score_lead(lead)
        # Low rating might reduce score or be neutral
        assert score >= 0
        assert score <= 100
    
    def test_missing_fields_handled(self):
        """Score should handle missing fields gracefully."""
        lead = {"name": "Test Business"}
        score, reason = score_lead(lead)
        assert isinstance(score, (int, float))
        assert isinstance(reason, str)


class TestHasWebsite:
    """Tests for the has_website function."""
    
    def test_empty_url_returns_false(self):
        """Empty URL should return False."""
        assert has_website("") is False
    
    def test_none_url_returns_false(self):
        """None URL should return False."""
        assert has_website(None) is False
    
    def test_whitespace_url_returns_false(self):
        """Whitespace-only URL should return False."""
        assert has_website("   ") is False


class TestDefaultConfig:
    """Tests for scoring configuration."""
    
    def test_default_config_has_required_keys(self):
        """Default config should have all required keys."""
        assert "scoring_rules" in DEFAULT_CONFIG
        assert "priority_categories" in DEFAULT_CONFIG
        assert "instagram_follower_threshold" in DEFAULT_CONFIG
    
    def test_scoring_rules_are_positive(self):
        """All scoring rules should be positive numbers."""
        for key, value in DEFAULT_CONFIG["scoring_rules"].items():
            assert value > 0, f"Scoring rule {key} should be positive"
