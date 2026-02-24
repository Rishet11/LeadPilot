import base64
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_customer
from ..database import Customer, WebhookEvent, get_db

logger = logging.getLogger("leadpilot")
router = APIRouter()

LEMON_SQUEEZY_WEBHOOK_SECRET = os.getenv("LEMON_SQUEEZY_WEBHOOK_SECRET")
DODO_PAYMENTS_WEBHOOK_SECRET = os.getenv("DODO_PAYMENTS_WEBHOOK_SECRET")


def _parse_timestamp(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        logger.warning("Invalid timestamp: %s", ts)
        return None


def _event_id(payload: dict, raw_body: bytes, source: str) -> str:
    if source == "lemonsqueezy":
        meta = payload.get("meta", {})
        if meta.get("custom_data", {}).get("event_id"):
            return str(meta["custom_data"]["event_id"])
        data_id = payload.get("data", {}).get("id")
        event_name = meta.get("event_name", "unknown")
        if data_id:
            return f"{event_name}:{data_id}"
        return hashlib.sha256(raw_body).hexdigest()

    # Dodo payloads expose top-level id/type.
    event_id = payload.get("id")
    event_type = payload.get("type", "unknown")
    if event_id:
        return f"{event_type}:{event_id}"
    return hashlib.sha256(raw_body).hexdigest()


def _require_admin(customer: dict) -> None:
    if not customer or not customer.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


def _record_event(db: Session, source: str, event_id: str, event_name: str, body: bytes) -> WebhookEvent:
    existing = db.query(WebhookEvent).filter(
        WebhookEvent.source == source,
        WebhookEvent.event_id == event_id,
    ).first()

    if existing and existing.status == "processed":
        return existing

    if existing:
        existing.attempts = int(existing.attempts or 1) + 1
        existing.payload = body.decode("utf-8", errors="ignore")
        existing.event_name = event_name
        existing.status = "received"
        existing.error_message = None
        event = existing
    else:
        event = WebhookEvent(
            source=source,
            event_id=event_id,
            event_name=event_name,
            status="received",
            attempts=1,
            payload=body.decode("utf-8", errors="ignore"),
        )
        db.add(event)

    db.commit()
    db.refresh(event)
    return event


def _mark_event_processed(db: Session, event: WebhookEvent) -> None:
    event.status = "processed"
    event.processed_at = datetime.utcnow()
    db.commit()


def _mark_event_failed(db: Session, event: WebhookEvent, exc: Exception) -> None:
    db.rollback()
    refreshed = db.query(WebhookEvent).filter(WebhookEvent.id == event.id).first()
    if refreshed:
        refreshed.status = "failed"
        refreshed.error_message = str(exc)[:500]
        db.commit()


def _upsert_customer_subscription_lemonsqueezy(db: Session, payload: dict) -> bool:
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

    renews_at = _parse_timestamp(attributes.get("renews_at"))
    if renews_at:
        customer.renews_at = renews_at

    db.commit()
    return True


def _extract_dodo_signature_tokens(signature_header: str) -> set[str]:
    tokens: set[str] = set()
    for part in signature_header.split(","):
        token = part.strip()
        if not token:
            continue
        if "=" in token:
            token = token.split("=", 1)[1].strip()
        if ":" in token:
            maybe_version, maybe_sig = token.split(":", 1)
            if maybe_version.lower().startswith("v"):
                token = maybe_sig.strip()
        tokens.add(token)
    return tokens


def _verify_dodo_signature(secret: str, webhook_id: str, webhook_timestamp: str, raw_body: bytes, signature_header: str) -> bool:
    signed_payload = f"{webhook_id}.{webhook_timestamp}.{raw_body.decode('utf-8', errors='ignore')}".encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).digest()
    expected_hex = digest.hex()
    expected_b64 = base64.b64encode(digest).decode("utf-8")

    for token in _extract_dodo_signature_tokens(signature_header):
        if hmac.compare_digest(token, expected_hex) or hmac.compare_digest(token, expected_b64):
            return True
    return False


def _dodo_status_from_event(event_type: str, fallback: Optional[str]) -> str:
    if fallback:
        return str(fallback)
    if event_type.startswith("subscription."):
        return event_type.split(".", 1)[1]
    return "active"


