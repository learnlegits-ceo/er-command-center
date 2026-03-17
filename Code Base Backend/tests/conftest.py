"""
Shared test fixtures for the ER Command Center backend.

Requires a running PostgreSQL instance. Set TEST_DATABASE_URL env var or
use the default: postgresql+asyncpg://postgres:password@localhost:5432/er_command_center_test
"""

import os
import uuid

# Set required env vars BEFORE importing app modules (config.py validates on import)
os.environ.setdefault("SECRET_KEY", "test-secret-key-must-be-at-least-32-chars-long")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-must-be-at-least-32-chars")
os.environ.setdefault("GROQ_API_KEY", "")  # empty = mock triage mode
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://postgres:password@localhost:5432/er_command_center_test",
    ),
)
os.environ.setdefault(
    "DATABASE_SYNC_URL",
    "postgresql://postgres:password@localhost:5432/er_command_center_test",
)

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.db.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash


# ---------------------------------------------------------------------------
# Engine & session fixtures
# ---------------------------------------------------------------------------

TEST_DB_URL = os.environ["DATABASE_URL"]

test_engine = create_async_engine(
    TEST_DB_URL,
    poolclass=NullPool,
    connect_args={"statement_cache_size": 0},
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
async def _db_tables():
    """Create all tables once per test session, drop them at the end."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
async def db_session(_db_tables):
    """Provide a transactional database session that rolls back after each test."""
    async with test_engine.connect() as conn:
        txn = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await txn.rollback()


@pytest.fixture
async def client(db_session: AsyncSession):
    """httpx AsyncClient wired to the FastAPI app with the test DB session."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def test_tenant(db_session: AsyncSession):
    """Create a test tenant."""
    from app.models.tenant import Tenant

    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Hospital",
        code="TEST",
    )
    db_session.add(tenant)
    await db_session.flush()
    return tenant


@pytest.fixture
async def test_department(db_session: AsyncSession, test_tenant):
    """Create a test department."""
    from app.models.department import Department

    dept = Department(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        name="Emergency Department - Unit A",
        code="ED-A",
        capacity=20,
    )
    db_session.add(dept)
    await db_session.flush()
    return dept


@pytest.fixture
async def test_department_b(db_session: AsyncSession, test_tenant):
    """Create a second test department."""
    from app.models.department import Department

    dept = Department(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        name="Emergency Department - Unit B",
        code="ED-B",
        capacity=20,
    )
    db_session.add(dept)
    await db_session.flush()
    return dept


PASSWORD = "testpass123"
PASSWORD_HASH = get_password_hash(PASSWORD)


@pytest.fixture
async def nurse_user(db_session: AsyncSession, test_tenant, test_department):
    """Create a nurse user."""
    from app.models.user import User

    user = User(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        email="nurse@test.com",
        password_hash=PASSWORD_HASH,
        name="Test Nurse",
        role="nurse",
        department_id=test_department.id,
        status="active",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.fixture
async def doctor_user(db_session: AsyncSession, test_tenant, test_department):
    """Create a doctor user."""
    from app.models.user import User

    user = User(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        email="doctor@test.com",
        password_hash=PASSWORD_HASH,
        name="Test Doctor",
        role="doctor",
        department_id=test_department.id,
        specialization="Emergency Medicine",
        status="active",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.fixture
async def admin_user(db_session: AsyncSession, test_tenant, test_department):
    """Create an admin user."""
    from app.models.user import User

    user = User(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        email="admin@test.com",
        password_hash=PASSWORD_HASH,
        name="Test Admin",
        role="admin",
        department_id=test_department.id,
        status="active",
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _login(client: AsyncClient, email: str) -> dict:
    """Helper: login and return auth headers."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def nurse_headers(client: AsyncClient, nurse_user):
    return await _login(client, nurse_user.email)


@pytest.fixture
async def doctor_headers(client: AsyncClient, doctor_user):
    return await _login(client, doctor_user.email)


@pytest.fixture
async def admin_headers(client: AsyncClient, admin_user):
    return await _login(client, admin_user.email)


@pytest.fixture
async def test_bed(db_session: AsyncSession, test_tenant, test_department):
    """Create a test bed."""
    from app.models.bed import Bed

    bed = Bed(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        department_id=test_department.id,
        bed_number="ED-A-TEST-001",
        bed_type="emergency",
        status="available",
        is_active=True,
    )
    db_session.add(bed)
    await db_session.flush()
    return bed


@pytest.fixture
async def test_patient(db_session: AsyncSession, test_tenant, test_department):
    """Create a test patient."""
    from app.models.patient import Patient

    patient = Patient(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        patient_id="PT-TEST-001",
        name="Test Patient",
        age=45,
        gender="M",
        complaint="Chest pain",
        department_id=test_department.id,
        status="active",
        priority=1,
        priority_label="L1 - Critical",
    )
    db_session.add(patient)
    await db_session.flush()
    return patient
