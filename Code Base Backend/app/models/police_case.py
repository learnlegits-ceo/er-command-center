from sqlalchemy import Column, String, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class PoliceCase(Base, TimestampMixin):
    """Medico-Legal Case (MLC) tracking."""
    __tablename__ = "police_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    case_number = Column(String(50))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    patient_name = Column(String(255), nullable=False)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id"))

    # Case Details
    case_type = Column(String(50), nullable=False)  # road_accident, assault, domestic_violence, burn, poisoning, suicide_attempt, unknown_identity, other
    case_type_label = Column(String(100))
    description = Column(Text)
    complaint = Column(Text)

    # Status
    status = Column(String(30), default="pending")  # pending, police_notified, police_contacted, under_investigation, resolved, closed

    # Reporting
    reported_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reported_at = Column(String, server_default="now()")

    # Police Contact
    police_contacted = Column(Boolean, default=False)
    police_contacted_at = Column(String)
    police_contacted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    police_station = Column(String(255))
    officer_name = Column(String(255))
    officer_phone = Column(String(20))
    fir_number = Column(String(100))

    # Resolution
    resolved_at = Column(String)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolution = Column(Text)

    # Relationships
    tenant = relationship("Tenant", back_populates="police_cases")

    def __repr__(self):
        return f"<PoliceCase {self.case_number} ({self.case_type})>"
