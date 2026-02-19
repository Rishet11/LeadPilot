"""
Instagram Pipeline - Lightweight Lead Discovery for Micro-Businesses
Goal: Acquire 1-3 paying clients (No SaaS, Just Money)
"""

import logging
import os
import re
from datetime import datetime

import pandas as pd
from dotenv import load_dotenv

# Import clients
from apify_client import fetch_dataset, poll_run_status, run_instagram_search
from lead_agent import generate_instagram_dms_batch

load_dotenv()

logger = logging.getLogger("leadpilot")

# --- CONFIG ---
FOLLOWERS_MIN = 500
FOLLOWERS_MAX = 50000
SCORE_THRESHOLD = 50
LINKTREE_DOMAINS = [
    "linktr.ee", "beacons.ai", "taplink.cc", "bio.link", "carrd.co",
    "linkin.bio", "hoo.be", "allmylinks.com", "lnk.bio", "campsite.bio",
    "stan.store", "milkshake.app", "solo.to", "snipfeed.co", "withkoji.com",
]
NICHE_KEYWORDS = [
    # Medical & Health — patients always google before booking
    "dentist", "dental", "clinic", "orthodontist", "dermatologist",
    "physiotherapy", "chiropractor", "veterinary", "vet", "ayurveda",
    # Fitness & Wellness — need booking/class schedules online
    "gym", "fitness", "yoga", "pilates", "trainer", "coach", "spa",
    # Beauty & Salons — clients check reviews/portfolio before booking
    "salon", "beauty", "skincare", "aesthetics", "makeup artist",
    "barber", "hairstylist", "hairdresser", "mehndi",
    # Home Services — "near me" search is their #1 lead source
    "plumber", "electrician", "hvac", "roofing", "pest control",
    "interior", "architect", "landscaping", "cleaning", "carpenter", "painting",
    # Food & Hospitality — need menus, ordering, reservations
    "restaurant", "cafe", "bakery", "baker", "catering", "chef", "tiffin",
    # Events & Photography — portfolio is everything
    "wedding", "photographer", "photography", "event", "planner",
    # Professional Services — trust = website
    "lawyer", "realtor", "real estate", "accountant", "consultant",
    # Education — enrollment/credibility dependent
    "coaching", "academy", "institute", "tutor",
    # Auto — local search heavy
    "mechanic", "auto repair", "garage",
]


