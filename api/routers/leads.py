"""
Leads router - CRUD operations for leads.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from ..database import get_db, Lead
from ..schemas import LeadResponse, LeadStatusUpdate, LeadStatus

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/", response_model=List[LeadResponse])
def get_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    source: Optional[str] = None,
    min_score: Optional[int] = None,
    city: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all leads with optional filtering."""
    query = db.query(Lead)
    
    if status:
        query = query.filter(Lead.status == status)
    if source:
        query = query.filter(Lead.source == source)
    if min_score:
        query = query.filter(Lead.lead_score >= min_score)
    if city:
        query = query.filter(Lead.city.ilike(f"%{city}%"))
    if category:
        query = query.filter(Lead.category.ilike(f"%{category}%"))
    
    leads = query.order_by(desc(Lead.lead_score)).offset(skip).limit(limit).all()
    return leads


@router.get("/stats")
def get_lead_stats(db: Session = Depends(get_db)):
    """Get lead statistics for dashboard."""
    total = db.query(Lead).count()
    high_priority = db.query(Lead).filter(Lead.lead_score >= 80).count()
    
    # Count by status
    status_counts = {}
    for status in LeadStatus:
        count = db.query(Lead).filter(Lead.status == status.value).count()
        status_counts[status.value] = count
    
    # Count by source
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
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    """Get a specific lead by ID."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}/status", response_model=LeadResponse)
def update_lead_status(
    lead_id: int,
    status_update: LeadStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update a lead's status."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = status_update.status.value
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    """Delete a lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted successfully"}
