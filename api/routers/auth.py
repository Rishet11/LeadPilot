"""Authentication routes (Google OAuth login for bearer sessions)."""

import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import create_session_token, generate_api_key, get_current_customer
from ..database import Customer, get_db
from ..rate_limit import limiter, READ_LIMIT
from ..schemas import GoogleAuthRequest, GoogleAuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _verify_google_id_token(raw_id_token: str) -> dict:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(status_code=500, detail="Google auth is not configured")

    try:
        # Lazy import keeps API startup fast and avoids blocking non-auth routes.
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        claims = id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            client_id,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    issuer = claims.get("iss", "")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status_code=401, detail="Invalid Google token issuer")

    if not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email is not verified")

    return claims


@router.post("/google", response_model=GoogleAuthResponse)
@limiter.limit("20/minute")
def google_auth_login(
    request: Request,
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    claims = _verify_google_id_token(payload.id_token)

    email = str(claims.get("email", "")).strip().lower()
    name = str(claims.get("name", "")).strip() or email.split("@")[0]

    if not email:
        raise HTTPException(status_code=401, detail="Google account email not available")

    customer = db.query(Customer).filter(func.lower(Customer.email) == email).first()
    is_new_customer = False

    if customer is None:
        customer = Customer(
            name=name,
            email=email,
            api_key=generate_api_key(),
            is_active=True,
            is_admin=False,
            subscription_status="free",
            plan_tier="free",
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        is_new_customer = True
    else:
        # Keep account active for returning OAuth users and softly refresh display name.
        customer.is_active = True
        if name and (not customer.name or customer.name == customer.email.split("@")[0]):
            customer.name = name
        db.commit()
        db.refresh(customer)

    session_token = create_session_token(db, customer.id)
    db.refresh(customer)

    return GoogleAuthResponse(
        access_token=session_token,
        token_type="bearer",
        customer_id=customer.id,
        email=customer.email,
        name=customer.name,
        plan_tier=customer.plan_tier or "free",
        is_new_customer=is_new_customer,
    )


@router.get("/me")
@limiter.limit(READ_LIMIT)
def auth_me(
    request: Request,
    customer: dict = Depends(get_current_customer),
):
    if not customer:
        return {
            "id": None,
            "name": None,
            "email": None,
            "is_admin": False,
        }
    return customer
