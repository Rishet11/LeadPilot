"""
Apify Client - Handles scraping via Apify Actors

Supports:
- Google Maps Scraper (compass/crawler-google-places)
"""

import os
import time
import json
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("leadpilot")

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
APIFY_BASE_URL = "https://api.apify.com/v2"
APIFY_HTTP_TIMEOUT_SECONDS = int(os.getenv("APIFY_HTTP_TIMEOUT_SECONDS", "30"))

# Google Maps Scraper Actor ID
GOOGLE_MAPS_ACTOR = "compass~crawler-google-places"


def run_google_maps_scraper(city: str, category: str, limit: int = 100) -> dict:
    """
    Run the Google Maps scraper actor.
    
    Args:
        city: Target city (e.g., "Delhi")
        category: Business category (e.g., "Gym")
        limit: Maximum number of results
        
    Returns:
        dict with run_id and dataset_id
    """
    if not APIFY_API_TOKEN:
        raise ValueError("APIFY_API_TOKEN not found in environment variables")
    logger.info(
        "[apify] Starting Google Maps actor city=%s category=%s limit=%s timeout=%ss",
        city,
        category,
        limit,
        APIFY_HTTP_TIMEOUT_SECONDS,
    )
    
    url = f"{APIFY_BASE_URL}/acts/{GOOGLE_MAPS_ACTOR}/runs"
    
    headers = {
        "Authorization": f"Bearer {APIFY_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Actor input configuration
    payload = {
        "searchStringsArray": [f"{category} in {city}"],
        "maxCrawledPlacesPerSearch": limit,
        "language": "en",
        "includeWebResults": True,
        "deeperCityScrape": False
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=APIFY_HTTP_TIMEOUT_SECONDS)
    response.raise_for_status()

    data = response.json()["data"]
    logger.info(
        "[apify] Actor run created run_id=%s dataset_id=%s",
        data.get("id"),
        data.get("defaultDatasetId"),
    )
    return {
        "run_id": data["id"],
        "dataset_id": data["defaultDatasetId"]
    }


def poll_run_status(run_id: str, max_wait: int = 300, poll_interval: int = 10) -> str:
    """
    Poll the run status until completion.
    
    Args:
        run_id: The Apify run ID
        max_wait: Maximum seconds to wait
        poll_interval: Seconds between polls
        
    Returns:
        Final status (SUCCEEDED, FAILED, etc.)
    """
    url = f"{APIFY_BASE_URL}/actor-runs/{run_id}"
    headers = {"Authorization": f"Bearer {APIFY_API_TOKEN}"}
    logger.info(
        "[apify] Polling run status run_id=%s max_wait=%ss interval=%ss",
        run_id,
        max_wait,
        poll_interval,
    )
    
    elapsed = 0
    while elapsed < max_wait:
        response = requests.get(url, headers=headers, timeout=APIFY_HTTP_TIMEOUT_SECONDS)
        response.raise_for_status()
        
        status = response.json()["data"]["status"]
        logger.info("Run status: %s (elapsed: %ds)", status, elapsed)
        
        if status in ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]:
            return status
            
        time.sleep(poll_interval)
        elapsed += poll_interval
    
    raise TimeoutError(f"Run did not complete within {max_wait} seconds")


def fetch_dataset(dataset_id: str) -> list:
    """
    Fetch results from an Apify dataset.
    
    Args:
        dataset_id: The dataset ID to fetch
        
    Returns:
        List of scraped items
    """
    url = f"{APIFY_BASE_URL}/datasets/{dataset_id}/items"
    headers = {"Authorization": f"Bearer {APIFY_API_TOKEN}"}
    logger.info("[apify] Fetching dataset items dataset_id=%s", dataset_id)

    response = requests.get(url, headers=headers, timeout=APIFY_HTTP_TIMEOUT_SECONDS)
    response.raise_for_status()

    data = response.json()
    logger.info("[apify] Dataset fetched dataset_id=%s rows=%s", dataset_id, len(data))
    return data


