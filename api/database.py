"""
Database module for LeadPilot API.
Uses SQLite for persistent storage of leads, jobs, and settings.
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum

from .schemas import LeadStatus

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "leadpilot.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# SQLAlchemy setup
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class LeadSource(str, enum.Enum):
    GOOGLE_MAPS = "google_maps"
    INSTAGRAM = "instagram"


class Lead(Base):
    """Lead model - stores scraped business information."""
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50))
    city = Column(String(100))
    category = Column(String(100))
    rating = Column(Float)
    reviews = Column(Integer)
    website = Column(String(500))
    instagram = Column(String(255))
    lead_score = Column(Integer, default=0)
    reason = Column(Text)
    ai_outreach = Column(Text)
    source = Column(String(50), default=LeadSource.GOOGLE_MAPS)
    status = Column(String(50), default=LeadStatus.NEW)
    country = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(Base):
    """Job model - tracks scraping job history."""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(50))  # "google_maps" or "instagram"
    targets = Column(Text)  # JSON string of targets
    status = Column(String(50), default=JobStatus.PENDING)
    leads_found = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class Settings(Base):
    """Settings model - stores configuration like AI prompts."""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize on import
init_db()
