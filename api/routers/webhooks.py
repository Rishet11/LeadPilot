import hashlib
import hmac
import json
import logging
import os
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import Customer, WebhookEvent, get_db

logger = logging.getLogger("leadpilot")
router = APIRouter()

LEMON_SQUEEZY_WEBHOOK_SECRET = os.getenv("LEMON_SQUEEZY_WEBHOOK_SECRET")


def _event_id(payload: dict, raw_body: bytes) -> str:
    meta = payload.get("meta", {})
    if meta.get("custom_data", {}).get("event_id"):
        return str(meta["custom_data"]["event_id"])
    data_id = payload.get("data", {}).get("id")
    event_name = meta.get("event_name", "unknown")
    if data_id:
        return f"{event_name}:{data_id}"
    return hashlib.sha256(raw_body).hexdigest()


def _upsert_customer_subscription(db: Session, payload: dict) -> bool:
    event_name = payload.get("meta", {}).get("event_name")
    data = payload.get("data", {})
    attributes = data.get("attributes", {})

    if event_name not in (
        "subscription_created",
        "subscription_updated",
        "subscription_cancelled",
        "subscription_expired",
    ):
        return False

    email = attributes.get("user_email")
    if not email:
        return False

    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer:
        logger.warning("Customer not found for email: %s", email)
        return False

    customer.lemon_squeezy_customer_id = str(attributes.get("customer_id"))
    customer.subscription_id = str(data.get("id"))
    customer.variant_id = str(attributes.get("variant_id"))
    customer.subscription_status = attributes.get("status")

    renews_at_str = attributes.get("renews_at")
    if renews_at_str:
        try:
            customer.renews_at = datetime.fromisoformat(renews_at_str.replace("Z", "+00:00"))
        except ValueError:
            logger.warning("Invalid renews_at timestamp: %s", renews_at_str)

    db.commit()
    return True


@router.post("/webhooks/lemonsqueezy")
async def handle_lemonsqueezy_webhook(
    request: Request,
    x_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    if not LEMON_SQUEEZY_WEBHOOK_SECRET:
        logger.error("LEMON_SQUEEZY_WEBHOOK_SECRET not set")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    if not x_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    body = await request.body()
    digest = hmac.new(LEMON_SQUEEZY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, x_signature):
        logger.warning("Invalid webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event_name = payload.get("meta", {}).get("event_name", "unknown")
    event_id = _event_id(payload, body)

    existing = db.query(WebhookEvent).filter(
        WebhookEvent.source == "lemonsqueezy",
        WebhookEvent.event_id == event_id,
    ).first()

    if existing and existing.status == "processed":
        return {"status": "duplicate_ignored", "event_id": event_id}

    if existing:
        existing.attempts = int(existing.attempts or 1) + 1
        existing.payload = body.decode("utf-8", errors="ignore")
        existing.event_name = event_name
        existing.status = "received"
        existing.error_message = None
        event = existing
    else:
        event = WebhookEvent(
            source="lemonsqueezy",
            event_id=event_id,
            event_name=event_name,
            status="received",
            attempts=1,
            payload=body.decode("utf-8", errors="ignore"),
        )
        db.add(event)
    db.commit()
    db.refresh(event)

    try:
        updated = _upsert_customer_subscription(db, payload)
        event.status = "processed"
        event.processed_at = datetime.utcnow()
        db.commit()
        return {
            "status": "processed",
            "event_id": event_id,
            "subscription_updated": updated,
        }
    except Exception as exc:
        db.rollback()
        event = db.query(WebhookEvent).filter(WebhookEvent.id == event.id).first()
        if event:
            event.status = "failed"
            event.error_message = str(exc)[:500]
            db.commit()
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/webhooks/lemonsqueezy/events")
def list_webhook_events(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    events = db.query(WebhookEvent).filter(
        WebhookEvent.source == "lemonsqueezy"
    ).order_by(WebhookEvent.received_at.desc()).limit(max(1, min(limit, 200))).all()

    return [
        {
            "event_id": e.event_id,
            "event_name": e.event_name,
            "status": e.status,
            "attempts": e.attempts,
            "received_at": e.received_at,
            "processed_at": e.processed_at,
            "error_message": e.error_message,
        }
        for e in events
    ]


@router.post("/webhooks/lemonsqueezy/retry/{event_id}")
def retry_failed_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(WebhookEvent).filter(
        WebhookEvent.source == "lemonsqueezy",
        WebhookEvent.event_id == event_id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Webhook event not found")
    if event.status != "failed":
        return {"status": "skipped", "detail": "Only failed events can be retried"}

    try:
        payload = json.loads(event.payload)
        updated = _upsert_customer_subscription(db, payload)
        event.status = "processed"
        event.processed_at = datetime.utcnow()
        event.attempts = int(event.attempts or 1) + 1
        event.error_message = None
        db.commit()
        return {"status": "processed", "event_id": event_id, "subscription_updated": updated}
    except Exception as exc:
        db.rollback()
        event = db.query(WebhookEvent).filter(WebhookEvent.id == event.id).first()
        event.attempts = int(event.attempts or 1) + 1
        event.error_message = str(exc)[:500]
        db.commit()
        raise HTTPException(status_code=500, detail="Retry failed")
