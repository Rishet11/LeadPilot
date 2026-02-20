from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
import re

from ..database import get_db, Lead
from ..schemas import LeadListResponse, LeadResponse, LeadStatusUpdate, LeadStatus
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


def _apply_lead_filters(
    query,
    status: Optional[str],
    source: Optional[str],
    min_score: Optional[int],
    city: Optional[str],
    category: Optional[str],
    no_website: Optional[bool],
):
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
    return query


def _qa_sanitize_outreach(text: str) -> str:
    sanitized = re.sub(r"\s+", " ", (text or "")).strip()
    risky_phrases = [
        "guaranteed results",
        "guaranteed leads",
        "100% guaranteed",
        "no-brainer offer",
        "limited time only",
    ]
    lowered = sanitized.lower()
    for phrase in risky_phrases:
        if phrase in lowered:
            sanitized = re.sub(re.escape(phrase), "practical improvement", sanitized, flags=re.IGNORECASE)
    return sanitized[:700]


def _build_regenerated_outreach(lead: Lead) -> str:
    business_name = (lead.name or "your business").strip()
    category = (lead.category or "service business").strip()
    city = (lead.city or "your area").strip()
    rating = lead.rating
    reviews = int(lead.reviews or 0)
    has_website = bool((lead.website or "").strip())

    social_proof = ""
    if rating is not None and reviews > 0:
        social_proof = f"and your {float(rating):.1f} rating across {reviews} reviews"
    elif reviews > 0:
        social_proof = f"and your {reviews} reviews"

    gap_line = (
        "I noticed there may be missed conversions because your website flow is weak or missing."
        if not has_website
        else "I noticed there may be room to improve how local traffic converts into booked calls."
    )

    reason_hint = (lead.reason or "").strip()
    context_line = f"Your profile already shows demand {social_proof}.".strip()
    if reason_hint:
        context_line = f"{context_line} Main signal: {reason_hint}."

    return (
        f"Hi {business_name} team, quick note after reviewing your {category} listing in {city}. "
        f"{context_line} {gap_line} "
        "I can share a short, practical teardown with 2-3 fixes you can apply immediately. "
        "Open to seeing it?"
    )


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
    query = _apply_lead_filters(query, status, source, min_score, city, category, no_website)

    return query.order_by(desc(Lead.lead_score)).offset(skip).limit(limit).all()


@router.get("/page", response_model=LeadListResponse)
@limiter.limit(READ_LIMIT)
def get_leads_page(
    request: Request,
    skip: int = Query(0, ge=0, le=100000),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, max_length=50),
    source: Optional[str] = Query(None, max_length=50),
    min_score: Optional[int] = Query(None, ge=0, le=100),
    city: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None, max_length=100),
    no_website: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    query = db.query(Lead)
    query = _filter_by_customer(query, customer)
    query = _apply_lead_filters(query, status, source, min_score, city, category, no_website)

    total = query.count()
    items = query.order_by(desc(Lead.lead_score)).offset(skip).limit(limit).all()
    return LeadListResponse(items=items, total=total, skip=skip, limit=limit)


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


@router.post("/{lead_id}/regenerate-outreach", response_model=LeadResponse)
@limiter.limit(WRITE_LIMIT)
def regenerate_lead_outreach(
    request: Request,
    lead_id: int,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    query = db.query(Lead).filter(Lead.id == lead_id)
    query = _filter_by_customer(query, customer)
    lead = query.first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    regenerated = _build_regenerated_outreach(lead)
    lead.ai_outreach = _qa_sanitize_outreach(regenerated)
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
