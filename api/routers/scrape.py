"""
Scrape router - endpoints to trigger scraping jobs.

Security Features:
- API key authentication required
- Rate limiting (10/hour for scrape endpoints)
- Input validation via Pydantic schemas
- Concurrent job limits
"""

import json
import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Request
from sqlalchemy.orm import Session

logger = logging.getLogger("leadpilot")

from ..database import get_db, Lead, Job, JobStatus
from ..schemas import BatchScrapeRequest, InstagramScrapeRequest, ScrapeResponse, ScrapeTarget
from ..auth import verify_api_key
from ..rate_limit import limiter, SCRAPE_LIMIT

router = APIRouter(prefix="/scrape", tags=["scrape"])

# Maximum concurrent jobs allowed
try:
    MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "3"))
except (ValueError, TypeError):
    MAX_CONCURRENT_JOBS = 3


def check_concurrent_jobs(db: Session):
    """Check if we're at the concurrent job limit."""
    running_jobs = db.query(Job).filter(
        Job.status.in_([JobStatus.PENDING.value, JobStatus.RUNNING.value])
    ).count()
    
    if running_jobs >= MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many running jobs ({running_jobs}/{MAX_CONCURRENT_JOBS}). Please wait for current jobs to complete."
        )


def _create_background_session(db_path: str):
    """Create a new DB session for background tasks (which run outside the request lifecycle)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def run_google_maps_batch(job_id: int, targets: list, db_path: str):
    """Background task to run Google Maps scraping."""
    db = _create_background_session(db_path)
    
    try:
        # Update job status to running
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status = JobStatus.RUNNING.value
        job.started_at = datetime.utcnow()
        db.commit()
        
        # Import and run batch processor
        from batch_processor import process_batch_targets
        
        total_leads = 0
        for target in targets:
            try:
                # Run scraper for each target
                leads_data = process_batch_targets([target])
                
                # Save leads to database
                for lead_dict in leads_data:
                    lead = Lead(
                        name=lead_dict.get('name', ''),
                        phone=lead_dict.get('phone'),
                        city=lead_dict.get('city'),
                        category=lead_dict.get('category'),
                        rating=lead_dict.get('rating'),
                        reviews=lead_dict.get('reviews'),
                        website=lead_dict.get('website'),
                        maps_url=lead_dict.get('maps_url') or lead_dict.get('url'),
                        lead_score=lead_dict.get('lead_score', 0),
                        reason=lead_dict.get('reason'),
                        ai_outreach=lead_dict.get('ai_outreach'),
                        source='google_maps',
                        country=lead_dict.get('country')
                    )
                    db.add(lead)
                    total_leads += 1
                
                db.commit()
            except Exception as e:
                logger.error("Error processing target %s: %s", target, e)
                continue
        
        # Update job as completed
        job.status = JobStatus.COMPLETED.value
        job.leads_found = total_leads
        job.completed_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)[:500]  # Limit error message length
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


def run_instagram_batch(job_id: int, targets: list, db_path: str):
    """Background task to run Instagram scraping."""
    db = _create_background_session(db_path)
    
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status = JobStatus.RUNNING.value
        job.started_at = datetime.utcnow()
        db.commit()
        
        from instagram_pipeline import process_instagram_targets
        
        total_leads = 0
        for target in targets:
            try:
                leads_data = process_instagram_targets([target])
                
                for lead_dict in leads_data:
                    lead = Lead(
                        name=lead_dict.get('name', lead_dict.get('username', '')),
                        phone=lead_dict.get('phone'),
                        city=lead_dict.get('city'),
                        category=lead_dict.get('category'),
                        rating=lead_dict.get('rating'),
                        reviews=lead_dict.get('followers'),
                        website=lead_dict.get('website'),
                        instagram=lead_dict.get('username'),
                        lead_score=lead_dict.get('lead_score', 0),
                        reason=lead_dict.get('reason'),
                        ai_outreach=lead_dict.get('ai_outreach'),
                        source='instagram',
                        country=lead_dict.get('country')
                    )
                    db.add(lead)
                    total_leads += 1
                
                db.commit()
            except Exception as e:
                logger.error("Error processing Instagram target %s: %s", target, e)
                continue
        
        job.status = JobStatus.COMPLETED.value
        job.leads_found = total_leads
        job.completed_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)[:500]
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


@router.post("/google-maps", response_model=ScrapeResponse)
@limiter.limit(SCRAPE_LIMIT)
def scrape_google_maps(
    request: Request,
    scrape_request: BatchScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Start a Google Maps batch scraping job.
    
    Requires: X-API-Key header
    Rate limit: 10/hour
    Max targets: 50
    """
    # Check concurrent job limit
    check_concurrent_jobs(db)
    
    # Create job record
    targets_json = json.dumps([t.model_dump() for t in scrape_request.targets])
    job = Job(
        job_type="google_maps",
        targets=targets_json,
        status=JobStatus.PENDING.value
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Get database path for background task
    from ..database import DB_PATH
    
    # Start background task
    targets = [t.model_dump() for t in scrape_request.targets]
    background_tasks.add_task(run_google_maps_batch, job.id, targets, DB_PATH)
    
    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=f"Batch job started with {len(scrape_request.targets)} targets"
    )


@router.post("/instagram", response_model=ScrapeResponse)
@limiter.limit(SCRAPE_LIMIT)
def scrape_instagram(
    request: Request,
    scrape_request: InstagramScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Start an Instagram batch scraping job.
    
    Requires: X-API-Key header
    Rate limit: 10/hour
    Max keywords: 30
    """
    # Check concurrent job limit
    check_concurrent_jobs(db)
    
    targets_json = json.dumps([t.model_dump() for t in scrape_request.targets])
    job = Job(
        job_type="instagram",
        targets=targets_json,
        status=JobStatus.PENDING.value
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    from ..database import DB_PATH
    
    targets = [t.model_dump() for t in scrape_request.targets]
    background_tasks.add_task(run_instagram_batch, job.id, targets, DB_PATH)
    
    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=f"Instagram job started with {len(scrape_request.targets)} keywords"
    )


@router.post("/single", response_model=ScrapeResponse)
@limiter.limit(SCRAPE_LIMIT)
def scrape_single(
    request: Request,
    target: ScrapeTarget,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Quick single target scrape (for dashboard).
    
    Requires: X-API-Key header
    Rate limit: 10/hour
    """
    # Check concurrent job limit
    check_concurrent_jobs(db)
    
    targets_json = json.dumps([target.model_dump()])
    job = Job(
        job_type="google_maps",
        targets=targets_json,
        status=JobStatus.PENDING.value
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    from ..database import DB_PATH
    
    background_tasks.add_task(run_google_maps_batch, job.id, [target.model_dump()], DB_PATH)
    
    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=f"Scraping {target.city} - {target.category}"
    )
