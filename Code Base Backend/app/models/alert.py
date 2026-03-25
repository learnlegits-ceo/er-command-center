from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class Alert(Base, TimestampMixin):
    """System alert."""
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False)  # critical, high, medium, low, info
    category = Column(String(50), nullable=False)
    status = Column(String(20), default="unread")  # unread, read, acknowledged, resolved, dismissed

    # Target
    for_roles = Column(ARRAY(Text))
    for_user_ids = Column(ARRAY(UUID(as_uuid=True)))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="SET NULL"))

    # Extra Data — Python attr 'extra_data' maps to SQL column 'metadata'
    extra_data = Column("metadata", JSONB)
    triggered_by = Column(String(50))
    threshold_info = Column(JSONB)

    # Action tracking
    read_at = Column(DateTime(timezone=True))
    read_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    acknowledged_at = Column(DateTime(timezone=True))
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    acknowledge_notes = Column(Text)
    resolved_at = Column(DateTime(timezone=True))
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolution = Column(Text)

    # Forwarding
    forwarded_to_roles = Column(ARRAY(Text))
    forwarded_at = Column(DateTime(timezone=True))
    forwarded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    forward_notes = Column(Text)

    # Relationships
    tenant = relationship("Tenant", back_populates="alerts")
    patient = relationship("Patient", back_populates="alerts")
    history = relationship("AlertHistory", back_populates="alert", lazy="dynamic", order_by="desc(AlertHistory.performed_at)")

    def __repr__(self):
        return f"<Alert {self.title} ({self.priority})>"


class AlertHistory(Base):
    """Alert status change history."""
    __tablename__ = "alert_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    old_status = Column(String(20))
    new_status = Column(String(20))
    notes = Column(Text)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    performed_at = Column(DateTime(timezone=True), server_default="now()")

    # Relationships
    alert = relationship("Alert", back_populates="history")
