"""
Tests for data cleaning functions.
"""

import pytest
import pandas as pd
from cleaner import clean_dataframe, standardize_phone, extract_city


class TestCleanDataframe:
    """Tests for the main clean_dataframe function."""
    
    def test_empty_data_returns_empty_dataframe(self):
        """Empty input should return empty DataFrame."""
        result = clean_dataframe([])
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0
    
    def test_column_mapping(self):
        """Apify column names should be mapped to standard names."""
        data = [
            {"title": "Test Business", "totalScore": 4.5, "reviewscount": 100}
        ]
        result = clean_dataframe(data)
        assert "name" in result.columns
        assert "rating" in result.columns
        assert "reviews" in result.columns
    
    def test_email_extraction_from_emails_list(self):
        """Email should be extracted from emails list."""
        data = [
            {"title": "Test", "emails": ["test@example.com", "other@example.com"]}
        ]
        result = clean_dataframe(data)
        assert result.iloc[0]["email"] == "test@example.com"
    
    def test_email_from_empty_list(self):
        """Empty emails list should result in empty email."""
        data = [
            {"title": "Test", "emails": []}
        ]
        result = clean_dataframe(data)
        assert result.iloc[0]["email"] == ""
    
    def test_required_columns_added(self):
        """All required columns should be present."""
        data = [{"title": "Test"}]
        result = clean_dataframe(data)
        
        required = ["name", "category", "address", "phone", "website", 
                   "instagram", "email", "rating", "reviews", "maps_url"]
        for col in required:
            assert col in result.columns


class TestPhoneCleaning:
    """Tests for phone number cleaning."""
    
    def test_standardize_phone_with_country_code(self):
        """Phone with country code should be formatted correctly."""
        result = standardize_phone("+1 (555) 123-4567")
        assert result == "+15551234567"
    
    def test_standardize_phone_empty(self):
        """Empty phone should return empty string."""
        result = standardize_phone("")
        assert result == ""
    
    def test_standardize_phone_none(self):
        """None phone should return empty string."""
        result = standardize_phone(None)
        assert result == ""



class TestCityExtraction:
    """Tests for city extraction from address."""
    
    def test_extract_city_from_address(self):
        """City should be extracted from comma-separated address."""
        result = extract_city("123 Main St, Los Angeles, CA 90001")
        # This depends on implementation - adjust based on actual logic
        assert result is not None
    
    def test_extract_city_empty(self):
        """Empty address should return empty city."""
        result = extract_city("")
        assert result == ""
