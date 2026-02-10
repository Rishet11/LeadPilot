"""
Lead Scorer - Rule-based scoring engine

Scores leads based on online presence indicators:
- No website: +40 points
- Low Instagram followers: +20 points  
- Low reviews: +15 points
- Low rating: +10 points
- Priority category: +15 points
"""

import json
import requests
import pandas as pd


# Default scoring configuration
DEFAULT_CONFIG = {
    "scoring_rules": {
        "no_website": 40,
        "low_instagram_followers": 20,
        "low_reviews": 15,
        "low_rating": 10,
        "priority_category": 15
    },
    "priority_categories": ["gym", "bakery", "salon", "cafe", "restaurant"],
    "instagram_follower_threshold": 5000,
    "review_threshold": 50,
    "rating_threshold": 4.2
}


def load_config(config_path: str = "config.json") -> dict:
    """Load scoring configuration from file."""
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return DEFAULT_CONFIG


def has_website(url: str, timeout: int = 5) -> bool:
    """
    Check if a website URL is accessible.
    
    Args:
        url: Website URL to check
        timeout: Request timeout in seconds
        
    Returns:
        True if website is accessible, False otherwise
    """
    if not url or not url.strip():
        return False
    
    # Ensure URL has protocol
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True)
        return response.status_code == 200
    except requests.RequestException:
        try:
            # Fallback to GET if HEAD fails
            response = requests.get(url, timeout=timeout, allow_redirects=True)
            return response.status_code == 200
        except requests.RequestException:
            return False


def score_lead(row: dict, config: dict = None) -> tuple:
    """
    Score a single lead based on 'Value + Friction' logic.
    
    HARDCODED VALUES (No Config Dependency):
    - No Website: +50
    - High Rating (4.0+): +20
    - High Volume (100+ reviews): +30
    - Medium Volume (30+ reviews): +15
    - High-Value Category: +10
    - Low Rating (<3.8): +15 (Reputation Fix Opportunity)
    """
    score = 0
    reasons = []
    
    # Extract fields safely
    has_web = bool(row.get('website', '').strip())
    rating = float(row.get('rating', 0) or 0)
    reviews = int(row.get('reviews', 0) or 0)
    category = (row.get('category', '') or '').lower()
    
    # HARD FILTER: Skip businesses with websites and very low reviews
    if has_web and reviews < 10:
        return 0, "Has website, minimal presence (Low ROI)"
    
    # 1. Tech Deficit = Prime Target (+50)
    if not has_web:
        score += 50
        reasons.append("NO WEBSITE (Prime Target)")
    
    # 2. Volume = Proof of demand
    if reviews >= 100:
        score += 20
        reasons.append(f"High Volume ({reviews} reviews)")
    elif reviews >= 30:
        score += 25
        reasons.append(f"Established Local ({reviews} reviews)")
    elif reviews >= 15:
        score += 15
        reasons.append(f"Growing Business ({reviews} reviews)")
    
    # 3. Rating = Reputation (they care about quality)
    if rating >= 4.5:
        score += 20
        reasons.append(f"High Rating ({rating})")
    elif rating >= 4.0:
        score += 10
        reasons.append(f"Good Rating ({rating})")
    
    # 4. High Value Categories — businesses that NEED a website to get clients
    high_value_cats = [
        # Medical & Health (high ticket, trust-dependent — patients google first)
        "dental", "dentist", "clinic", "orthodont", "chiropract", "physio",
        "dermatolog", "skin", "veterinary", "vet", "ayurveda",
        # Fitness & Wellness (booking-dependent — need online presence)
        "gym", "fitness", "yoga", "pilates", "spa", "salon", "beauty",
        # Home Services (searched on Google — "near me" goldmine)
        "hvac", "plumber", "electrician", "roofing", "pest control",
        "interior", "architect", "landscap", "cleaning", "carpenter",
        # Professional Services (trust + credibility = need a site)
        "lawyer", "attorney", "realtor", "real estate", "accountant",
        # Food & Hospitality (menus, ordering, reservations)
        "restaurant", "cafe", "catering", "bakery",
        # Events (portfolio-dependent — clients check work before booking)
        "wedding", "photography", "event", "planner",
        # Education (enrollment-dependent)
        "coaching", "academy", "institute", "tutor",
        # Auto (local search heavy)
        "auto repair", "mechanic", "garage",
    ]
    if any(cat in category for cat in high_value_cats):
        score += 10
        reasons.append(f"High-Value Category: {category}")
    
    # 5. Low Rating = Reputation Fix Opportunity
    if 0 < rating < 3.8:
        score += 15
        reasons.append(f"Reputation Gap ({rating}) - Fix Opportunity")

    # 6. Service Type: Residential vs Commercial (Week 2 Feature)
    # Residential services (B2C) are easier to sell to than Commercial (B2B).
    name = row.get('name', '').lower()
    full_text = f"{name} {category}"
    
    residential_keywords = ['home', 'residential', 'house', 'domestic', 'private', 'family']
    commercial_keywords = ['commercial', 'industrial', 'office', 'corporate', 'b2b']
    
    is_residential = any(k in full_text for k in residential_keywords)
    is_commercial = any(k in full_text for k in commercial_keywords)
    
    # Boost if explicitly Residential OR if it's a trade service that usually is residential (and not marked commercial)
    trade_services = ['plumber', 'electrician', 'pest', 'roof', 'landscap', 'clean', 'hvac']
    is_trade = any(t in category for t in trade_services)
    
    if is_residential or (is_trade and not is_commercial):
        score += 10
        reasons.append("Residential Service (High B2C Potential)")
    
    # Cap at 100
    score = min(score, 100)
    reason = " | ".join(reasons) if reasons else "Low Priority"
    
    return score, reason


def score_dataframe(df: pd.DataFrame, config: dict = None, check_websites: bool = False) -> pd.DataFrame:
    """
    Score all leads in a DataFrame.
    
    Args:
        df: DataFrame with lead data
        config: Scoring configuration
        check_websites: Whether to verify website accessibility (slower)
        
    Returns:
        DataFrame with score and reason columns added
    """
    if config is None:
        config = load_config()
    
    scores = []
    reasons = []
    
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        
        # Optional: Check website accessibility
        if check_websites and row_dict.get('website'):
            if not has_website(row_dict['website']):
                row_dict['website'] = ''  # Treat as no website if not accessible
        
        score, reason = score_lead(row_dict, config)
        scores.append(score)
        reasons.append(reason)
    
    df = df.copy()
    df['lead_score'] = scores
    df['reason'] = reasons
    
    # Sort by score descending
    df = df.sort_values('lead_score', ascending=False).reset_index(drop=True)
    
    return df


def filter_qualified_leads(df: pd.DataFrame, min_score: int = 50) -> pd.DataFrame:
    """
    Filter to only qualified leads above minimum score.
    
    Args:
        df: Scored DataFrame
        min_score: Minimum score threshold
        
    Returns:
        Filtered DataFrame
    """
    return df[df['lead_score'] >= min_score].copy()
