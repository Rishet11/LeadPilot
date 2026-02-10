"""
Tests for data cleaning functions.
"""

import pytest
import pandas as pd
from cleaner import (
    clean_dataframe, standardize_phone, extract_city,
    add_derived_columns, _clean_business_name, _normalize_category,
    _normalize_email, _normalize_url, _generate_whatsapp_link,
    _format_opening_hours
)


class TestCleanDataframe:
    """Tests for the main clean_dataframe function."""

    def test_empty_data_returns_empty_dataframe(self):
        result = clean_dataframe([])
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0

    def test_column_mapping(self):
        data = [
            {"title": "Test Business", "totalScore": 4.5, "reviewscount": 100,
             "permanentlyClosed": False}
        ]
        result = clean_dataframe(data)
        assert "name" in result.columns
        assert "rating" in result.columns
        assert "reviews" in result.columns

    def test_filters_permanently_closed(self):
        data = [
            {"title": "Open Biz", "permanentlyClosed": False, "totalScore": 4.0, "reviewscount": 10},
            {"title": "Closed Biz", "permanentlyClosed": True, "totalScore": 3.0, "reviewscount": 5},
        ]
        result = clean_dataframe(data)
        assert len(result) == 1
        assert result.iloc[0]["name"] == "Open Biz"

    def test_filters_temporarily_closed(self):
        data = [
            {"title": "Open Biz", "temporarilyClosed": False, "totalScore": 4.0},
            {"title": "Temp Closed", "temporarilyClosed": True, "totalScore": 3.0},
        ]
        result = clean_dataframe(data)
        assert len(result) == 1
        assert result.iloc[0]["name"] == "Open Biz"

    def test_all_closed_returns_empty(self):
        data = [
            {"title": "Closed 1", "permanentlyClosed": True},
            {"title": "Closed 2", "permanentlyClosed": True},
        ]
        result = clean_dataframe(data)
        assert len(result) == 0

    def test_extracts_new_fields(self):
        data = [
            {
                "title": "Test",
                "imagesCount": 25,
                "countryCode": "US",
                "scrapedAt": "2026-01-01",
                "claimThisBusiness": True,
                "price": "$$",
                "permanentlyClosed": False,
            }
        ]
        result = clean_dataframe(data)
        assert result.iloc[0]["images_count"] == 25
        assert result.iloc[0]["country_code"] == "US"
        assert result.iloc[0]["is_unclaimed"] == True
        assert result.iloc[0]["price"] == "$$"

    def test_email_extraction_from_emails_list(self):
        data = [
            {"title": "Test", "emails": ["test@example.com", "other@example.com"],
             "permanentlyClosed": False}
        ]
        result = clean_dataframe(data)
        assert result.iloc[0]["email"] == "test@example.com"

    def test_email_from_empty_list(self):
        data = [
            {"title": "Test", "emails": [], "permanentlyClosed": False}
        ]
        result = clean_dataframe(data)
        assert result.iloc[0]["email"] == ""

    def test_required_columns_added(self):
        data = [{"title": "Test", "permanentlyClosed": False}]
        result = clean_dataframe(data)

        required = ["name", "category", "address", "phone", "website",
                     "instagram", "email", "rating", "reviews", "maps_url",
                     "images_count", "country_code", "is_unclaimed",
                     "opening_hours", "price"]
        for col in required:
            assert col in result.columns

    def test_category_normalization(self):
        data = [
            {"title": "Test", "categoryName": "Dental Clinic", "permanentlyClosed": False},
        ]
        result = clean_dataframe(data)
        assert result.iloc[0]["category"] == "dentist"

    def test_opening_hours_extraction(self):
        data = [
            {
                "title": "Test",
                "permanentlyClosed": False,
                "openingHours": [
                    {"day": "Monday", "hours": "9 AM to 5 PM"},
                    {"day": "Tuesday", "hours": "9 AM to 5 PM"},
                ]
            }
        ]
        result = clean_dataframe(data)
        assert "Monday: 9 AM to 5 PM" in result.iloc[0]["opening_hours"]

    def test_url_normalization(self):
        data = [
            {"title": "Test", "website": "example.com", "permanentlyClosed": False}
        ]
        result = clean_dataframe(data)
        assert result.iloc[0]["website"] == "https://example.com"


