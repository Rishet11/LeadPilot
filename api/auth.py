"""Authentication module for LeadPilot API."""

import os
import logging
import secrets
import hashlib
from datetime import datetime, timedelta
from functools import lru_cache
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

logger = logging.getLogger("leadpilot")

BEARER_SCHEME = HTTPBearer(auto_error=False)


@lru_cache()
def get_settings():
    """Get cached settings for auth configuration."""
    return {
        "environment": os.getenv("ENVIRONMENT", "development").lower(),
        "require_auth": os.getenv("REQUIRE_AUTH", "true").lower() == "true",
    }


def validate_startup_config():
    """
    Validate configuration at startup.
    For concierge SaaS, we check customers exist in database.
    """
    settings = get_settings()
    
    if settings["environment"] in ("production", "staging"):
        logger.info("Production mode - bearer auth required")


def _hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session_token(db: Session, customer_id: int) -> str:
    """Create a new bearer token session for a customer."""
    from .database import AuthSession

    ttl_days = max(1, int(os.getenv("AUTH_SESSION_TTL_DAYS", "30")))
    now = datetime.utcnow()
    token = f"lps_{secrets.token_urlsafe(48)}"
    token_hash = _hash_session_token(token)

    # Opportunistic cleanup of expired sessions.
    db.query(AuthSession).filter(AuthSession.expires_at < now).delete(synchronize_session=False)

    session = AuthSession(
        customer_id=customer_id,
        token_hash=token_hash,
        expires_at=now + timedelta(days=ttl_days),
        revoked=False,
        created_at=now,
        last_used_at=now,
    )
    db.add(session)
    db.commit()
    return token


def get_current_customer(
    credentials: HTTPAuthorizationCredentials = Security(BEARER_SCHEME),
):
    """
    Validate bearer token and return the associated customer.
    This dependency returns customer info for route isolation.
    """
    from .database import AuthSession, Customer, SessionLocal
    
    settings = get_settings()
    environment = settings["environment"]
    require_auth = settings["require_auth"]
    
    # Development/Test mode with auth disabled
    if environment in ("development", "dev", "test") and not require_auth:
        logger.debug(f"{environment} mode - auth not required")
        return None  # No customer filtering in dev/test mode
    
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Missing bearer token. Sign in with Google.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_hash = _hash_session_token(credentials.credentials)
    now = datetime.utcnow()

    db = SessionLocal()
    try:
        auth_session = db.query(AuthSession).join(
            Customer, Customer.id == AuthSession.customer_id
        ).filter(
            AuthSession.token_hash == token_hash,
            AuthSession.revoked.is_(False),
            AuthSession.expires_at > now,
            Customer.is_active.is_(True),
        ).first()

        if not auth_session:
            logger.warning("Invalid or expired bearer token attempt")
            raise HTTPException(
                status_code=403,
                detail="Invalid or expired session token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        customer = db.query(Customer).filter(Customer.id == auth_session.customer_id).first()
        auth_session.last_used_at = now
        db.commit()

        # Return customer data (not the ORM object to avoid session issues)
        return {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "is_admin": customer.is_admin,
        }
    finally:
        db.close()


def generate_api_key() -> str:
    """Generate an internal API key placeholder for customer records."""
    return f"lp_{secrets.token_urlsafe(32)}"
