from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class UsageStatsResponse(BaseModel):
    """Current usage stats for a hospital."""
    active_users: int
    total_beds: int
    occupied_beds: int
    ai_triage_calls: int = 0
    plan_limit: Dict[str, Any] = {}  # {max_users, max_beds, included_users, included_beds}


class UsageRecordResponse(BaseModel):
    """Historical usage record."""
    id: UUID
    period_start: datetime
    period_end: datetime
    active_users: int
    total_beds: int
    occupied_beds_avg: int
    patients_admitted: int
    patients_discharged: int
    ai_triage_calls: int
    computed_amount: Decimal
    snapshot_taken_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceLineItem(BaseModel):
    """Single line item in an invoice."""
    description: str
    quantity: int = 1
    unit_price: Decimal
    amount: Decimal


class InvoiceResponse(BaseModel):
    """Invoice response."""
    id: UUID
    invoice_number: str
    period_start: datetime
    period_end: datetime
    base_amount: Decimal
    user_amount: Decimal
    bed_amount: Decimal
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str
    status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    line_items: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceSummary(BaseModel):
    """Lightweight invoice for list views."""
    id: UUID
    invoice_number: str
    period_start: datetime
    period_end: datetime
    total_amount: Decimal
    currency: str
    status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BillingOverview(BaseModel):
    """Platform-wide billing overview."""
    total_revenue: Decimal = Decimal("0")
    outstanding_amount: Decimal = Decimal("0")
    paid_invoices: int = 0
    pending_invoices: int = 0
    overdue_invoices: int = 0


class RazorpayWebhookPayload(BaseModel):
    """Razorpay payment webhook payload."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
