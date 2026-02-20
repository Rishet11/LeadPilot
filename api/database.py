"""
Database module for LeadPilot API.
Uses SQLite for persistent storage of leads, jobs, and settings.
"""

import os
from datetime import datetime, date
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Date,
    UniqueConstraint,
    Index,
    text,
)
from sqlalchemy.orm import sessionmaker, DeclarativeBase, relationship
import enum

from .schemas import LeadStatus

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "leadpilot.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# SQLAlchemy setup
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base class."""
    pass


class Customer(Base):
    """Customer model for account, billing, and tenant isolation data."""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    api_key = Column(String(64), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # Admin sees all leads
    
    # Subscription fields (Lemon Squeezy)
    lemon_squeezy_customer_id = Column(String(100), nullable=True)
    subscription_id = Column(String(100), nullable=True)
    variant_id = Column(String(100), nullable=True)  # Plan ID
    subscription_status = Column(String(50), default="free")  # free, active, past_due, cancelled
    renews_at = Column(DateTime, nullable=True)
    plan_tier = Column(String(50), default="free")  # free, starter, growth
    
    created_at = Column(DateTime, default=datetime.utcnow)

    leads = relationship("Lead", back_populates="customer")
    jobs = relationship("Job", back_populates="customer")
    settings = relationship("Settings", back_populates="customer")
    monthly_usage = relationship("UsageMonthly", back_populates="customer")
    sessions = relationship("AuthSession", back_populates="customer")


class AuthSession(Base):
    """Bearer auth sessions created after Google OAuth login."""
    __tablename__ = "auth_sessions"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
        Index("ix_auth_sessions_customer_id", "customer_id"),
        Index("ix_auth_sessions_expires_at", "expires_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    token_hash = Column(String(128), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="sessions")


class LeadSource(str, enum.Enum):
    GOOGLE_MAPS = "google_maps"
    INSTAGRAM = "instagram"


class Lead(Base):
    """Lead model - stores scraped business information."""
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50))
    city = Column(String(100))
    category = Column(String(100))
    rating = Column(Float)
    reviews = Column(Integer)
    website = Column(String(500))
    instagram = Column(String(255))
    email = Column(String(255))
    maps_url = Column(String(500))  # Google Maps profile link
    lead_score = Column(Integer, default=0)
    reason = Column(Text)
    ai_outreach = Column(Text)
    source = Column(String(50), default=LeadSource.GOOGLE_MAPS)
    status = Column(String(50), default=LeadStatus.NEW)
    country = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="leads")



class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    COMPLETED_WITH_ERRORS = "completed_with_errors"
    FAILED = "failed"


class Job(Base):
    """Job model - tracks scraping job history."""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    job_type = Column(String(50))  # "google_maps" or "instagram"
    targets = Column(Text)  # JSON string of targets
    status = Column(String(50), default=JobStatus.PENDING)
    leads_found = Column(Integer, default=0)
    attempt_count = Column(Integer, default=0)
    next_retry_at = Column(DateTime, nullable=True)
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="jobs")



class Settings(Base):
    """Settings model - stores configuration like AI prompts."""
    __tablename__ = "settings"
    __table_args__ = (
        UniqueConstraint("customer_id", "key", name="uq_settings_customer_key"),
        Index("ix_settings_customer_id", "customer_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    key = Column(String(100), nullable=False)
    value = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="settings")


class UsageMonthly(Base):
    """Per-customer monthly usage counters for plan enforcement."""
    __tablename__ = "usage_monthly"
    __table_args__ = (
        UniqueConstraint("customer_id", "period_start", name="uq_usage_customer_period"),
        Index("ix_usage_customer_id", "customer_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    period_start = Column(Date, nullable=False, default=lambda: date.today().replace(day=1))
    leads_generated = Column(Integer, default=0)
    scrape_jobs = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="monthly_usage")


class GuestPreviewUsage(Base):
    """Per-guest monthly preview usage counters for no-login scrape trials."""
    __tablename__ = "guest_preview_usage"
    __table_args__ = (
        UniqueConstraint("fingerprint", "period_start", name="uq_guest_preview_fingerprint_period"),
        Index("ix_guest_preview_fingerprint", "fingerprint"),
    )

    id = Column(Integer, primary_key=True, index=True)
    fingerprint = Column(String(128), nullable=False)
    period_start = Column(Date, nullable=False, default=lambda: date.today().replace(day=1))
    preview_jobs = Column(Integer, default=0)
    preview_leads = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WebhookEvent(Base):
    """Billing webhook audit log and idempotency registry."""
    __tablename__ = "webhook_events"
    __table_args__ = (
        UniqueConstraint("source", "event_id", name="uq_webhook_source_event"),
        Index("ix_webhook_source_event", "source", "event_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False)  # e.g. lemonsqueezy
    event_id = Column(String(255), nullable=False)
    event_name = Column(String(100), nullable=False)
    status = Column(String(50), default="received")  # received, processed, failed
    attempts = Column(Integer, default=1)
    payload = Column(Text, nullable=False)
    error_message = Column(Text, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
    _apply_sqlite_migrations()


def _apply_sqlite_migrations() -> None:
    """
    Lightweight SQLite migrations for additive columns.

    This keeps local/dev databases forward-compatible without introducing
    a full migration framework for small schema changes.
    """
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        columns = {
            row[1]  # PRAGMA table_info => (cid, name, type, notnull, dflt_value, pk)
            for row in conn.execute(text("PRAGMA table_info(jobs)"))
        }

        if "attempt_count" not in columns:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN attempt_count INTEGER DEFAULT 0"))
        if "next_retry_at" not in columns:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN next_retry_at DATETIME"))


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize on import
init_db()
