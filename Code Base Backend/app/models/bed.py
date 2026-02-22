from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class Bed(Base, TimestampMixin):
    """Hospital bed."""
    __tablename__ = "beds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    bed_number = Column(String(20), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    bed_type = Column(String(30))  # icu, general, isolation, pediatric, maternity, emergency
    floor = Column(String(20))
    wing = Column(String(20))
    status = Column(String(20), default="available")  # available, occupied, maintenance, cleaning, reserved
    features = Column(ARRAY(Text))
    current_patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"))
    assigned_at = Column(String)
    is_active = Column(Boolean, default=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="beds")
    department = relationship("Department", back_populates="beds")
    current_patient = relationship("Patient", foreign_keys=[current_patient_id], uselist=False, overlaps="bed")
    assignments = relationship("BedAssignment", back_populates="bed", lazy="dynamic")

    def __repr__(self):
        return f"<Bed {self.bed_number} ({self.status})>"


class BedAssignment(Base):
    """Bed assignment history."""
    __tablename__ = "bed_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bed_id = Column(UUID(as_uuid=True), ForeignKey("beds.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(String, server_default="now()")
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    released_at = Column(String)
    released_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    release_reason = Column(String(50))
    notes = Column(Text)
    created_at = Column(String, server_default="now()")

    # Relationships
    bed = relationship("Bed", back_populates="assignments")
    patient = relationship("Patient", back_populates="bed_assignments")
