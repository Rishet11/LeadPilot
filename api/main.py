"""
LeadPilot API - FastAPI backend for the dashboard.

Security Features:
- API key authentication (X-API-Key header)
- Rate limiting (slowapi)
- CORS restricted to specific origins
- Input validation (Pydantic)
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .routers import leads, scrape, jobs, settings
from .rate_limit import limiter

app = FastAPI(
    title="LeadPilot API",
    description="Backend API for LeadPilot lead generation dashboard",
    version="1.0.0"
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - use environment variable for production
# Development: http://localhost:3000
# Production: Set ALLOWED_ORIGINS env var (comma-separated)
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
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
    max_age=86400,  # Cache preflight for 24 hours
)

# Include routers
app.include_router(leads.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "message": "LeadPilot API is running",
        "docs": "/docs",
        "version": "1.0.0",
        "security": {
            "authentication": "X-API-Key header required for protected endpoints",
            "rate_limiting": "Enabled"
        }
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint (no auth required)."""
    return {"status": "healthy"}
