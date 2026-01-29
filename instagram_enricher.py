"""
Instagram Enricher - Fetch follower counts for Instagram profiles

Uses Apify Instagram scraper to get follower counts for leads.
This helps with more accurate scoring (low follower count = better lead).
"""

import os
import re
import time
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
APIFY_BASE_URL = "https://api.apify.com/v2"

# Instagram Profile Scraper Actor
INSTAGRAM_ACTOR = "apify/instagram-profile-scraper"


def extract_instagram_username(url: str) -> str:
    """
    Extract username from Instagram URL.
    
    Examples:
        https://instagram.com/fitzonegym -> fitzonegym
        @fitzonegym -> fitzonegym
    """
    if not url:
        return None
    
    # Handle @username format
    if url.startswith('@'):
        return url[1:]
    
    # Extract from URL
    match = re.search(r'instagram\.com/([^/?]+)', url)
    if match:
        return match.group(1)
    
    # Already just username
    if '/' not in url and '@' not in url:
        return url
    
    return None


def fetch_instagram_followers(username: str) -> dict:
    """
    Fetch follower count for a single Instagram profile.
    
    Returns:
        dict with followers, following, posts counts
    """
    if not APIFY_API_TOKEN:
        raise ValueError("APIFY_API_TOKEN not found")
    
    url = f"{APIFY_BASE_URL}/acts/{INSTAGRAM_ACTOR}/run-sync-get-dataset-items"
    
    headers = {
        "Authorization": f"Bearer {APIFY_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "usernames": [username],
        "resultsLimit": 1
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        if data and len(data) > 0:
            profile = data[0]
            return {
                "username": username,
                "followers": profile.get("followersCount", 0),
                "following": profile.get("followsCount", 0),
                "posts": profile.get("postsCount", 0),
                "verified": profile.get("verified", False),
                "is_private": profile.get("private", False)
            }
    except Exception as e:
        print(f"    ⚠️ Failed to fetch @{username}: {str(e)}")
    
    return {
        "username": username,
        "followers": 0,
        "following": 0,
        "posts": 0,
        "verified": False,
        "is_private": False
    }


def enrich_dataframe(df: pd.DataFrame, max_profiles: int = 20) -> pd.DataFrame:
    """
    Enrich DataFrame with Instagram follower counts.
    
    Args:
        df: DataFrame with 'instagram' column
        max_profiles: Maximum profiles to enrich (to save API costs)
        
    Returns:
        DataFrame with instagram_followers column added
    """
    df = df.copy()
    df['instagram_followers'] = 0
    df['instagram_posts'] = 0
    
    # Filter rows with Instagram
    has_instagram = df['instagram'].notna() & (df['instagram'] != '')
    instagram_leads = df[has_instagram].head(max_profiles)
    
    if len(instagram_leads) == 0:
        print("📸 No Instagram profiles found to enrich")
        return df
    
    print(f"\n📸 Enriching Instagram data for {len(instagram_leads)} profiles...")
    
    for idx, row in instagram_leads.iterrows():
        username = extract_instagram_username(row['instagram'])
        
        if not username:
            print(f"  ⚠️ Could not extract username from: {row['instagram']}")
            continue
        
        print(f"  Fetching @{username}...")
        
        try:
            data = fetch_instagram_followers(username)
            df.at[idx, 'instagram_followers'] = data['followers']
            df.at[idx, 'instagram_posts'] = data['posts']
            
            print(f"    → {data['followers']:,} followers, {data['posts']} posts")
            
            # Rate limiting - be nice to the API
            time.sleep(2)
            
        except Exception as e:
            print(f"    ❌ Error: {str(e)}")
    
    return df


def get_instagram_username_batch(urls: list) -> list:
    """Extract usernames from a list of Instagram URLs."""
    return [extract_instagram_username(url) for url in urls]


# Mock data for testing without API
def enrich_with_mock_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add mock Instagram data for testing without API calls.
    Useful for dry-run mode.
    """
    df = df.copy()
    df['instagram_followers'] = 0
    df['instagram_posts'] = 0
    
    # Add realistic mock data based on business type
    has_instagram = df['instagram'].notna() & (df['instagram'] != '')
    
    for idx, row in df[has_instagram].iterrows():
        # Mock follower count based on rating and reviews
        base_followers = row.get('reviews', 50) * 10
        rating_multiplier = row.get('rating', 3.5) / 5.0
        
        followers = int(base_followers * rating_multiplier)
        posts = int(followers / 50) if followers > 0 else 5
        
        df.at[idx, 'instagram_followers'] = followers
        df.at[idx, 'instagram_posts'] = posts
    
    return df
