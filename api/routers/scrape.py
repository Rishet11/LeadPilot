"""
Scrape router - endpoints to trigger scraping jobs.
"""

import json
import sys
import os
from datetime import datetime
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from ..database import get_db, Lead, Job, JobStatus
from ..schemas import BatchScrapeRequest, InstagramScrapeRequest, ScrapeResponse, ScrapeTarget

router = APIRouter(prefix="/scrape", tags=["scrape"])


def run_google_maps_batch(job_id: int, targets: list, db_path: str):
    """Background task to run Google Maps scraping."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
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
                print(f"Error processing target {target}: {e}")
                continue
        
        # Update job as completed
        job.status = JobStatus.COMPLETED.value
        job.leads_found = total_leads
        job.completed_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


def run_instagram_batch(job_id: int, targets: list, db_path: str):
    """Background task to run Instagram scraping."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
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
                print(f"Error processing Instagram target {target}: {e}")
                continue
        
        job.status = JobStatus.COMPLETED.value
        job.leads_found = total_leads
        job.completed_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


@router.post("/google-maps", response_model=ScrapeResponse)
def scrape_google_maps(
    request: BatchScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start a Google Maps batch scraping job."""
    # Create job record
    targets_json = json.dumps([t.model_dump() for t in request.targets])
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
    targets = [t.model_dump() for t in request.targets]
    background_tasks.add_task(run_google_maps_batch, job.id, targets, DB_PATH)
    
    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=f"Batch job started with {len(request.targets)} targets"
    )


@router.post("/instagram", response_model=ScrapeResponse)
def scrape_instagram(
    request: InstagramScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start an Instagram batch scraping job."""
    targets_json = json.dumps([t.model_dump() for t in request.targets])
    job = Job(
        job_type="instagram",
        targets=targets_json,
        status=JobStatus.PENDING.value
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    from ..database import DB_PATH
    
    targets = [t.model_dump() for t in request.targets]
    background_tasks.add_task(run_instagram_batch, job.id, targets, DB_PATH)
    
    return ScrapeResponse(
        job_id=job.id,
        status="pending",
        message=f"Instagram job started with {len(request.targets)} keywords"
    )


@router.post("/single", response_model=ScrapeResponse)
def scrape_single(
    target: ScrapeTarget,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Quick single target scrape (for dashboard)."""
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
