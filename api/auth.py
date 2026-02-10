"""
Authentication module for LeadPilot API.

Provides multi-customer API key validation.
Each customer has their own unique API key.
"""

import os
import logging
import secrets
from functools import lru_cache
from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

logger = logging.getLogger("leadpilot")

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


@lru_cache()
def get_settings():
    """Get cached settings for auth configuration."""
    return {
        "environment": os.getenv("ENVIRONMENT", "development").lower(),
        "require_auth": os.getenv("REQUIRE_AUTH", "true").lower() == "true",
    }


def validate_startup_config():
    """
    Validate configuration at startup.
    For concierge SaaS, we check customers exist in database.
    """
    settings = get_settings()
    
    if settings["environment"] in ("production", "staging"):
        logger.info("Production mode - API key auth required")


def get_current_customer(
    api_key: str = Security(API_KEY_HEADER),
):
    """
    Validate API key and return the associated customer.
    This is a dependency that returns customer info for route isolation.
    
    Note: Requires db session to be passed in the route.
    """
    from .database import SessionLocal, Customer
    
    settings = get_settings()
    environment = settings["environment"]
    require_auth = settings["require_auth"]
    
    # Development/Test mode with auth disabled
    if environment in ("development", "dev", "test") and not require_auth:
        logger.debug(f"{environment} mode - auth not required")
        return None  # No customer filtering in dev/test mode
    
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Provide X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    
    # Look up customer by API key
    db = SessionLocal()
    try:
        customer = db.query(Customer).filter(
            Customer.api_key == api_key,
            Customer.is_active == True
        ).first()
        
        if not customer:
            logger.warning("Invalid API key attempt")
            raise HTTPException(
                status_code=403,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "ApiKey"}
            )
        
        # Return customer data (not the ORM object to avoid session issues)
        return {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "is_admin": customer.is_admin,
        }
    finally:
        db.close()


# Legacy function for backward compatibility during migration
def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    """
    Legacy API key verification.
    Now validates against customers table instead of env var.
    """
    customer = get_current_customer(api_key)
    if customer is None:
        return "dev-mode"
    return api_key


def generate_api_key() -> str:
    """Generate a new secure API key for a customer."""
    return f"lp_{secrets.token_urlsafe(32)}"
