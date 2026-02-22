from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class Prescription(Base, TimestampMixin):
    """Patient prescription with MCP medication lookup support."""
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)

    # Medication info (populated via MCP medication lookup)
    medication_name = Column(String(255), nullable=False)
    medication_code = Column(String(50))
    medication_form = Column(String(50))  # tablet, capsule, injection, etc.
    generic_name = Column(String(255))

    # Dosage details
    dosage = Column(String(100), nullable=False)
    dosage_unit = Column(String(20))
    frequency = Column(String(100), nullable=False)
    route = Column(String(50))  # oral, IV, IM, etc.
    duration = Column(String(100))
    quantity = Column(Integer)
    refills = Column(Integer, default=0)

    # Instructions
    instructions = Column(Text)
    special_instructions = Column(Text)

    # Status
    status = Column(String(20), default="active")  # active, completed, discontinued, on_hold
    start_date = Column(Date)
    end_date = Column(Date)

    # MCP Metadata (medication lookup)
    mcp_source = Column(String(50))
    mcp_drug_id = Column(String(100))
    drug_interactions = Column(JSONB)
    contraindications = Column(ARRAY(Text))

    # Prescriber info
    prescribed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    prescribed_at = Column(String, server_default="now()")

    # Discontinuation
    discontinued_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    discontinued_at = Column(String)
    discontinue_reason = Column(Text)

    # Relationships
    patient = relationship("Patient", back_populates="prescriptions")

    def __repr__(self):
        return f"<Prescription {self.medication_name} for patient {self.patient_id}>"
