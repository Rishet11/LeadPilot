import os
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
import warnings

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    expected_key = os.getenv("LEADPILOT_API_KEY")
    
    if not expected_key:
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
