"""
Instagram Pipeline - Lightweight Lead Discovery for Micro-Businesses
Goal: Acquire 1-3 paying clients (No SaaS, Just Money)
"""

import os
import argparse
import pandas as pd
import traceback
from datetime import datetime
from dotenv import load_dotenv

# Import clients
from apify_client import run_instagram_search, poll_run_status, fetch_dataset

load_dotenv()

import re

# --- CONFIG ---
FOLLOWERS_MIN = 500
FOLLOWERS_MAX = 5000
SCORE_THRESHOLD = 60
LINKTREE_DOMAINS = ["linktr.ee", "beacons.ai", "taplink.cc", "bio.link", "carrd.co"]
NICHE_KEYWORDS = ["bakery", "baker", "cake", "trainer", "coach", "fitness", "gym", "makeup", "artist", "salon"]


def get_gemini():
    """Initialize Gemini for DM generation"""
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY missing")
        genai.configure(api_key=api_key)
        return genai.GenerativeModel('gemini-2.0-flash')
    except Exception as e:
        print(f"⚠️ Gemini init failed: {e}")
        return None


def is_real_website(url: str) -> bool:
    """Check if URL is a 'real' website (not Linktree/None)"""
    if not url:
        return False
    
    url_lower = url.lower()
    if any(domain in url_lower for domain in LINKTREE_DOMAINS):
        return False
        
    return True


def extract_email(bio: str) -> str:
    """Extract email from bio using regex."""
    if not bio:
        return ""
    match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', bio)
    return match.group(0) if match else ""


def score_profile(profile: dict, target_city: str = None) -> int:
    """
    Score logic:
    - Min < followers < Max: +40
    - No real website: +40
    - Niche keyword in bio: +20
    - City Match (if provided): +20 (CRITICAL for local)
    """
    score = 0
    followers = profile.get("followersCount", 0)
    external_url = profile.get("externalUrl")
    bio = (profile.get("biography") or "").lower()
    
    # 1. Follower Sweet Spot
    if FOLLOWERS_MIN < followers < FOLLOWERS_MAX:
        score += 40
    else:
        return 0 # Fail instantly if not in range
        
    # 2. Tech Deficit (No Website)
    if not is_real_website(external_url):
        score += 40
        
    # 3. Niche Match
    if any(kw in bio for kw in NICHE_KEYWORDS):
        score += 20
        
    # 4. Location Match (Improvisation)
    if target_city:
        if target_city.lower() in bio:
            score += 20
        else:
            score -= 30 # Penalize heavily if city not found (avoiding remote leads)
        
    return score


# Import batch DM generator from lead_agent
from lead_agent import generate_instagram_dms_batch


def process_target(target: dict, model) -> list:
    """Process a single keyword target."""
    keyword = target.get("keyword")
    limit = target.get("limit", 30)
    
    print(f"\n� PROCESSING: '{keyword}' (Limit: {limit})")
    
    # 1. Search
    print("   Running Apify Search...")
    try:
        run_data = run_instagram_search(keyword, limit)
        run_id = run_data["run_id"]
        dataset_id = run_data["dataset_id"]
        
        status = poll_run_status(run_id)
        if status != "SUCCEEDED":
            print(f"   ❌ Scraper failed: {status}")
            return []

        raw_data = fetch_dataset(dataset_id)
        print(f"   ✅ Fetched {len(raw_data)} profiles")
        
    except Exception as e:
        print(f"   ❌ API Error: {e}")
        return []

    # 2. Filter & Score
    print("   Filtering & Scoring...")
    filtered_leads = []
    
    # Smart City Detection
    target_city = ""
    common_cities = ["delhi", "mumbai", "bangalore", "pune", "gurgaon", "noida", "chennai", "hyderabad"]
    for city in common_cities:
        if city in keyword.lower():
            target_city = city
            print(f"   📍 City Detected: {target_city.capitalize()}")
            break
            
    for item in raw_data:
        username = item.get("username")
        if not username: continue
        
        profile = {
            "username": username,
            "followersCount": item.get("followersCount", 0),
            "biography": item.get("biography", ""),
            "externalUrl": item.get("externalUrl", ""),
            "url": f"https://instagram.com/{username}"
        }
        
        score = score_profile(profile, target_city)
        email = extract_email(profile["biography"])
        
        if score >= SCORE_THRESHOLD:
            filtered_leads.append({
                "username": profile["username"],
                "url": profile["url"],
                "followers": profile["followersCount"],
                "bio": profile["biography"][:150].replace("\n", " "),
                "matches_city": target_city.lower() in profile["biography"].lower() if target_city else True,
                "email": email,
                "external_url": profile["externalUrl"],
                "has_real_website": is_real_website(profile["externalUrl"]),
                "score": score
            })

    print(f"   ✅ Qualified: {len(filtered_leads)} leads (Score >= {SCORE_THRESHOLD})")
    return filtered_leads


def run_batch_pipeline(config_path: str = "instagram_batch_config.json"):
    print(f"\n🚀 STARTING INSTAGRAM BATCH PIPELINE")
    
    import json
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
    except FileNotFoundError:
        print(f"❌ Config not found: {config_path}")
        return

    targets = config.get("targets", [])
    all_leads = []
    
    # Init Gemini once
    model = get_gemini() # Kept for backward compatibility if needed, but we use lead_agent now
    
    # 1. Collect Leads from all targets
    for target in targets:
        leads = process_target(target, model)
        all_leads.extend(leads)
        
    if not all_leads:
        print("\n⚠️ No leads found in this batch.")
        return

    # 2. Batch DM Generation (Cost Optimized)
    print(f"\n💬 Generating DMs for {len(all_leads)} total leads...")
    
    batch_size = 10
    final_leads = []
    
    # Process in chunks of 10 for AI efficiency
    for i in range(0, len(all_leads), batch_size):
        chunk_leads = all_leads[i:i+batch_size]
        chunk_input = [{"username": l["username"], "bio": l["bio"]} for l in chunk_leads]
        
        ai_responses = generate_instagram_dms_batch(chunk_input)
        
        # Create map for this chunk
        chunk_map = {r['id']: r['dm_message'] for r in ai_responses if 'id' in r}
        
        for local_id, lead in enumerate(chunk_leads):
            msg = chunk_map.get(local_id, "Check manually")
            lead['dm_message'] = msg
            print(f"   💬 {lead['username']}: {msg}")
            final_leads.append(lead)

    # 4. Export Combined
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"data/instagram_leads_{timestamp}.csv"
    
    df = pd.DataFrame(final_leads)
    df = df.sort_values("score", ascending=False)
    
    # Ensure dir
    os.makedirs("data", exist_ok=True)
    
    df.to_csv(filename, index=False)
    # Also save latest
    df.to_csv("data/instagram_leads.csv", index=False)
    
    print(f"\n💾 Batch Complete! Saved {len(df)} leads to {filename}")


if __name__ == "__main__":
    import sys
    config_file = sys.argv[1] if len(sys.argv) > 1 else "instagram_batch_config.json"
    run_batch_pipeline(config_file)
