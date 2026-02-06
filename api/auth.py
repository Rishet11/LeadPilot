"""
Authentication module for LeadPilot API.

Provides API key validation with environment-aware configuration.
"""

import os
import logging
import secrets
from functools import lru_cache
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

logger = logging.getLogger("leadpilot")

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


@lru_cache()
def get_settings():
    """Get cached settings for auth configuration."""
    return {
        "environment": os.getenv("ENVIRONMENT", "development").lower(),
        "api_key": os.getenv("LEADPILOT_API_KEY"),
        "require_auth": os.getenv("REQUIRE_AUTH", "true").lower() == "true",
    }


def validate_startup_config():
    """
    Validate configuration at startup.
    Raises RuntimeError if production is misconfigured.
    """
    settings = get_settings()
    
    if settings["environment"] in ("production", "staging"):
        if not settings["api_key"]:
            raise RuntimeError(
                "CRITICAL: LEADPILOT_API_KEY must be set in production/staging. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        if len(settings["api_key"]) < 32:
            logger.warning("API key is shorter than recommended (32+ chars)")


def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    """
    Verify the API key from request header.
    
    In development: Allows requests without API key if REQUIRE_AUTH=false
    In production: Always requires valid API key
    """
    settings = get_settings()
    environment = settings["environment"]
    expected_key = settings["api_key"]
    require_auth = settings["require_auth"]
    
    # Development mode with auth disabled
    if environment in ("development", "dev") and not require_auth:
        logger.debug("Development mode - auth not required")
        return "dev-mode"
    
    # Production or auth required
    if not expected_key:
        logger.error("API key not configured but auth is required")
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: API key not set"
        )

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Provide X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"}
        )

    # Constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(api_key, expected_key):
        logger.warning("Invalid API key attempt")
        raise HTTPException(
            status_code=403,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"}
        )

    return api_key
