from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from ..database import get_db, Job
from ..schemas import JobResponse
from ..auth import get_current_customer
from ..rate_limit import limiter, READ_LIMIT

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _filter_by_customer(query, customer: dict):
    """Filter query by customer. Admins see all jobs."""
    if customer is None:  # Dev mode
        return query
    if customer.get("is_admin"):
        return query
    return query.filter(Job.customer_id == customer["id"])


@router.get("", response_model=List[JobResponse])
@limiter.limit(READ_LIMIT)
def get_jobs(
    request: Request,
    skip: int = Query(0, ge=0, le=1000),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, max_length=50),
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer)
):
    query = db.query(Job)
    query = _filter_by_customer(query, customer)
    
    if status:
        query = query.filter(Job.status == status)
    
    return query.order_by(desc(Job.created_at)).offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=JobResponse)
@limiter.limit(READ_LIMIT)
def get_job(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer)
):
    query = db.query(Job).filter(Job.id == job_id)
    query = _filter_by_customer(query, customer)
    job = query.first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
