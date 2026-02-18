from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..auth import get_current_customer
from ..database import Customer, get_db
from ..plans import get_entitlement
from ..rate_limit import limiter, READ_LIMIT
from ..schemas import PlanResponse

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("/current", response_model=PlanResponse)
@limiter.limit(READ_LIMIT)
def get_current_plan(
    request: Request,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    if customer is None:
        ent = get_entitlement(None)
        return {
            "plan_tier": ent.tier,
            "monthly_lead_quota": ent.monthly_lead_quota,
            "instagram_enabled": ent.instagram_enabled,
            "max_concurrent_jobs": ent.max_concurrent_jobs,
            "subscription_status": "dev",
        }

    customer_orm = db.query(Customer).filter(Customer.id == customer["id"]).first()
    ent = get_entitlement(customer_orm)
    return {
        "plan_tier": ent.tier,
        "monthly_lead_quota": ent.monthly_lead_quota,
        "instagram_enabled": ent.instagram_enabled,
        "max_concurrent_jobs": ent.max_concurrent_jobs,
        "subscription_status": customer_orm.subscription_status if customer_orm else "free",
    }
