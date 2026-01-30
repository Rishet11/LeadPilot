import os
import logging
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

logger = logging.getLogger("leadpilot")

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    expected_key = os.getenv("LEADPILOT_API_KEY")

    if not expected_key:
        if os.getenv("ENVIRONMENT") == "development":
            logger.warning("LEADPILOT_API_KEY not set - running in dev mode")
            return "dev-mode"
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

    if api_key != expected_key:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"}
        )

    return api_key
