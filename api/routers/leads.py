from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db, Lead
from ..schemas import LeadResponse, LeadStatusUpdate, LeadStatus
from ..auth import get_current_customer
from ..rate_limit import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter(prefix="/leads", tags=["leads"])


class BatchDeleteRequest(BaseModel):
    lead_ids: List[int]


def _filter_by_customer(query, customer: dict):
    """Filter query by customer. Admins see all leads."""
    if customer is None:  # Dev mode
        return query
    if customer.get("is_admin"):
        return query
    return query.filter(Lead.customer_id == customer["id"])


@router.get("", response_model=List[LeadResponse])
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
    customer: dict = Depends(get_current_customer)
):
    query = db.query(Lead)
    query = _filter_by_customer(query, customer)
    
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
        query = query.filter(Lead.website.is_(None) | (Lead.website == ""))
    
    return query.order_by(desc(Lead.lead_score)).offset(skip).limit(limit).all()


@router.get("/stats")
@limiter.limit(READ_LIMIT)
def get_lead_stats(
    request: Request,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer)
):
    base_query = db.query(Lead)
    base_query = _filter_by_customer(base_query, customer)
    
    total = base_query.count()
    high_priority = base_query.filter(Lead.lead_score >= 80).count()
    
    status_counts = {}
    for status_enum in LeadStatus:
        count = base_query.filter(Lead.status == status_enum.value).count()
        status_counts[status_enum.value] = count
    
    google_maps = base_query.filter(Lead.source == "google_maps").count()
    instagram = base_query.filter(Lead.source == "instagram").count()
    
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
    customer: dict = Depends(get_current_customer)
):
    query = db.query(Lead).filter(Lead.id == lead_id)
    query = _filter_by_customer(query, customer)
    lead = query.first()
    
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
    customer: dict = Depends(get_current_customer)
):
    query = db.query(Lead).filter(Lead.id == lead_id)
    query = _filter_by_customer(query, customer)
    lead = query.first()
    
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
    customer: dict = Depends(get_current_customer)
):
    query = db.query(Lead).filter(Lead.id == lead_id)
    query = _filter_by_customer(query, customer)
    lead = query.first()
    
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
    customer: dict = Depends(get_current_customer)
):
    """Delete multiple leads by ID."""
    if not batch.lead_ids:
        return {"message": "No leads provided", "count": 0}

    query = db.query(Lead).filter(Lead.id.in_(batch.lead_ids))
    query = _filter_by_customer(query, customer)
    
    try:
        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} leads", "count": deleted_count}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
