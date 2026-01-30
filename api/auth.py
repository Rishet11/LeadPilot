"""
Authentication module for LeadPilot API.
Provides API key-based authentication for all protected endpoints.
"""

import os
from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader

# API Key header configuration
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_api_key():
    """Get the expected API key from environment."""
    api_key = os.getenv("LEADPILOT_API_KEY")
    if not api_key:
        raise ValueError("LEADPILOT_API_KEY not configured in environment")
    return api_key


def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    """
    Verify the API key from request header.
    
    Args:
        api_key: The API key from X-API-Key header
        
    Returns:
        The verified API key
        
    Raises:
        HTTPException: If API key is missing or invalid
    """
    expected_key = os.getenv("LEADPILOT_API_KEY")
    
    # If no API key is configured, allow requests (development mode)
    # In production, LEADPILOT_API_KEY must be set
    if not expected_key:
        # Log warning in production
        import warnings
        warnings.warn("LEADPILOT_API_KEY not set - API is unprotected!")
        return "dev-mode"
    
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Provide X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    
    if api_key != expected_key:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    
    return api_key


# Dependency for protected routes
require_api_key = Depends(verify_api_key)
