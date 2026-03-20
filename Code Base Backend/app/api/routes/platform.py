"""Platform admin routes — manage hospitals, plans, team. Requires platform_admin role."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
import uuid as uuid_mod
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.models.user import User, UserSettings
from app.models.tenant import Tenant
from app.models.department import Department
from app.models.bed import Bed
from app.models.subscription import SubscriptionPlan
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantStatusUpdate
from app.schemas.subscription import SubscriptionPlanCreate, SubscriptionPlanUpdate
from app.models.billing import Invoice
from app.models.usage import UsageRecord
from app.core.dependencies import require_platform_admin
from app.core.security import get_password_hash
from app.services.onboarding import onboard_hospital
from app.services.usage_tracker import get_current_usage
from app.services.billing import generate_invoice

router = APIRouter()


# ─── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def platform_dashboard(
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Platform-wide stats for the dashboard."""
    total_hospitals = (await db.execute(
        select(func.count(Tenant.id)).where(Tenant.is_active == True)
    )).scalar() or 0

    total_users = (await db.execute(
        select(func.count(User.id)).where(
            User.deleted_at.is_(None),
            User.role != "platform_admin"
        )
    )).scalar() or 0

    total_beds = (await db.execute(
        select(func.count(Bed.id)).where(Bed.is_active == True)
    )).scalar() or 0

    occupied_beds = (await db.execute(
        select(func.count(Bed.id)).where(
            Bed.is_active == True,
            Bed.status == "occupied"
        )
    )).scalar() or 0

    # Hospitals by plan
    plan_breakdown_result = await db.execute(
        select(
            SubscriptionPlan.name,
            func.count(Tenant.id)
        )
        .outerjoin(Tenant, Tenant.plan_id == SubscriptionPlan.id)
        .where(SubscriptionPlan.is_active == True)
        .group_by(SubscriptionPlan.name, SubscriptionPlan.sort_order)
        .order_by(SubscriptionPlan.sort_order)
    )
    hospitals_by_plan = [
        {"plan": row[0], "count": row[1] or 0}
        for row in plan_breakdown_result.all()
    ]

    # Recent signups (last 10)
    recent_result = await db.execute(
        select(Tenant)
        .where(Tenant.is_active == True)
        .order_by(Tenant.created_at.desc())
        .limit(10)
    )
    recent_signups = [
        {
            "id": str(t.id),
            "name": t.name,
            "code": t.code,
            "subscription_status": t.subscription_status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in recent_result.scalars().all()
    ]

    return {
        "success": True,
        "data": {
            "total_hospitals": total_hospitals,
            "total_users": total_users,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "hospitals_by_plan": hospitals_by_plan,
            "recent_signups": recent_signups,
        }
    }


# ─── Hospital (Tenant) Management ───────────────────────────────────────────

@router.get("/hospitals")
async def list_hospitals(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all hospitals with stats."""
    query = select(Tenant).where(Tenant.is_active == True)

    if search:
        query = query.where(
            Tenant.name.ilike(f"%{search}%") | Tenant.code.ilike(f"%{search}%")
        )
    if status_filter:
        query = query.where(Tenant.subscription_status == status_filter)
    if plan:
        query = query.join(SubscriptionPlan).where(SubscriptionPlan.code == plan)

    query = query.order_by(Tenant.created_at.desc())
    result = await db.execute(query)
    tenants = result.scalars().all()

    hospitals = []
    for t in tenants:
        # Get counts
        user_count = (await db.execute(
            select(func.count(User.id)).where(
                User.tenant_id == t.id,
                User.deleted_at.is_(None),
                User.role != "platform_admin"
            )
        )).scalar() or 0

        bed_count = (await db.execute(
            select(func.count(Bed.id)).where(
                Bed.tenant_id == t.id,
                Bed.is_active == True
            )
        )).scalar() or 0

        # Get plan name
        plan_name = None
        if t.plan_id:
            plan_result = await db.execute(
                select(SubscriptionPlan.name).where(SubscriptionPlan.id == t.plan_id)
            )
            plan_name = plan_result.scalar()

        hospitals.append({
            "id": str(t.id),
            "name": t.name,
            "code": t.code,
            "plan_name": plan_name,
            "subscription_status": t.subscription_status,
            "is_active": t.is_active,
            "user_count": user_count,
            "bed_count": bed_count,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {"success": True, "data": hospitals}


@router.post("/hospitals", status_code=status.HTTP_201_CREATED)
async def create_hospital(
    request: TenantCreate,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new hospital with admin user, departments, and beds."""
    try:
        result = await onboard_hospital(
            db,
            name=request.name,
            code=request.code,
            plan_id=request.plan_id,
            admin_name=request.initial_admin.name,
            admin_email=request.initial_admin.email,
            admin_password=request.initial_admin.password,
            domain=request.domain,
            logo_url=request.logo_url,
            address=request.address,
            phone=request.phone,
            email=request.email,
            admin_phone=request.initial_admin.phone,
        )
        return {"success": True, "data": result, "message": "Hospital onboarded successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/hospitals/{hospital_id}")
async def get_hospital(
    hospital_id: UUID,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get hospital details with stats."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == hospital_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Hospital not found")

    # Counts
    user_count = (await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == hospital_id,
            User.deleted_at.is_(None),
            User.role != "platform_admin"
        )
    )).scalar() or 0

    bed_count = (await db.execute(
        select(func.count(Bed.id)).where(
            Bed.tenant_id == hospital_id,
            Bed.is_active == True
        )
    )).scalar() or 0

    dept_count = (await db.execute(
        select(func.count(Department.id)).where(
            Department.tenant_id == hospital_id,
            Department.is_active == True
        )
    )).scalar() or 0

    # Plan info
    plan_data = None
    if tenant.plan_id:
        plan_result = await db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.id == tenant.plan_id)
        )
        plan = plan_result.scalar_one_or_none()
        if plan:
            plan_data = {
                "id": str(plan.id),
                "name": plan.name,
                "code": plan.code,
                "base_price": float(plan.base_price),
                "max_users": plan.max_users,
                "max_beds": plan.max_beds,
            }

    return {
        "success": True,
        "data": {
            "id": str(tenant.id),
            "name": tenant.name,
            "code": tenant.code,
            "domain": tenant.domain,
            "logo_url": tenant.logo_url,
            "address": tenant.address,
            "phone": tenant.phone,
            "email": tenant.email,
            "plan": plan_data,
            "subscription_status": tenant.subscription_status,
            "subscription_starts_at": tenant.subscription_starts_at.isoformat() if tenant.subscription_starts_at else None,
            "subscription_ends_at": tenant.subscription_ends_at.isoformat() if tenant.subscription_ends_at else None,
            "is_active": tenant.is_active,
            "user_count": user_count,
            "bed_count": bed_count,
            "department_count": dept_count,
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        }
    }


