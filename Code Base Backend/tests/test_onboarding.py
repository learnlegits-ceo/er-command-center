"""Tests for hospital onboarding service — tenant + admin + departments + beds."""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.services.onboarding import onboard_hospital, create_departments_for_tenant, create_beds_for_departments
from app.models.tenant import Tenant
from app.models.user import User
from app.models.department import Department
from app.models.bed import Bed


class TestOnboardHospital:
    """Full onboarding flow."""

    async def test_successful_onboarding(self, db_session: AsyncSession, test_plan):
        result = await onboard_hospital(
            db_session,
            name="Onboarded Hospital",
            code="ONB001",
            plan_id=test_plan.id,
            admin_name="Dr. Test",
            admin_email="onboard@test.com",
            admin_password="Onboard@123",
            address="123 Test St",
        )

        assert result["tenant_name"] == "Onboarded Hospital"
        assert result["tenant_code"] == "ONB001"
        assert result["departments_created"] > 0
        assert result["beds_created"] > 0
        assert result["admin_email"] == "onboard@test.com"

        # Verify tenant exists
        tenant = (await db_session.execute(
            select(Tenant).where(Tenant.code == "ONB001")
        )).scalar_one()
        assert tenant.plan_id == test_plan.id
        assert tenant.subscription_status == "active"

        # Verify admin user exists
        admin = (await db_session.execute(
            select(User).where(User.email == "onboard@test.com")
        )).scalar_one()
        assert admin.role == "admin"
        assert admin.tenant_id == tenant.id

    async def test_duplicate_code_raises(self, db_session: AsyncSession, test_plan, test_tenant):
        with pytest.raises(ValueError, match="already exists"):
            await onboard_hospital(
                db_session,
                name="Dup",
                code="TEST",  # test_tenant has code "TEST"
                plan_id=test_plan.id,
                admin_name="A",
                admin_email="dup@test.com",
                admin_password="Dup@12345",
            )

    async def test_invalid_plan_raises(self, db_session: AsyncSession):
        with pytest.raises(ValueError, match="Invalid or inactive"):
            await onboard_hospital(
                db_session,
                name="Bad Plan",
                code="BP001",
                plan_id=uuid.uuid4(),
                admin_name="A",
                admin_email="badplan@test.com",
                admin_password="Bad@12345",
            )


class TestCreateDepartments:
    """Department creation helper."""

    async def test_creates_all_defaults(self, db_session: AsyncSession, test_tenant):
        departments = await create_departments_for_tenant(db_session, test_tenant.id)
        assert len(departments) == 9  # 9 default departments

    async def test_creates_subset(self, db_session: AsyncSession):
        from app.models.tenant import Tenant

        t = Tenant(id=uuid.uuid4(), name="Subset", code="SUB001", is_active=True)
        db_session.add(t)
        await db_session.flush()

        departments = await create_departments_for_tenant(db_session, t.id, ["ED-A", "ICU"])
        assert len(departments) == 2
        codes = {d.code for d in departments}
        assert codes == {"ED-A", "ICU"}


class TestCreateBeds:
    """Bed creation helper."""

    async def test_creates_beds_for_departments(self, db_session: AsyncSession):
        from app.models.tenant import Tenant

        t = Tenant(id=uuid.uuid4(), name="Beds Test", code="BED001", is_active=True)
        db_session.add(t)
        await db_session.flush()

        depts = await create_departments_for_tenant(db_session, t.id, ["ICU"])
        beds_created = await create_beds_for_departments(db_session, t.id, depts)
        assert beds_created > 0

        # Verify beds are linked to department and tenant
        bed_count = (await db_session.execute(
            select(func.count(Bed.id)).where(Bed.tenant_id == t.id)
        )).scalar()
        assert bed_count == beds_created
