"""
Rate limiting configuration for LeadPilot API.
Uses slowapi to prevent abuse and protect Apify credits.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Create limiter instance using IP address as key
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],  # Default for all endpoints
    storage_uri="memory://",  # In-memory storage (use Redis in production for multi-instance)
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Too many requests. Limit: {exc.detail}",
            "retry_after": getattr(exc, 'retry_after', 60)
        }
    )


# Rate limit decorators for different endpoint types
# Usage: @limiter.limit("5/hour")

# Scraping endpoints - expensive operations
SCRAPE_LIMIT = "10/hour"  # Max 10 scrape jobs per hour per IP

# Read endpoints - less restrictive
READ_LIMIT = "100/minute"  # 100 reads per minute

# Write endpoints - moderate restriction
WRITE_LIMIT = "30/minute"  # 30 writes per minute

# Settings endpoints - restrictive
SETTINGS_LIMIT = "20/hour"  # 20 settings changes per hour
