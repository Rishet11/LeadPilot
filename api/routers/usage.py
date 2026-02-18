from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..auth import get_current_customer
from ..database import Customer, get_db
from ..plans import get_entitlement, get_or_create_monthly_usage, remaining_credits
from ..rate_limit import limiter, READ_LIMIT
from ..schemas import PlanResponse, UsageResponse

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/current", response_model=UsageResponse)
@limiter.limit(READ_LIMIT)
def get_current_usage(
    request: Request,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
) -> UsageResponse:
    if customer is None:
        return {
            "period": None,
            "leads_generated": 0,
            "scrape_jobs": 0,
            "remaining_credits": None,
            "monthly_quota": None,
        }

    customer_orm = db.query(Customer).filter(Customer.id == customer["id"]).first()
    usage = get_or_create_monthly_usage(db, customer["id"])
    entitlement = get_entitlement(customer_orm)

    return {
        "period": str(usage.period_start),
        "leads_generated": usage.leads_generated,
        "scrape_jobs": usage.scrape_jobs,
        "remaining_credits": remaining_credits(customer_orm, usage),
        "monthly_quota": entitlement.monthly_lead_quota,
    }


@router.get("/plans/current", response_model=PlanResponse)
@limiter.limit(READ_LIMIT)
def get_current_plan(
    request: Request,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
) -> PlanResponse:
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
