from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db, Lead
from ..schemas import LeadResponse, LeadStatusUpdate, LeadStatus
from ..auth import verify_api_key
from ..rate_limit import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter(prefix="/leads", tags=["leads"])


class BatchDeleteRequest(BaseModel):
    lead_ids: List[int]


@router.get("/", response_model=List[LeadResponse])
@limiter.limit(READ_LIMIT)
def get_leads(
    request: Request,
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None, max_length=50),
    source: Optional[str] = Query(None, max_length=50),
    min_score: Optional[int] = Query(None, ge=0, le=100),
    city: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None, max_length=100),
    no_website: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    query = db.query(Lead)
    
    if status:
        query = query.filter(Lead.status == status)
    if source:
        query = query.filter(Lead.source == source)
    if min_score:
        query = query.filter(Lead.lead_score >= min_score)
    if city:
        query = query.filter(Lead.city.ilike(f"%{city[:100]}%"))
    if category:
        query = query.filter(Lead.category.ilike(f"%{category[:100]}%"))
    if no_website:
        query = query.filter((Lead.website == None) | (Lead.website == ""))
    
    return query.order_by(desc(Lead.lead_score)).offset(skip).limit(limit).all()


@router.get("/stats")
@limiter.limit(READ_LIMIT)
def get_lead_stats(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    total = db.query(Lead).count()
    high_priority = db.query(Lead).filter(Lead.lead_score >= 80).count()
    
    status_counts = {}
    for status in LeadStatus:
        count = db.query(Lead).filter(Lead.status == status.value).count()
        status_counts[status.value] = count
    
    google_maps = db.query(Lead).filter(Lead.source == "google_maps").count()
    instagram = db.query(Lead).filter(Lead.source == "instagram").count()
    
    return {
        "total_leads": total,
        "high_priority_leads": high_priority,
        "leads_by_status": status_counts,
        "leads_by_source": {
            "google_maps": google_maps,
            "instagram": instagram
        }
    }


@router.get("/{lead_id}", response_model=LeadResponse)
@limiter.limit(READ_LIMIT)
def get_lead(
    request: Request,
    lead_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}/status", response_model=LeadResponse)
@limiter.limit(WRITE_LIMIT)
def update_lead_status(
    request: Request,
    lead_id: int,
    status_update: LeadStatusUpdate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = status_update.status.value
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
@limiter.limit(WRITE_LIMIT)
def delete_lead(
    request: Request,
    lead_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted successfully"}


@router.post("/batch-delete")
@limiter.limit(WRITE_LIMIT)
def delete_leads_batch(
    request: Request,
    batch: BatchDeleteRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Delete multiple leads by ID.
    """
    if not batch.lead_ids:
        return {"message": "No leads provided", "count": 0}

    # Use query.delete for efficiency
    # synchronize_session=False is faster for bulk deletes
    try:
        deleted_count = db.query(Lead).filter(Lead.id.in_(batch.lead_ids)).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} leads", "count": deleted_count}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
