"""
Settings router - manage AI prompts and scoring configuration.

Security Features:
- Google OAuth bearer authentication required
- Rate limiting (20/hour for settings changes)
- Input validation for keys and values
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db, Settings
from ..schemas import SettingUpdate, SettingResponse
from ..auth import get_current_customer
from ..rate_limit import limiter, SETTINGS_LIMIT, READ_LIMIT
from constants import DEFAULT_AI_SYSTEM_PROMPT

router = APIRouter(prefix="/settings", tags=["settings"])

# Default settings
DEFAULT_SETTINGS = {
    "ai_system_prompt": DEFAULT_AI_SYSTEM_PROMPT,
    
    "scoring_no_website": "50",
    "scoring_high_reviews": "30",
    "scoring_medium_reviews": "15",
    "scoring_high_rating": "20",
    "scoring_good_rating": "10",
    "scoring_high_value_category": "10",
    "scoring_low_rating_opportunity": "15",

    # Instagram settings
    "instagram_followers_min": "500",
    "instagram_followers_max": "50000",
    "instagram_score_threshold": "50"
}

# Allowed setting keys (whitelist)
ALLOWED_KEYS = set(DEFAULT_SETTINGS.keys())


def init_default_settings(db: Session, customer_id: Optional[int]):
    """Initialize default settings if they don't exist."""
    for key, value in DEFAULT_SETTINGS.items():
        existing = db.query(Settings).filter(
            Settings.customer_id == customer_id,
            Settings.key == key
        ).first()
        if not existing:
            setting = Settings(customer_id=customer_id, key=key, value=value)
            db.add(setting)
    db.commit()


@router.get("/", response_model=List[SettingResponse])
@limiter.limit(READ_LIMIT)
def get_all_settings(
    request: Request,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer)
):
    """
    Get all settings.
    
    Requires: Authorization bearer token
    Rate limit: 100/minute
    """
    customer_id = customer["id"] if customer else None
    init_default_settings(db, customer_id)
    settings = db.query(Settings).filter(Settings.customer_id == customer_id).all()
    return settings


@router.get("/{key}", response_model=SettingResponse)
@limiter.limit(READ_LIMIT)
def get_setting(
    request: Request,
    key: str,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer)
):
    """
    Get a specific setting by key.
    
    Requires: Authorization bearer token
    Rate limit: 100/minute
    """
    customer_id = customer["id"] if customer else None
    init_default_settings(db, customer_id)
    setting = db.query(Settings).filter(
        Settings.customer_id == customer_id,
        Settings.key == key
    ).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.put("/{key}", response_model=SettingResponse)
@limiter.limit(SETTINGS_LIMIT)
def update_setting(
    request: Request,
    key: str,
    update: SettingUpdate,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer)
):
    """
    Update a setting value.
    
    Requires: Authorization bearer token
    Rate limit: 20/hour
    
    Note: Only predefined setting keys are allowed.
    """
    # Validate key is in whitelist
    if key not in ALLOWED_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid setting key. Allowed keys: {', '.join(sorted(ALLOWED_KEYS))}"
        )
    
    customer_id = customer["id"] if customer else None
    setting = db.query(Settings).filter(
        Settings.customer_id == customer_id,
        Settings.key == key
    ).first()
    if not setting:
        # Create new setting
        setting = Settings(customer_id=customer_id, key=key, value=update.value)
        db.add(setting)
    else:
        setting.value = update.value
    
    db.commit()
    db.refresh(setting)
    return setting


@router.post("/reset")
@limiter.limit(SETTINGS_LIMIT)
def reset_settings(
    request: Request,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer)
):
    """
    Reset all settings to defaults.
    
    Requires: Authorization bearer token
    Rate limit: 20/hour
    """
    customer_id = customer["id"] if customer else None
    for key, value in DEFAULT_SETTINGS.items():
        setting = db.query(Settings).filter(
            Settings.customer_id == customer_id,
            Settings.key == key
        ).first()
        if setting:
            setting.value = value
        else:
            setting = Settings(customer_id=customer_id, key=key, value=value)
            db.add(setting)
    db.commit()
    return {"message": "Settings reset to defaults"}
