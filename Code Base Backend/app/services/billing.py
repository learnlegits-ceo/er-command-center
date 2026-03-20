"""Billing service — invoice generation and amount calculation."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal

from app.models.tenant import Tenant
from app.models.subscription import SubscriptionPlan
from app.models.billing import Invoice, Payment
from app.models.usage import UsageRecord
from app.services.usage_tracker import take_usage_snapshot


def calculate_invoice_amount(plan: SubscriptionPlan, usage: UsageRecord) -> dict:
    """
    Pure function: compute invoice amounts from plan pricing and usage.
    Formula:
        extra_users = max(0, active_users - included_users)
        extra_beds  = max(0, total_beds - included_beds)
        subtotal    = base_price + (price_per_extra_user × extra_users) + (price_per_extra_bed × extra_beds)
        tax         = subtotal × 0.18 (GST)
        total       = subtotal + tax
    """
    included_users = plan.included_users if plan.included_users > 0 else usage.active_users
    included_beds = plan.included_beds if plan.included_beds > 0 else usage.total_beds

    extra_users = max(0, usage.active_users - included_users)
    extra_beds = max(0, usage.total_beds - included_beds)

    base_amount = Decimal(str(plan.base_price))
    user_amount = Decimal(str(plan.price_per_extra_user)) * extra_users
    bed_amount = Decimal(str(plan.price_per_extra_bed)) * extra_beds
    subtotal = base_amount + user_amount + bed_amount
    tax_rate = Decimal("18")
    tax_amount = (subtotal * tax_rate / Decimal("100")).quantize(Decimal("0.01"))
    total_amount = subtotal + tax_amount

    line_items = [
        {"description": f"{plan.name} Plan - Base", "quantity": 1, "unit_price": float(base_amount), "amount": float(base_amount)},
    ]
    if extra_users > 0:
        line_items.append({
            "description": f"Extra users ({extra_users} × ₹{plan.price_per_extra_user}/user)",
            "quantity": extra_users,
            "unit_price": float(plan.price_per_extra_user),
            "amount": float(user_amount),
        })
    if extra_beds > 0:
        line_items.append({
            "description": f"Extra beds ({extra_beds} × ₹{plan.price_per_extra_bed}/bed)",
            "quantity": extra_beds,
            "unit_price": float(plan.price_per_extra_bed),
            "amount": float(bed_amount),
        })

    return {
        "base_amount": base_amount,
        "user_amount": user_amount,
        "bed_amount": bed_amount,
        "subtotal": subtotal,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        "line_items": line_items,
    }


async def _next_invoice_number(db: AsyncSession, tenant_code: str) -> str:
    """Generate next sequential invoice number for a tenant."""
    year = datetime.utcnow().year
    prefix = f"INV-{tenant_code}-{year}-"

    result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.invoice_number.like(f"{prefix}%")
        )
    )
    count = (result.scalar() or 0) + 1
    return f"{prefix}{count:04d}"


async def generate_invoice(
    db: AsyncSession,
    tenant_id: UUID,
    period_start: datetime,
    period_end: datetime,
) -> Invoice:
    """Generate a monthly invoice for a tenant based on their plan and usage."""
    # Get tenant + plan
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise ValueError("Tenant not found")

    plan_result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id == tenant.plan_id)
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise ValueError("No subscription plan linked to tenant")

    # Take usage snapshot
    usage = await take_usage_snapshot(db, tenant_id, period_start, period_end)

    # Calculate amounts
    amounts = calculate_invoice_amount(plan, usage)

    # Generate invoice number
    invoice_number = await _next_invoice_number(db, tenant.code)

    invoice = Invoice(
        tenant_id=tenant_id,
        invoice_number=invoice_number,
        period_start=period_start,
        period_end=period_end,
        base_amount=amounts["base_amount"],
        user_amount=amounts["user_amount"],
        bed_amount=amounts["bed_amount"],
        subtotal=amounts["subtotal"],
        tax_rate=amounts["tax_rate"],
        tax_amount=amounts["tax_amount"],
        total_amount=amounts["total_amount"],
        currency="INR",
        status="draft",
        due_date=period_end + timedelta(days=15),
        line_items=amounts["line_items"],
        usage_record_id=usage.id,
    )
    db.add(invoice)

    # Update usage record with computed amount
    usage.computed_amount = amounts["total_amount"]

    await db.flush()
    return invoice


async def get_billing_summary(db: AsyncSession, tenant_id: UUID) -> dict:
    """Get billing summary for a hospital admin: current plan, recent invoices."""
    # Get plan
    plan_result = await db.execute(
        select(SubscriptionPlan)
        .join(Tenant, Tenant.plan_id == SubscriptionPlan.id)
        .where(Tenant.id == tenant_id)
    )
    plan = plan_result.scalar_one_or_none()

    plan_info = None
    if plan:
        plan_info = {
            "name": plan.name,
            "code": plan.code,
            "base_price": float(plan.base_price),
            "included_users": plan.included_users,
            "included_beds": plan.included_beds,
            "price_per_extra_user": float(plan.price_per_extra_user),
            "price_per_extra_bed": float(plan.price_per_extra_bed),
            "features": plan.features or {},
        }

    # Recent invoices
    invoices_result = await db.execute(
        select(Invoice).where(
            Invoice.tenant_id == tenant_id
        ).order_by(Invoice.created_at.desc()).limit(12)
    )
    invoices = invoices_result.scalars().all()

    # Outstanding amount
    outstanding_result = await db.execute(
        select(func.sum(Invoice.total_amount)).where(
            Invoice.tenant_id == tenant_id,
            Invoice.status.in_(["sent", "overdue"])
        )
    )
    outstanding = outstanding_result.scalar() or Decimal("0")

    return {
        "plan": plan_info,
        "outstanding_amount": float(outstanding),
        "invoices": [
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
        ],
    }