class TestBusinessNameCleaning:
    """Tests for business name cleaning."""

    def test_removes_permanently_closed_suffix(self):
        assert _clean_business_name("Old Cafe - Permanently Closed") == "Old Cafe"

    def test_removes_parenthetical_closed(self):
        assert _clean_business_name("Old Cafe (Permanently Closed)") == "Old Cafe"

    def test_keeps_normal_name(self):
        assert _clean_business_name("Great Business") == "Great Business"

    def test_empty_name(self):
        assert _clean_business_name("") == ""


class TestCategoryNormalization:
    """Tests for category normalization."""

    def test_dental_variants(self):
        assert _normalize_category("dental clinic") == "dentist"
        assert _normalize_category("Dental Office") == "dentist"
        assert _normalize_category("orthodontist") == "dentist"

    def test_fitness_variants(self):
        assert _normalize_category("fitness center") == "gym"
        assert _normalize_category("fitness studio") == "gym"
        assert _normalize_category("yoga studio") == "gym"

    def test_unknown_category_passes_through(self):
        assert _normalize_category("underwater basket weaving") == "underwater basket weaving"

    def test_empty_category(self):
        assert _normalize_category("") == ""


class TestEmailNormalization:
    """Tests for email normalization."""

    def test_valid_email(self):
        assert _normalize_email("Test@Example.COM") == "test@example.com"

    def test_invalid_email(self):
        assert _normalize_email("not-an-email") == ""

    def test_empty_email(self):
        assert _normalize_email("") == ""


class TestURLNormalization:
    """Tests for URL normalization."""

    def test_adds_protocol(self):
        assert _normalize_url("example.com") == "https://example.com"

    def test_strips_utm(self):
        result = _normalize_url("https://example.com?utm_source=google")
        assert "utm_source" not in result

    def test_empty_url(self):
        assert _normalize_url("") == ""

    def test_preserves_valid_url(self):
        assert _normalize_url("https://example.com/about") == "https://example.com/about"


class TestPhoneCleaning:
    """Tests for phone number cleaning."""

    def test_standardize_phone_with_country_code(self):
        result = standardize_phone("+1 (555) 123-4567")
        assert result == "+15551234567"

    def test_standardize_phone_empty(self):
        assert standardize_phone("") == ""

    def test_standardize_phone_none(self):
        assert standardize_phone(None) == ""


class TestCityExtraction:
    """Tests for city extraction from address."""

    def test_extract_city_from_address(self):
        result = extract_city("123 Main St, Los Angeles, CA 90001")
        assert result is not None

    def test_extract_city_empty(self):
        assert extract_city("") == ""


class TestWhatsAppLink:
    """Tests for WhatsApp deep link generation."""

    def test_generates_link(self):
        assert _generate_whatsapp_link("+919876543210") == "https://wa.me/919876543210"

    def test_empty_phone(self):
        assert _generate_whatsapp_link("") == ""


class TestOpeningHours:
    """Tests for opening hours formatting."""

    def test_formats_hours(self):
        hours = [{"day": "Monday", "hours": "9 AM to 5 PM"}]
        assert _format_opening_hours(hours) == "Monday: 9 AM to 5 PM"

    def test_empty_hours(self):
        assert _format_opening_hours([]) == ""
        assert _format_opening_hours(None) == ""


class TestDerivedColumns:
    """Tests for add_derived_columns function."""

    def test_adds_whatsapp_link(self):
        df = pd.DataFrame([{
            "name": "Test", "phone": "+919876543210",
            "website": "", "instagram": "", "address": "Delhi, India"
        }])
        result = add_derived_columns(df)
        assert "whatsapp_link" in result.columns
        assert result.iloc[0]["whatsapp_link"] == "https://wa.me/919876543210"

    def test_adds_has_website(self):
        df = pd.DataFrame([{
            "name": "Test", "phone": "", "website": "https://example.com",
            "instagram": "", "address": ""
        }])
        result = add_derived_columns(df)
        assert result.iloc[0]["has_website"] == True
