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
        "includeWebResults": False,
        "deeperCityScrape": False
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    data = response.json()["data"]
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
    
    elapsed = 0
    while elapsed < max_wait:
        response = requests.get(url, headers=headers)
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
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    return response.json()


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
            "categoryName": "Gym",
            "totalScore": 4.5,
            "reviewsCount": 120,
            "website": None,
            "url": "https://maps.google.com/?cid=123"
        },
        {
            "title": "Healthy Smiles Dental",
            "phone": "+91 88888 77777",
            "city": "Gurgaon, India",
            "categoryName": "Dental Clinic",
            "totalScore": 4.8,
            "reviewsCount": 85,
            "website": None,
            "url": "https://maps.google.com/?cid=456"
        },
        {
            "title": "Tampa HVAC Pros",
            "phone": "+1 813 555 1234",
            "city": "Tampa FL, USA",
            "categoryName": "HVAC Contractor",
            "totalScore": 4.2,
            "reviewsCount": 45,
            "website": "https://example.com",
            "url": "https://maps.google.com/?cid=789"
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

