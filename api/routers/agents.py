"""Agent endpoints (target builder, follow-up helpers, etc.)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from ..agent_templates import list_agent_templates
from ..auth import get_current_customer
from ..database import Customer, get_db
from ..plans import get_entitlement
from ..rate_limit import limiter
from ..schemas import AgentTemplateResponse, TargetBuilderRequest, TargetBuilderResponse
from ..target_builder import build_targets_from_objective

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/target-builder", response_model=TargetBuilderResponse)
@limiter.limit("20/hour")
def target_builder(
    request: Request,
    payload: TargetBuilderRequest,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    customer_orm = None
    if customer:
        customer_orm = db.query(Customer).filter(Customer.id == customer["id"]).first()

    entitlement = get_entitlement(customer_orm)
    include_instagram = payload.include_instagram and entitlement.instagram_enabled

    result = build_targets_from_objective(
        objective=payload.objective,
        max_targets=payload.max_targets,
        default_limit=payload.default_limit,
        include_instagram=include_instagram,
    )

    warnings = list(result.get("warnings", []))
    if payload.include_instagram and not entitlement.instagram_enabled:
        warnings.append("Instagram targets are disabled on your current plan.")

    return TargetBuilderResponse(
        objective=result.get("objective", payload.objective),
        google_maps_targets=result.get("google_maps_targets", []),
        instagram_targets=result.get("instagram_targets", []),
        strategy=result.get("strategy", "Target generation strategy"),
        source=result.get("source", "fallback"),
        warnings=warnings,
    )


@router.get("/templates", response_model=List[AgentTemplateResponse])
@limiter.limit("100/minute")
def get_templates(
    request: Request,
    vertical: Optional[str] = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    customer_orm = None
    if customer:
        customer_orm = db.query(Customer).filter(Customer.id == customer["id"]).first()

    entitlement = get_entitlement(customer_orm)
    templates = list_agent_templates(
        include_instagram=entitlement.instagram_enabled,
        vertical=vertical,
    )
    return [AgentTemplateResponse(**item) for item in templates]
