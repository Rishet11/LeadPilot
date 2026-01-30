"""
Settings router - manage AI prompts and scoring configuration.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, Settings
from ..schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/settings", tags=["settings"])

# Default settings
DEFAULT_SETTINGS = {
    "ai_system_prompt": """You are LeadPilot AI, a cynical B2B Sales Sniper. 
Your goal is to find high-ROI clients for a digital agency.

TARGETS:
1. "Digital Misfit": High Ratings (4.5+) but NO Website. (Easy sell: "Showcase your reputation")
2. "Busy but Broken": Huge Reviews (100+) but bad rating or no site. (Easy sell: "Fix your leaks")

YOUR JOB:
- Analyze leads in BATCHES.
- Ignore "average" businesses. Focus on the ones bleeding money.
- Generate a "Kill Line": A single, direct WhatsApp/SMS hook that mentions SPECIFIC data.""",
    
    "scoring_no_website": "50",
    "scoring_high_reviews": "30",
    "scoring_medium_reviews": "15",
    "scoring_high_rating": "20",
    "scoring_good_rating": "10",
    "scoring_high_value_category": "10",
    "scoring_low_rating_opportunity": "15",
    
    # Instagram settings
    "instagram_followers_min": "500",
    "instagram_followers_max": "5000",
    "instagram_score_threshold": "60"
}


def init_default_settings(db: Session):
    """Initialize default settings if they don't exist."""
    for key, value in DEFAULT_SETTINGS.items():
        existing = db.query(Settings).filter(Settings.key == key).first()
        if not existing:
            setting = Settings(key=key, value=value)
            db.add(setting)
    db.commit()


@router.get("/", response_model=List[SettingResponse])
def get_all_settings(db: Session = Depends(get_db)):
    """Get all settings."""
    init_default_settings(db)
    settings = db.query(Settings).all()
    return settings


@router.get("/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a specific setting by key."""
    init_default_settings(db)
    setting = db.query(Settings).filter(Settings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.put("/{key}", response_model=SettingResponse)
def update_setting(key: str, update: SettingUpdate, db: Session = Depends(get_db)):
    """Update a setting value."""
    setting = db.query(Settings).filter(Settings.key == key).first()
    if not setting:
        # Create new setting
        setting = Settings(key=key, value=update.value)
        db.add(setting)
    else:
        setting.value = update.value
    
    db.commit()
    db.refresh(setting)
    return setting


@router.post("/reset")
def reset_settings(db: Session = Depends(get_db)):
    """Reset all settings to defaults."""
    for key, value in DEFAULT_SETTINGS.items():
        setting = db.query(Settings).filter(Settings.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = Settings(key=key, value=value)
            db.add(setting)
    db.commit()
    return {"message": "Settings reset to defaults"}
