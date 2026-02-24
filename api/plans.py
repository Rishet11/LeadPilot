"""Plan entitlement and usage gating helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from .database import Customer, UsageMonthly


@dataclass(frozen=True)
class PlanEntitlement:
    tier: str
    monthly_lead_quota: int
    instagram_enabled: bool
    max_concurrent_jobs: int


DEFAULT_PLANS = {
    "free": PlanEntitlement("free", monthly_lead_quota=100, instagram_enabled=False, max_concurrent_jobs=1),
    "launch": PlanEntitlement("launch", monthly_lead_quota=500, instagram_enabled=True, max_concurrent_jobs=2),
    "starter": PlanEntitlement("starter", monthly_lead_quota=2500, instagram_enabled=True, max_concurrent_jobs=3),
}

LEGACY_PLAN_ALIASES = {
    "agency": "starter",
    "growth": "starter",
}


def _variant_plan_map() -> dict[str, str]:
    mapping = {
        # Dodo Payments product IDs (primary billing provider).
        os.getenv("DODO_LAUNCH_PRODUCT_ID", "").strip(): "launch",
        os.getenv("DODO_STARTER_PRODUCT_ID", "").strip(): "starter",
        # Backward compatibility for legacy Lemon Squeezy variants.
        os.getenv("LEMON_STARTER_VARIANT_ID", "").strip(): "launch",
        os.getenv("LEMON_GROWTH_VARIANT_ID", "").strip(): "starter",
    }
    return {k: v for k, v in mapping.items() if k}


def _active_subscription(customer: Customer) -> bool:
    return (customer.subscription_status or "").lower() in {"active", "on_trial", "trialing"}


def infer_plan_tier(customer: Optional[Customer]) -> str:
    if customer is None:
        return "free"

    explicit_tier = (customer.plan_tier or "").lower().strip()
    if explicit_tier in LEGACY_PLAN_ALIASES:
        return LEGACY_PLAN_ALIASES[explicit_tier]
    if explicit_tier in DEFAULT_PLANS:
        return explicit_tier

    variant_id = str(customer.variant_id or "")
    variant_map = _variant_plan_map()
    if variant_id and variant_map.get(variant_id):
        return variant_map[variant_id]

    return "launch" if _active_subscription(customer) else "free"


def get_entitlement(customer: Optional[Customer]) -> PlanEntitlement:
    return DEFAULT_PLANS[infer_plan_tier(customer)]


def _month_start(today: Optional[date] = None) -> date:
    now = today or date.today()
    return now.replace(day=1)


def get_or_create_monthly_usage(db: Session, customer_id: int, today: Optional[date] = None) -> UsageMonthly:
    period_start = _month_start(today)
    usage = db.query(UsageMonthly).filter(
        UsageMonthly.customer_id == customer_id,
        UsageMonthly.period_start == period_start,
    ).first()
    if usage:
        return usage

    usage = UsageMonthly(
        customer_id=customer_id,
        period_start=period_start,
        leads_generated=0,
        scrape_jobs=0,
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage


def increment_usage(db: Session, customer_id: int, leads_delta: int = 0, jobs_delta: int = 0) -> UsageMonthly:
    usage = get_or_create_monthly_usage(db, customer_id)
    usage.leads_generated = int(usage.leads_generated or 0) + max(0, int(leads_delta))
    usage.scrape_jobs = int(usage.scrape_jobs or 0) + max(0, int(jobs_delta))
    db.commit()
    db.refresh(usage)
    return usage


def remaining_credits(customer: Optional[Customer], usage: Optional[UsageMonthly]) -> Optional[int]:
    entitlement = get_entitlement(customer)
    if entitlement.monthly_lead_quota >= 1_000_000:
        return None
    used = int(usage.leads_generated or 0) if usage else 0
    return max(0, entitlement.monthly_lead_quota - used)
