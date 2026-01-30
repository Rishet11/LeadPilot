"""
Pydantic schemas for API request/response validation.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    REPLIED = "replied"
    MEETING = "meeting"
    CLOSED = "closed"
    NOT_INTERESTED = "not_interested"


# --- Lead Schemas ---

class LeadBase(BaseModel):
    name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    lead_score: Optional[int] = 0
    reason: Optional[str] = None
    ai_outreach: Optional[str] = None
    source: Optional[str] = "google_maps"
    country: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadResponse(LeadBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


# --- Scrape Schemas ---

class ScrapeTarget(BaseModel):
    city: str
    category: str
    limit: int = 50


class BatchScrapeRequest(BaseModel):
    targets: List[ScrapeTarget]


class InstagramTarget(BaseModel):
    keyword: str
    limit: int = 50
    followers_min: Optional[int] = None  # Uses global setting if not specified
    followers_max: Optional[int] = None
    score_threshold: Optional[int] = None


class InstagramScrapeRequest(BaseModel):
    targets: List[InstagramTarget]


class ScrapeResponse(BaseModel):
    job_id: int
    status: str
    message: str


# --- Job Schemas ---

class JobResponse(BaseModel):
    id: int
    job_type: str
    targets: str
    status: str
    leads_found: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Settings Schemas ---

class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingResponse(BaseModel):
    key: str
    value: str
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---

class DashboardMetrics(BaseModel):
    total_leads: int
    high_priority_leads: int  # score >= 80
    leads_by_status: dict
    recent_jobs: List[JobResponse]
