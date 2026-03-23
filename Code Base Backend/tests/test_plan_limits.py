"""Tests for plan limit enforcement — hard block on user/bed/department limits."""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.plan_limits import (
    check_user_limit,
    check_bed_limit,
    check_department_limit,
    check_feature_access,
)


class TestUserLimitCheck:
    """check_user_limit service."""

    async def test_within_limit(self, db_session: AsyncSession, tenant_with_plan):
        result = await check_user_limit(db_session, tenant_with_plan.id)
        # tenant has 1 admin user, max_users=3
        assert result["allowed"] is True
        assert result["current"] >= 1
        assert result["max"] == 3

    async def test_at_limit_blocked(self, db_session: AsyncSession, tenant_with_plan, admin_of_limited_tenant):
        """Fill up to max_users and verify block."""
        from app.models.user import User
        from tests.conftest import PASSWORD_HASH

        # admin_of_limited_tenant is user #1, create user #2 and #3
        for i in range(2):
            user = User(
                id=uuid.uuid4(),
                tenant_id=tenant_with_plan.id,
                email=f"extra{i}@test.com",
                password_hash=PASSWORD_HASH,
                name=f"Extra User {i}",
                role="nurse",
                status="active",
            )
            db_session.add(user)
        await db_session.flush()

        result = await check_user_limit(db_session, tenant_with_plan.id)
        assert result["allowed"] is False
        assert result["current"] >= 3

    async def test_unlimited_plan(self, db_session: AsyncSession, test_plan_enterprise):
        """Plans with max_users=0 should always allow."""
        from app.models.tenant import Tenant
        from datetime import datetime

        tenant = Tenant(
            id=uuid.uuid4(), name="Unlimited", code="UNL001",
            plan_id=test_plan_enterprise.id, subscription_status="active",
            subscription_starts_at=datetime.utcnow(), is_active=True,
        )
        db_session.add(tenant)
        await db_session.flush()

        result = await check_user_limit(db_session, tenant.id)
        assert result["allowed"] is True
        assert result["max"] == 0

    async def test_no_plan_allows_everything(self, db_session: AsyncSession, test_tenant):
        """Tenant without a plan should be permissive (legacy)."""
        result = await check_user_limit(db_session, test_tenant.id)
        assert result["allowed"] is True


class TestBedLimitCheck:
    """check_bed_limit service."""

    async def test_within_limit(self, db_session: AsyncSession, tenant_with_plan):
        result = await check_bed_limit(db_session, tenant_with_plan.id)
        assert result["allowed"] is True
        assert result["max"] == 10

    async def test_no_plan_allows(self, db_session: AsyncSession, test_tenant):
        result = await check_bed_limit(db_session, test_tenant.id)
        assert result["allowed"] is True


class TestDepartmentLimitCheck:
    """check_department_limit service."""

    async def test_within_limit(self, db_session: AsyncSession, tenant_with_plan):
        result = await check_department_limit(db_session, tenant_with_plan.id)
        # admin_of_limited_tenant fixture creates 1 dept, max=2
        assert result["allowed"] is True
        assert result["max"] == 2


class TestFeatureAccess:
    """check_feature_access service."""

    async def test_enabled_feature(self, db_session: AsyncSession, tenant_with_plan):
        result = await check_feature_access(db_session, tenant_with_plan.id, "ai_triage")
        assert result is True

    async def test_disabled_feature(self, db_session: AsyncSession, tenant_with_plan):
        result = await check_feature_access(db_session, tenant_with_plan.id, "police_cases")
        assert result is False

    async def test_missing_feature_defaults_false(self, db_session: AsyncSession, tenant_with_plan):
        result = await check_feature_access(db_session, tenant_with_plan.id, "nonexistent_feature")
        assert result is False

    async def test_no_plan_allows_all(self, db_session: AsyncSession, test_tenant):
        result = await check_feature_access(db_session, test_tenant.id, "police_cases")
        assert result is True


class TestLimitEnforcementInAdminRoutes:
    """Integration: admin routes should block when plan limits reached."""

    async def test_create_staff_blocked_at_limit(
        self, client, db_session, tenant_with_plan, admin_of_limited_tenant, limited_admin_headers
    ):
        """Fill to max_users then try to create another — should get 403."""
        from app.models.user import User
        from tests.conftest import PASSWORD_HASH

        # Fill remaining slots (admin is #1, add up to max_users)
        max_u = tenant_with_plan.max_users
        for i in range(max_u - 1):
            u = User(
                id=uuid.uuid4(),
                tenant_id=tenant_with_plan.id,
                email=f"fill{i}@test.com",
                password_hash=PASSWORD_HASH,
                name=f"Filler {i}",
                role="nurse",
                status="active",
            )
            db_session.add(u)
        await db_session.flush()

        resp = await client.post(
            "/api/v1/admin/staff",
            headers=limited_admin_headers,
            json={
                "name": "Overflow User",
                "email": "overflow@test.com",
                "password": "Overflow@1",
                "role": "nurse",
            },
        )
        assert resp.status_code == 403
        assert "limit reached" in resp.json()["detail"].lower()