def save_raw_data(data: list, path: str = "data/raw.json"):
    """Save raw API response to JSON file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    logger.info("Saved %d items to %s", len(data), path)


def load_raw_data(path: str = "data/raw.json") -> list:
    """Load raw data from JSON file."""
    with open(path, "r") as f:
        return json.load(f)


def get_demo_data() -> list:
    """Return demo data for testing without API calls."""
    return [
        {
            "title": "FitZone Gym Delhi",
            "phone": "+91 98765 43210",
            "city": "New Delhi, India",
            "price": None,
            "categoryName": "Gym",
            "address": "123 Fitness St, Delhi",
            "website": None,
            "phoneUnformatted": "+919876543210",
            "totalScore": 4.5,
            "permanentlyClosed": False,
            "temporarilyClosed": False,
            "categories": [
                "Gym",
                "Fitness Center"
            ],
            "reviewsCount": 120,
            # Add reviews for AI Analysis testing (Week 2)
            "reviews": [
                {"text": "Great equipment but changing rooms are always dirty!", "stars": 4, "createdAt": "2 months ago"},
                {"text": "Trainers are awesome, love the vibe.", "stars": 5, "createdAt": "1 week ago"},
                {"text": "Wish they had more squat racks.", "stars": 3, "createdAt": "3 months ago"}
            ],
            "imagesCount": 15,
            "countryCode": "IN",
            "scrapedAt": "2026-02-05T13:00:42.476Z",
            "claimThisBusiness": True,
            "url": "https://maps.google.com/?cid=123",
            "openingHours": [
                {"day": "Monday", "hours": "6 AM to 10 PM"},
                {"day": "Sunday", "hours": "Closed"}
            ]
        },
        {
            "title": "Healthy Smiles Dental",
            "phone": "+91 88888 77777",
            "city": "Gurgaon, India",
            "categoryName": "Dental Clinic",
            "totalScore": 4.8,
            "reviewsCount": 85,
            "website": None,
            "url": "https://maps.google.com/?cid=456",
            "permanentlyClosed": False,
            "temporarilyClosed": False,
            "imagesCount": 8,
            "countryCode": "IN",
            "scrapedAt": "2026-02-05T13:00:42.476Z",
            "claimThisBusiness": False,
            "price": None,
            "openingHours": [
                {"day": "Monday", "hours": "9 AM to 6 PM"}
            ]
        },
        {
            "title": "Tampa HVAC Pros",
            "phone": "+1 813 555 1234",
            "city": "Tampa FL, USA",
            "categoryName": "HVAC Contractor",
            "totalScore": 4.2,
            "reviewsCount": 45,
            "website": "https://example.com",
            "url": "https://maps.google.com/?cid=789",
            "permanentlyClosed": False,
            "temporarilyClosed": False,
            "imagesCount": 22,
            "countryCode": "US",
            "scrapedAt": "2026-02-05T13:00:42.476Z",
            "claimThisBusiness": False,
            "price": "$$",
            "openingHours": [
                {"day": "Monday", "hours": "Open 24 hours"}
            ]
        },
        {
            "title": "Old Cafe - Permanently Closed",
            "phone": "+91 99999 11111",
            "city": "Mumbai, India",
            "categoryName": "Cafe",
            "totalScore": 3.0,
            "reviewsCount": 10,
            "website": None,
            "url": "https://maps.google.com/?cid=999",
            "permanentlyClosed": True,
            "temporarilyClosed": False,
            "imagesCount": 2,
            "countryCode": "IN",
            "scrapedAt": "2026-02-05T13:00:42.476Z",
            "claimThisBusiness": False,
            "price": None,
            "openingHours": []
        }
    ]


# Instagram Search Actor (apify~instagram-search-scraper)
INSTAGRAM_ACTOR = "apify~instagram-search-scraper"


def run_instagram_search(keyword: str, limit: int = 30) -> dict:
    """
    Run the Instagram search scraper.
    
    Args:
        keyword: Search query (e.g., "home baker delhi")
        limit: Max results
        
    Returns:
        dict with run_id and dataset_id
    """
    if not APIFY_API_TOKEN:
        raise ValueError("APIFY_API_TOKEN not found in environment variables")
    
    url = f"{APIFY_BASE_URL}/acts/{INSTAGRAM_ACTOR}/runs"
    
    headers = {
        "Authorization": f"Bearer {APIFY_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "search": keyword,
        "searchLimit": limit,
        "searchType": "user"
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    data = response.json()["data"]
    return {
        "run_id": data["id"],
        "dataset_id": data["defaultDatasetId"]
    }
