from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class UsageRecord(Base, TimestampMixin):
    """Monthly usage snapshot for a tenant — used for billing calculations."""
    __tablename__ = "usage_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    # Billing period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Usage metrics
    active_users = Column(Integer, default=0)
    total_beds = Column(Integer, default=0)
    occupied_beds_avg = Column(Integer, default=0)
    patients_admitted = Column(Integer, default=0)
    patients_discharged = Column(Integer, default=0)
    ai_triage_calls = Column(Integer, default=0)

    # Computed billing amount for this period
    computed_amount = Column(Numeric(10, 2), default=0)

    snapshot_taken_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tenant = relationship("Tenant")

    def __repr__(self):
        return f"<UsageRecord tenant={self.tenant_id} period={self.period_start}>"
