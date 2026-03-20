from sqlalchemy import Column, String, Boolean, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class BedTypePricing(Base, TimestampMixin):
    """Per-hospital bed type pricing — hospital admin sets cost per day for each bed type."""
    __tablename__ = "bed_type_pricing"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    bed_type = Column(String(30), nullable=False)  # icu, general, isolation, pediatric, maternity, emergency, daycare, observation
    cost_per_day = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="INR")
    is_active = Column(Boolean, default=True)

    # One price per bed type per hospital
    __table_args__ = (
        UniqueConstraint("tenant_id", "bed_type", name="uq_bed_pricing_tenant_type"),
    )

    # Relationships
    tenant = relationship("Tenant")

    def __repr__(self):
        return f"<BedTypePricing {self.bed_type} @ {self.cost_per_day}/day>"