def _upsert_customer_subscription_dodo(db: Session, payload: dict) -> bool:
    event_type = str(payload.get("type") or "")
    if not event_type.startswith("subscription."):
        return False

    data = payload.get("data") or {}
    if not isinstance(data, dict):
        return False

    customer_obj = data.get("customer") if isinstance(data.get("customer"), dict) else {}
    email = customer_obj.get("email") or data.get("customer_email")
    if not email:
        return False

    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer:
        logger.warning("Customer not found for email: %s", email)
        return False

    subscription_id = data.get("subscription_id") or data.get("id")
    product_id = data.get("product_id")
    if not product_id and isinstance(data.get("product"), dict):
        product_id = data["product"].get("product_id") or data["product"].get("id")

    if subscription_id:
        customer.subscription_id = str(subscription_id)
    if product_id:
        customer.variant_id = str(product_id)

    customer_id = customer_obj.get("customer_id") or customer_obj.get("id")
    if customer_id:
        customer.lemon_squeezy_customer_id = str(customer_id)

    customer.subscription_status = _dodo_status_from_event(event_type, data.get("status"))

    renews_at = _parse_timestamp(
        data.get("next_billing_date")
        or data.get("current_period_end")
        or data.get("renews_at")
    )
    if renews_at:
        customer.renews_at = renews_at

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
    event_id = _event_id(payload, body, source="lemonsqueezy")

    event = _record_event(db, "lemonsqueezy", event_id, event_name, body)
    if event.status == "processed":
        return {"status": "duplicate_ignored", "event_id": event_id}

    try:
        updated = _upsert_customer_subscription_lemonsqueezy(db, payload)
        _mark_event_processed(db, event)
        return {
            "status": "processed",
            "event_id": event_id,
            "subscription_updated": updated,
        }
    except Exception as exc:
        _mark_event_failed(db, event, exc)
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/webhooks/lemonsqueezy/events")
def list_lemonsqueezy_events(
    limit: int = 50,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    _require_admin(customer)

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
def retry_lemonsqueezy_event(
    event_id: str,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    _require_admin(customer)

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
        updated = _upsert_customer_subscription_lemonsqueezy(db, payload)
        event.status = "processed"
        event.processed_at = datetime.utcnow()
        event.attempts = int(event.attempts or 1) + 1
        event.error_message = None
        db.commit()
        return {"status": "processed", "event_id": event_id, "subscription_updated": updated}
    except Exception as exc:
        db.rollback()
        refreshed = db.query(WebhookEvent).filter(WebhookEvent.id == event.id).first()
        if refreshed:
            refreshed.attempts = int(refreshed.attempts or 1) + 1
            refreshed.error_message = str(exc)[:500]
            db.commit()
        raise HTTPException(status_code=500, detail="Retry failed")


@router.post("/webhooks/dodo")
async def handle_dodo_webhook(
    request: Request,
    webhook_id: str = Header(None, alias="webhook-id"),
    webhook_signature: str = Header(None, alias="webhook-signature"),
    webhook_timestamp: str = Header(None, alias="webhook-timestamp"),
    db: Session = Depends(get_db),
):
    if not DODO_PAYMENTS_WEBHOOK_SECRET:
        logger.error("DODO_PAYMENTS_WEBHOOK_SECRET not set")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    if not webhook_id or not webhook_signature or not webhook_timestamp:
        raise HTTPException(status_code=400, detail="Missing webhook headers")

    body = await request.body()
    if not _verify_dodo_signature(
        DODO_PAYMENTS_WEBHOOK_SECRET,
        webhook_id,
        webhook_timestamp,
        body,
        webhook_signature,
    ):
        logger.warning("Invalid Dodo webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event_name = payload.get("type", "unknown")
    event_id = _event_id(payload, body, source="dodo")

    event = _record_event(db, "dodo", event_id, event_name, body)
    if event.status == "processed":
        return {"status": "duplicate_ignored", "event_id": event_id}

    try:
        updated = _upsert_customer_subscription_dodo(db, payload)
        _mark_event_processed(db, event)
        return {
            "status": "processed",
            "event_id": event_id,
            "subscription_updated": updated,
        }
    except Exception as exc:
        _mark_event_failed(db, event, exc)
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/webhooks/dodo/events")
def list_dodo_events(
    limit: int = 50,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    _require_admin(customer)

    events = db.query(WebhookEvent).filter(
        WebhookEvent.source == "dodo"
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


@router.post("/webhooks/dodo/retry/{event_id}")
def retry_dodo_event(
    event_id: str,
    db: Session = Depends(get_db),
    customer: dict = Depends(get_current_customer),
):
    _require_admin(customer)

    event = db.query(WebhookEvent).filter(
        WebhookEvent.source == "dodo",
        WebhookEvent.event_id == event_id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Webhook event not found")
    if event.status != "failed":
        return {"status": "skipped", "detail": "Only failed events can be retried"}

    try:
        payload = json.loads(event.payload)
        updated = _upsert_customer_subscription_dodo(db, payload)
        event.status = "processed"
        event.processed_at = datetime.utcnow()
        event.attempts = int(event.attempts or 1) + 1
        event.error_message = None
        db.commit()
        return {"status": "processed", "event_id": event_id, "subscription_updated": updated}
    except Exception as exc:
        db.rollback()
        refreshed = db.query(WebhookEvent).filter(WebhookEvent.id == event.id).first()
        if refreshed:
            refreshed.attempts = int(refreshed.attempts or 1) + 1
            refreshed.error_message = str(exc)[:500]
            db.commit()
        raise HTTPException(status_code=500, detail="Retry failed")