@router.put("/hospitals/{hospital_id}")
async def update_hospital(
    hospital_id: UUID,
    request: TenantUpdate,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update hospital profile."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == hospital_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Hospital not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    await db.commit()
    return {"success": True, "message": "Hospital updated"}


@router.patch("/hospitals/{hospital_id}/status")
async def update_hospital_status(
    hospital_id: UUID,
    request: TenantStatusUpdate,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Activate, suspend, or deactivate a hospital."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == hospital_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Hospital not found")

    tenant.subscription_status = request.status
    if request.status == "suspended":
        tenant.is_active = False
    elif request.status == "active":
        tenant.is_active = True

    await db.commit()
    return {"success": True, "message": f"Hospital status updated to {request.status}"}


@router.delete("/hospitals/{hospital_id}")
async def delete_hospital(
    hospital_id: UUID,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Soft-delete a hospital (mark inactive)."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == hospital_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Hospital not found")

    tenant.is_active = False
    tenant.subscription_status = "inactive"
    await db.commit()
    return {"success": True, "message": "Hospital deactivated"}


# ─── Plan Management ────────────────────────────────────────────────────────

@router.get("/plans")
async def list_plans(
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all subscription plans."""
    result = await db.execute(
        select(SubscriptionPlan).order_by(SubscriptionPlan.sort_order)
    )
    plans = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(p.id),
                "name": p.name,
                "code": p.code,
                "description": p.description,
                "included_users": p.included_users,
                "included_beds": p.included_beds,
                "max_users": p.max_users,
                "max_beds": p.max_beds,
                "max_departments": p.max_departments,
                "base_price": float(p.base_price),
                "price_per_extra_user": float(p.price_per_extra_user),
                "price_per_extra_bed": float(p.price_per_extra_bed),
                "annual_discount_percent": p.annual_discount_percent,
                "billing_cycle": p.billing_cycle,
                "currency": p.currency,
                "features": p.features or {},
                "is_active": p.is_active,
                "sort_order": p.sort_order,
            }
            for p in plans
        ]
    }


@router.post("/plans", status_code=status.HTTP_201_CREATED)
async def create_plan(
    request: SubscriptionPlanCreate,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new subscription plan."""
    # Check uniqueness
    existing = await db.execute(
        select(SubscriptionPlan.id).where(
            (SubscriptionPlan.name == request.name) | (SubscriptionPlan.code == request.code)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Plan name or code already exists")

    plan = SubscriptionPlan(**request.model_dump())
    db.add(plan)
    await db.commit()

    return {"success": True, "data": {"id": str(plan.id)}, "message": "Plan created"}


@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: UUID,
    request: SubscriptionPlanUpdate,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update a subscription plan."""
    result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    await db.commit()
    return {"success": True, "message": "Plan updated"}


@router.delete("/plans/{plan_id}")
async def deactivate_plan(
    plan_id: UUID,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a plan (don't delete — existing tenants may reference it)."""
    result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan.is_active = False
    await db.commit()
    return {"success": True, "message": "Plan deactivated"}


# ─── Platform Team Management ───────────────────────────────────────────────

@router.get("/team")
async def list_platform_team(
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all platform admin users."""
    result = await db.execute(
        select(User).where(
            User.role == "platform_admin",
            User.deleted_at.is_(None)
        ).order_by(User.name)
    )
    team = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "status": u.status,
                "last_active_at": u.last_active_at.isoformat() if u.last_active_at else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in team
        ]
    }


@router.post("/team", status_code=status.HTTP_201_CREATED)
async def invite_platform_admin(
    name: str = Query(...),
    email: str = Query(...),
    password: str = Query(...),
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new platform admin user."""
    existing = await db.execute(
        select(User.id).where(User.email == email, User.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already in use")

    user = User(
        id=uuid_mod.uuid4(),
        tenant_id=None,
        email=email,
        password_hash=get_password_hash(password),
        name=name,
        role="platform_admin",
        status="active",
    )
    db.add(user)

    settings = UserSettings(user_id=user.id)
    db.add(settings)

    await db.commit()
    return {"success": True, "data": {"id": str(user.id)}, "message": "Platform admin created"}


@router.delete("/team/{user_id}")
async def remove_platform_admin(
    user_id: UUID,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Remove a platform admin (soft delete)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.role == "platform_admin",
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Platform admin not found")

    user.deleted_at = datetime.utcnow()
    user.status = "inactive"
    await db.commit()
    return {"success": True, "message": "Platform admin removed"}


# ─── Billing & Usage (Platform Admin) ───────────────────────────────────────

@router.get("/billing/overview")
async def billing_overview(
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Revenue overview across all hospitals."""
    from decimal import Decimal

    total_revenue = (await db.execute(
        select(func.sum(Invoice.total_amount)).where(Invoice.status == "paid")
    )).scalar() or Decimal("0")

    outstanding = (await db.execute(
        select(func.sum(Invoice.total_amount)).where(
            Invoice.status.in_(["sent", "overdue"])
        )
    )).scalar() or Decimal("0")

    paid_count = (await db.execute(
        select(func.count(Invoice.id)).where(Invoice.status == "paid")
    )).scalar() or 0

    pending_count = (await db.execute(
        select(func.count(Invoice.id)).where(Invoice.status.in_(["draft", "sent"]))
    )).scalar() or 0

    overdue_count = (await db.execute(
        select(func.count(Invoice.id)).where(Invoice.status == "overdue")
    )).scalar() or 0

    return {
        "success": True,
        "data": {
            "total_revenue": float(total_revenue),
            "outstanding_amount": float(outstanding),
            "paid_invoices": paid_count,
            "pending_invoices": pending_count,
            "overdue_invoices": overdue_count,
        }
    }


@router.get("/hospitals/{hospital_id}/invoices")
async def get_hospital_invoices(
    hospital_id: UUID,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """View a hospital's invoices."""
    result = await db.execute(
        select(Invoice).where(
            Invoice.tenant_id == hospital_id
        ).order_by(Invoice.created_at.desc())
    )
    invoices = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "period_start": inv.period_start.isoformat() if inv.period_start else None,
                "period_end": inv.period_end.isoformat() if inv.period_end else None,
                "total_amount": float(inv.total_amount),
                "currency": inv.currency,
                "status": inv.status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            }
            for inv in invoices
        ]
    }


@router.post("/billing/generate-invoices")
async def generate_all_invoices(
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Generate invoices for all active hospitals for the current month."""
    from datetime import timedelta

    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        period_end = period_start.replace(year=now.year + 1, month=1)
    else:
        period_end = period_start.replace(month=now.month + 1)

    # Get all active tenants with plans
    result = await db.execute(
        select(Tenant).where(
            Tenant.is_active == True,
            Tenant.plan_id.isnot(None),
        )
    )
    tenants = result.scalars().all()

    generated = 0
    skipped = 0
    errors = []

    for tenant in tenants:
        # Check if invoice already exists for this period
        existing = await db.execute(
            select(Invoice.id).where(
                Invoice.tenant_id == tenant.id,
                Invoice.period_start == period_start,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        try:
            await generate_invoice(db, tenant.id, period_start, period_end)
            generated += 1
        except Exception as e:
            errors.append({"tenant": tenant.code, "error": str(e)})

    await db.commit()

    return {
        "success": True,
        "data": {
            "generated": generated,
            "skipped": skipped,
            "errors": errors,
        },
        "message": f"Generated {generated} invoices. {skipped} already existed."
    }


@router.post("/hospitals/{hospital_id}/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(
    hospital_id: UUID,
    invoice_id: UUID,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Manually mark an invoice as paid (for bank transfers, etc.)."""
    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.tenant_id == hospital_id,
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = "paid"
    invoice.paid_at = datetime.utcnow()
    invoice.payment_method = "manual"

    await db.commit()
    return {"success": True, "message": "Invoice marked as paid"}


@router.get("/hospitals/{hospital_id}/usage")
async def get_hospital_usage(
    hospital_id: UUID,
    current_user: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """View a hospital's current usage."""
    usage = await get_current_usage(db, hospital_id)
    return {"success": True, "data": usage}
