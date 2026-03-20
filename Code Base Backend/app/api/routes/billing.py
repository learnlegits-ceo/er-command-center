"""Billing routes — hospital admin views invoices; Razorpay webhook."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime
import hmac
import hashlib

from app.db.database import get_db
from app.models.user import User
from app.models.billing import Invoice, Payment
from app.core.dependencies import require_admin
from app.core.config import settings
from app.services.billing import get_billing_summary

router = APIRouter()


@router.get("/current")
async def get_current_billing(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get billing summary: current plan, usage, invoices."""
    summary = await get_billing_summary(db, current_user.tenant_id)
    return {"success": True, "data": summary}


@router.get("/invoices")
async def list_invoices(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all invoices for this hospital."""
    result = await db.execute(
        select(Invoice).where(
            Invoice.tenant_id == current_user.tenant_id
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
                "base_amount": float(inv.base_amount),
                "user_amount": float(inv.user_amount),
                "bed_amount": float(inv.bed_amount),
                "subtotal": float(inv.subtotal),
                "tax_rate": float(inv.tax_rate),
                "tax_amount": float(inv.tax_amount),
                "total_amount": float(inv.total_amount),
                "currency": inv.currency,
                "status": inv.status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
                "payment_method": inv.payment_method,
                "line_items": inv.line_items or [],
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            }
            for inv in invoices
        ]
    }


@router.get("/invoices/{invoice_id}")
async def get_invoice_detail(
    invoice_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed invoice."""
    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "success": True,
        "data": {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "period_start": inv.period_start.isoformat() if inv.period_start else None,
            "period_end": inv.period_end.isoformat() if inv.period_end else None,
            "base_amount": float(inv.base_amount),
            "user_amount": float(inv.user_amount),
            "bed_amount": float(inv.bed_amount),
            "subtotal": float(inv.subtotal),
            "tax_rate": float(inv.tax_rate),
            "tax_amount": float(inv.tax_amount),
            "total_amount": float(inv.total_amount),
            "currency": inv.currency,
            "status": inv.status,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            "payment_method": inv.payment_method,
            "razorpay_order_id": inv.razorpay_order_id,
            "line_items": inv.line_items or [],
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }
    }


@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Razorpay payment confirmation webhook. No auth required — signature verified."""
    body = await request.json()

    razorpay_order_id = body.get("razorpay_order_id")
    razorpay_payment_id = body.get("razorpay_payment_id")
    razorpay_signature = body.get("razorpay_signature")

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment fields")

    # Verify signature
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if key_secret:
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected_signature = hmac.new(
            key_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if expected_signature != razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")

    # Find the invoice by razorpay_order_id
    result = await db.execute(
        select(Invoice).where(Invoice.razorpay_order_id == razorpay_order_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found for this order")

    # Mark invoice as paid
    invoice.status = "paid"
    invoice.paid_at = datetime.utcnow()
    invoice.razorpay_payment_id = razorpay_payment_id
    invoice.razorpay_signature = razorpay_signature

    # Create payment record
    payment = Payment(
        tenant_id=invoice.tenant_id,
        invoice_id=invoice.id,
        amount=invoice.total_amount,
        currency=invoice.currency,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_order_id=razorpay_order_id,
        razorpay_signature=razorpay_signature,
        status="completed",
        paid_at=datetime.utcnow(),
    )
    db.add(payment)

    await db.commit()
    return {"success": True, "message": "Payment recorded"}
