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
    
    ROI Heuristics:
    1. Digital Misfit: High Rating (>4.0) + No Website = Prime Web Target.
    2. Busy but Broken: High Volume (>100 reviews) + Low Rating (<4/5) or No Web = Prime Automation Target.
    3. Socially Active: Instagram presence + No Web.
    """
    if config is None:
        config = load_config()
    
    rules = config.get("scoring_rules", DEFAULT_CONFIG["scoring_rules"])
    priority_cats = config.get("priority_categories", DEFAULT_CONFIG["priority_categories"])
    
    score = 0
    reasons = []
    
    # 1. Digital Misfit Logic (The "High Quality but Invisible" Lead)
    has_web = bool(row.get('website', '').strip())
    rating = float(row.get('rating', 0) or 0)
    reviews = int(row.get('reviews', 0) or 0)
    
    if not has_web and rating >= 4.0 and reviews >= 10:
        score += rules.get("digital_misfit", 60)
        reasons.append(f"Digital Misfit: High Rating ({rating}) but NO website")

    # 2. Busy but Broken (High Volume + Low Tech/Performance)
    volume_thresh = config.get("high_volume_threshold", 100)
    if reviews >= volume_thresh and (rating < 4.0 or not has_web):
        score += rules.get("busy_but_broken", 40)
        reasons.append(f"Busy but Broken: High Volume ({reviews}) + Optimization Gap")

    # 3. Socially Active, Web Dead
    has_ig = bool(row.get('instagram', '').strip())
    if has_ig and not has_web:
        score += rules.get("social_without_web", 30)
        reasons.append("Socially Active but No Official Website")

    # 4. High Value Categories (ROI for specialized services)
    category = (row.get('category', '') or '').lower()
    if any(p_cat in category for p_cat in priority_cats):
        score += rules.get("high_value_category", 20)
        reasons.append(f"High-Value Category: {category}")

    # 5. Low Rating Fix (Reputation Mgmt Strategy)
    if 0 < rating < 3.8:
        score += rules.get("low_rating_fix", 15)
        reasons.append(f"Reputation Gap: Low Rating ({rating}) needs fix")

    # Final Adjustment: Cap at 100 and handle well-established
    score = min(score, 100)
    reason = " | ".join(reasons) if reasons else "Established business (Low ROI for basic services)"
    
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