def get_gemini():
    """Initialize Gemini for DM generation"""
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY missing")
        genai.configure(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")
        return genai.GenerativeModel(model_name)
    except Exception as e:
        logger.warning("Gemini init failed: %s", e)
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

    # 4. Location Match
    if target_city:
        if target_city.lower() in bio:
            score += 20
        else:
            score -= 15  # Moderate penalty — many local businesses don't put city in bio

    return score


def process_instagram_targets(targets: list) -> list:
    """
    Process Instagram targets and return leads as list of dicts.
    Used by the API for programmatic access.

    Args:
        targets: List of dicts with 'keyword', 'limit' keys

    Returns:
        List of lead dictionaries
    """
    all_leads = []

    for target in targets:
        leads = process_target(target)
        all_leads.extend(leads)

    if not all_leads:
        return []

    # Batch DM Generation
    batch_size = 15
    final_leads = []

    for i in range(0, len(all_leads), batch_size):
        chunk_leads = all_leads[i:i+batch_size]
        chunk_input = [{
            "username": lead_item["username"],
            "bio": lead_item["bio"],
            "followers": lead_item.get("followers"),
            "external_url": lead_item.get("external_url", ""),
            "has_real_website": lead_item.get("has_real_website", False),
        } for lead_item in chunk_leads]

        ai_responses = generate_instagram_dms_batch(chunk_input)
        chunk_map = {r['id']: r['dm_message'] for r in ai_responses if 'id' in r}

        for local_id, lead in enumerate(chunk_leads):
            msg = chunk_map.get(local_id, "Check manually")
            lead['dm_message'] = msg
            lead['ai_outreach'] = msg  # Also set ai_outreach for consistency
            lead['lead_score'] = lead.get('score', 0)
            lead['name'] = lead.get('username', '')
            lead['category'] = 'Instagram'
            final_leads.append(lead)

    return final_leads


def process_target(target: dict) -> list:
    """Process a single keyword target."""
    keyword = target.get("keyword")
    limit = target.get("limit", 30)

    logger.info("PROCESSING: '%s' (Limit: %d)", keyword, limit)

    # 1. Search
    logger.info("Running Apify Search...")
    try:
        run_data = run_instagram_search(keyword, limit)
        run_id = run_data["run_id"]
        dataset_id = run_data["dataset_id"]

        status = poll_run_status(run_id)
        if status != "SUCCEEDED":
            logger.error("Scraper failed: %s", status)
            return []

        raw_data = fetch_dataset(dataset_id)
        logger.info("Fetched %d profiles", len(raw_data))

    except Exception as e:
        logger.error("API Error: %s", e)
        return []

    # 2. Filter & Score
    logger.info("Filtering & Scoring...")
    filtered_leads = []

    # Smart City Detection — extract the last word(s) as potential city from keyword
    target_city = ""
    keyword_lower = keyword.lower().strip()
    # Try to find a city name in the keyword by splitting on common patterns
    # e.g. "makeup artist london" → "london", "home baker mumbai" → "mumbai"
    keyword_parts = keyword_lower.split()
    if len(keyword_parts) >= 2:
        # Last word is likely the city
        candidate = keyword_parts[-1]
        # Skip if the last word is a common niche keyword
        niche_words = {"artist", "maker", "coach", "trainer", "designer", "photographer", "stylist"}
        if candidate not in niche_words and len(candidate) >= 3:
            target_city = candidate
            logger.info("City Detected: %s", target_city.capitalize())

    for item in raw_data:
        username = item.get("username")
        if not username:
            continue

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
                "bio": profile["biography"][:300].replace("\n", " "),
                "matches_city": target_city.lower() in profile["biography"].lower() if target_city else True,
                "email": email,
                "external_url": profile["externalUrl"],
                "has_real_website": is_real_website(profile["externalUrl"]),
                "score": score
            })

    logger.info("Qualified: %d leads (Score >= %d)", len(filtered_leads), SCORE_THRESHOLD)
    return filtered_leads


def run_batch_pipeline(config_path: str = "instagram_batch_config.json"):
    logger.info("STARTING INSTAGRAM BATCH PIPELINE")

    import json
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
    except FileNotFoundError:
        logger.error("Config not found: %s", config_path)
        return

    targets = config.get("targets", [])
    all_leads = []

    # 1. Collect Leads from all targets
    for target in targets:
        leads = process_target(target)
        all_leads.extend(leads)

    if not all_leads:
        logger.warning("No leads found in this batch.")
        return

    # 2. Batch DM Generation (Cost Optimized)
    logger.info("Generating DMs for %d total leads...", len(all_leads))

    batch_size = 15
    final_leads = []

    for i in range(0, len(all_leads), batch_size):
        chunk_leads = all_leads[i:i+batch_size]
        chunk_input = [{
            "username": lead_item["username"],
            "bio": lead_item["bio"],
            "followers": lead_item.get("followers"),
            "external_url": lead_item.get("external_url", ""),
            "has_real_website": lead_item.get("has_real_website", False),
        } for lead_item in chunk_leads]

        ai_responses = generate_instagram_dms_batch(chunk_input)

        # Create map for this chunk
        chunk_map = {r['id']: r['dm_message'] for r in ai_responses if 'id' in r}

        for local_id, lead in enumerate(chunk_leads):
            msg = chunk_map.get(local_id, "Check manually")
            lead['dm_message'] = msg
            logger.info("DM for %s: %s", lead['username'], msg)
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

    logger.info("Batch Complete! Saved %d leads to %s", len(df), filename)


if __name__ == "__main__":
    import sys
    config_file = sys.argv[1] if len(sys.argv) > 1 else "instagram_batch_config.json"
    run_batch_pipeline(config_file)
