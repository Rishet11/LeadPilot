"""
Pytest configuration and fixtures for LeadPilot tests.
"""
# ruff: noqa: E402

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["REQUIRE_AUTH"] = "false"

from api.rate_limit import limiter
limiter.enabled = False

from api.database import Base, Customer, get_db
from api.main import app


# Create in-memory SQLite database for tests
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    # Seed a default customer for tenant-aware endpoints
    session.add(Customer(
        id=1,
        name="Test Customer",
        email="test@example.com",
        api_key="lp_test_key",
        is_active=True,
        is_admin=True,
        plan_tier="starter",
        subscription_status="active",
    ))
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    
    # Import inside fixture to avoid circular imports or early init
    from api.auth import get_current_customer

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_customer():
        """Mock authenticated customer."""
        return {
            "id": 1,
            "name": "Test Customer",
            "email": "test@example.com",
            "is_admin": True
        }
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_customer] = override_get_current_customer
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_lead_data():
    """Sample lead data for testing."""
    return {
        "name": "Test Business",
        "phone": "+1234567890",
        "city": "Test City",
        "category": "Test Category",
        "rating": 4.5,
        "reviews": 100,
        "website": "https://example.com",
        "lead_score": 85,
        "source": "google_maps",
    }
