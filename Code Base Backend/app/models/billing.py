from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class Invoice(Base, TimestampMixin):
    """Monthly invoice for a tenant's subscription usage."""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)  # INV-CGH001-2026-0001

    # Billing period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Amount breakdown
    base_amount = Column(Numeric(10, 2), default=0)      # Plan base price
    user_amount = Column(Numeric(10, 2), default=0)       # Extra users charge
    bed_amount = Column(Numeric(10, 2), default=0)        # Extra beds charge
    subtotal = Column(Numeric(10, 2), default=0)
    tax_rate = Column(Numeric(5, 2), default=18)          # GST 18%
    tax_amount = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), default=0)
    currency = Column(String(3), default="INR")

    # Status
    status = Column(String(20), default="draft")  # draft, sent, paid, overdue, cancelled
    due_date = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))

    # Razorpay integration
    razorpay_order_id = Column(String(255))
    razorpay_payment_id = Column(String(255))
    razorpay_signature = Column(String(255))
    payment_method = Column(String(50))  # card, upi, netbanking, bank_transfer, manual

    # Detailed breakdown
    line_items = Column(JSONB, default=[])

    # Link to usage snapshot
    usage_record_id = Column(UUID(as_uuid=True), ForeignKey("usage_records.id"))

    # Relationships
    tenant = relationship("Tenant")
    usage_record = relationship("UsageRecord")

    def __repr__(self):
        return f"<Invoice {self.invoice_number} ({self.status})>"


class Payment(Base, TimestampMixin):
    """Payment record linked to an invoice."""
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)

    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="INR")

    # Razorpay
    razorpay_payment_id = Column(String(255))
    razorpay_order_id = Column(String(255))
    razorpay_signature = Column(String(255))
    method = Column(String(50))  # card, upi, netbanking

    status = Column(String(20), default="pending")  # pending, completed, failed, refunded
    paid_at = Column(DateTime(timezone=True))
    metadata = Column(JSONB, default={})

    # Relationships
    tenant = relationship("Tenant")
    invoice = relationship("Invoice")

    def __repr__(self):
        return f"<Payment {self.amount} {self.currency} ({self.status})>"
