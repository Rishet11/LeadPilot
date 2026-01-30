"""
LeadPilot API - FastAPI backend for the dashboard.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import leads, scrape, jobs, settings

app = FastAPI(
    title="LeadPilot API",
    description="Backend API for LeadPilot lead generation dashboard",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(leads.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "LeadPilot API is running", "docs": "/docs"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
