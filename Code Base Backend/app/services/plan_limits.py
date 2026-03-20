"""Plan limit enforcement — checks tenant usage against subscription plan limits."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.models.user import User
from app.models.bed import Bed
from app.models.department import Department
from app.models.tenant import Tenant
from app.models.subscription import SubscriptionPlan


async def _get_plan_for_tenant(db: AsyncSession, tenant_id: UUID) -> SubscriptionPlan | None:
    """Fetch the subscription plan for a tenant."""
    result = await db.execute(
        select(SubscriptionPlan)
        .join(Tenant, Tenant.plan_id == SubscriptionPlan.id)
        .where(Tenant.id == tenant_id)
    )
    return result.scalar_one_or_none()


async def check_user_limit(db: AsyncSession, tenant_id: UUID) -> dict:
    """
    Check if tenant can add more users.
    Returns: {allowed: bool, current: int, max: int, included: int}
    max=0 means unlimited.
    """
    plan = await _get_plan_for_tenant(db, tenant_id)

    count_result = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
            User.status != "inactive",
        )
    )
    current = count_result.scalar() or 0

    if not plan:
        return {"allowed": True, "current": current, "max": 0, "included": 0}

    max_users = plan.max_users
    if max_users == 0:  # unlimited
        return {"allowed": True, "current": current, "max": 0, "included": plan.included_users}

    return {
        "allowed": current < max_users,
        "current": current,
        "max": max_users,
        "included": plan.included_users,
    }


async def check_bed_limit(db: AsyncSession, tenant_id: UUID) -> dict:
    """
    Check if tenant can add more beds.
    Returns: {allowed: bool, current: int, max: int, included: int}
    """
    plan = await _get_plan_for_tenant(db, tenant_id)

    count_result = await db.execute(
        select(func.count(Bed.id)).where(
            Bed.tenant_id == tenant_id,
            Bed.is_active == True,
        )
    )
    current = count_result.scalar() or 0

    if not plan:
        return {"allowed": True, "current": current, "max": 0, "included": 0}

    max_beds = plan.max_beds
    if max_beds == 0:
        return {"allowed": True, "current": current, "max": 0, "included": plan.included_beds}

    return {
        "allowed": current < max_beds,
        "current": current,
        "max": max_beds,
        "included": plan.included_beds,
    }


async def check_department_limit(db: AsyncSession, tenant_id: UUID) -> dict:
    """
    Check if tenant can add more departments.
    Returns: {allowed: bool, current: int, max: int}
    """
    plan = await _get_plan_for_tenant(db, tenant_id)

    count_result = await db.execute(
        select(func.count(Department.id)).where(
            Department.tenant_id == tenant_id,
            Department.is_active == True,
        )
    )
    current = count_result.scalar() or 0

    if not plan:
        return {"allowed": True, "current": current, "max": 0}

    max_depts = plan.max_departments
    if max_depts == 0:
        return {"allowed": True, "current": current, "max": 0}

    return {
        "allowed": current < max_depts,
        "current": current,
        "max": max_depts,
    }


async def check_feature_access(db: AsyncSession, tenant_id: UUID, feature_key: str) -> bool:
    """
    Check if a feature is enabled for the tenant's plan.
    Returns True if the feature is enabled or if there's no plan (permissive fallback).
    """
    plan = await _get_plan_for_tenant(db, tenant_id)
    if not plan:
        return True  # no plan = no restrictions (legacy/migration)

    features = plan.features or {}
    return features.get(feature_key, False)
