# ruff: noqa: E402
import os
import uuid
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv(override=True)

from .routers import leads, scrape, jobs, settings, webhooks, usage, plans, agents, auth
from .rate_limit import limiter
from .auth import validate_startup_config


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Add request ID for tracing
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response.headers["X-Request-ID"] = request_id
        
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Validate configuration
    try:
        validate_startup_config()
    except RuntimeError as e:
        import logging
        logging.error(str(e))
        # Don't crash in dev, but log the error
        if os.getenv("ENVIRONMENT", "").lower() in ("production", "staging"):
            raise
    
    yield  # Application runs here
    
    # Shutdown: Cleanup if needed
    pass


app = FastAPI(
    title="LeadPilot API",
    description="Backend API for LeadPilot lead generation dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    max_age=86400,
)

app.include_router(leads.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(usage.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(auth.router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "LeadPilot API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
