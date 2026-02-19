from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum
import re


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    REPLIED = "replied"
    MEETING = "meeting"
    CLOSED = "closed"
    NOT_INTERESTED = "not_interested"


class LeadBase(BaseModel):
    name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    email: Optional[str] = None
    maps_url: Optional[str] = Field(None, max_length=500)
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

    model_config = ConfigDict(from_attributes=True)


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


def sanitize_search_text(text: str) -> str:
    sanitized = re.sub(r'[^\w\s\-\.,\'\"()]', '', text)
    return sanitized.strip()


class ScrapeTarget(BaseModel):
    city: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=100)
    limit: int = Field(default=50, ge=1, le=200)

    @field_validator('city', 'category')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize_search_text(v)


class BatchScrapeRequest(BaseModel):
    targets: List[ScrapeTarget] = Field(..., min_length=1, max_length=50)


class InstagramTarget(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=200)
    limit: int = Field(default=50, ge=1, le=100)
    followers_min: Optional[int] = Field(None, ge=0, le=10_000_000)
    followers_max: Optional[int] = Field(None, ge=0, le=10_000_000)
    score_threshold: Optional[int] = Field(None, ge=0, le=100)

    @field_validator('keyword')
    @classmethod
    def sanitize_keyword(cls, v: str) -> str:
        return sanitize_search_text(v)


class InstagramScrapeRequest(BaseModel):
    targets: List[InstagramTarget] = Field(..., min_length=1, max_length=30)


class ScrapeResponse(BaseModel):
    job_id: int
    status: str
    message: str


class JobResponse(BaseModel):
    id: int
    job_type: str
    targets: str
    status: str
    leads_found: int
    attempt_count: Optional[int] = 0
    next_retry_at: Optional[datetime] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SettingUpdate(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., max_length=10000)

    @field_validator('key')
    @classmethod
    def validate_key(cls, v: str) -> str:
        if not re.match(r'^[a-z][a-z0-9_]*$', v):
            raise ValueError('Key must be lowercase alphanumeric with underscores')
        return v


class SettingResponse(BaseModel):
    key: str
    value: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardMetrics(BaseModel):
    total_leads: int
    high_priority_leads: int
    leads_by_status: dict
    recent_jobs: List[JobResponse]


class UsageResponse(BaseModel):
    period: Optional[str] = None
    leads_generated: int
    scrape_jobs: int
    remaining_credits: Optional[int] = None
    monthly_quota: Optional[int] = None


class PlanResponse(BaseModel):
    plan_tier: str
    monthly_lead_quota: int
    instagram_enabled: bool
    max_concurrent_jobs: int
    subscription_status: str


class TargetBuilderRequest(BaseModel):
    objective: str = Field(..., min_length=8, max_length=500)
    max_targets: int = Field(default=6, ge=1, le=20)
    default_limit: int = Field(default=50, ge=5, le=200)
    include_instagram: bool = False


class TargetBuilderResponse(BaseModel):
    objective: str
    google_maps_targets: List[ScrapeTarget]
    instagram_targets: List[InstagramTarget]
    strategy: str
    source: str
    warnings: List[str] = Field(default_factory=list)


class AgentTemplateResponse(BaseModel):
    id: str
    name: str
    vertical: str
    ideal_for: str
    objective: str
    expected_outcome: str
    google_maps_targets: List[ScrapeTarget]
    instagram_targets: List[InstagramTarget] = Field(default_factory=list)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=20, max_length=8192)


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer_id: int
    email: str
    name: str
    plan_tier: str
    is_new_customer: bool
