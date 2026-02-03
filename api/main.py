import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
print(f"[DEBUG] Loading .env from: {env_path}")
print(f"[DEBUG] .env exists: {env_path.exists()}")
load_dotenv(env_path)
print(f"[DEBUG] ENVIRONMENT = {os.getenv('ENVIRONMENT')}")
print(f"[DEBUG] LEADPILOT_API_KEY = {os.getenv('LEADPILOT_API_KEY', 'NOT SET')[:20]}...")

from fastapi import FastAPI
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    max_age=86400,
)

app.include_router(leads.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


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
