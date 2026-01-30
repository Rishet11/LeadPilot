from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from ..database import get_db, Job
from ..schemas import JobResponse
from ..auth import verify_api_key
from ..rate_limit import limiter, READ_LIMIT

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/", response_model=List[JobResponse])
@limiter.limit(READ_LIMIT)
def get_jobs(
    request: Request,
    skip: int = Query(0, ge=0, le=1000),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, max_length=50),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    query = db.query(Job)
    
    if status:
        query = query.filter(Job.status == status)
    
    return query.order_by(desc(Job.created_at)).offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=JobResponse)
@limiter.limit(READ_LIMIT)
def get_job(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
