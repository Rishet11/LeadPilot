import hashlib

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse


def rate_limit_key(request: Request) -> str:
    """Prefer bearer token for tenant-aware limits, fallback to IP."""
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()[:24]
            return f"token:{token_hash}"
    return f"ip:{request.client.host if request.client else 'unknown'}"


limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=["200/minute"],
    storage_uri="memory://",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Too many requests. Limit: {exc.detail}",
            "retry_after": getattr(exc, 'retry_after', 60)
        }
    )


SCRAPE_LIMIT = "10/hour"
READ_LIMIT = "100/minute"
WRITE_LIMIT = "30/minute"
SETTINGS_LIMIT = "20/hour"
