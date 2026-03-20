"""Usage tracking service — live counts and monthly snapshots for billing."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime

from app.models.user import User
from app.models.bed import Bed
from app.models.patient import Patient
from app.models.tenant import Tenant
from app.models.subscription import SubscriptionPlan
from app.models.usage import UsageRecord


async def get_current_usage(db: AsyncSession, tenant_id: UUID) -> dict:
    """Get live usage counts for a tenant."""
    active_users = (await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
            User.status != "inactive",
            User.role != "platform_admin",
        )
    )).scalar() or 0

    total_beds = (await db.execute(
        select(func.count(Bed.id)).where(
            Bed.tenant_id == tenant_id,
            Bed.is_active == True,
        )
    )).scalar() or 0

    occupied_beds = (await db.execute(
        select(func.count(Bed.id)).where(
            Bed.tenant_id == tenant_id,
            Bed.is_active == True,
            Bed.status == "occupied",
        )
    )).scalar() or 0

    # Get plan limits
    plan_limit = {}
    plan_result = await db.execute(
        select(SubscriptionPlan)
        .join(Tenant, Tenant.plan_id == SubscriptionPlan.id)
        .where(Tenant.id == tenant_id)
    )
    plan = plan_result.scalar_one_or_none()
    if plan:
        plan_limit = {
            "max_users": plan.max_users,
            "max_beds": plan.max_beds,
            "included_users": plan.included_users,
            "included_beds": plan.included_beds,
        }

    return {
        "active_users": active_users,
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "ai_triage_calls": 0,  # TODO: count from AITriageResult for current month
        "plan_limit": plan_limit,
    }


async def take_usage_snapshot(
    db: AsyncSession,
    tenant_id: UUID,
    period_start: datetime,
    period_end: datetime,
) -> UsageRecord:
    """Take a monthly usage snapshot for billing purposes."""
    usage = await get_current_usage(db, tenant_id)

    # Count patients admitted/discharged in the period
    patients_admitted = (await db.execute(
        select(func.count(Patient.id)).where(
            Patient.tenant_id == tenant_id,
            Patient.admitted_at >= period_start,
            Patient.admitted_at < period_end,
        )
    )).scalar() or 0

    patients_discharged = (await db.execute(
        select(func.count(Patient.id)).where(
            Patient.tenant_id == tenant_id,
            Patient.discharged_at >= period_start,
            Patient.discharged_at < period_end,
        )
    )).scalar() or 0

    record = UsageRecord(
        tenant_id=tenant_id,
        period_start=period_start,
        period_end=period_end,
        active_users=usage["active_users"],
        total_beds=usage["total_beds"],
        occupied_beds_avg=usage["occupied_beds"],
        patients_admitted=patients_admitted,
        patients_discharged=patients_discharged,
        ai_triage_calls=usage["ai_triage_calls"],
    )
    db.add(record)
    await db.flush()
    return record
