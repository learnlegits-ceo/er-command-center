from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid

from app.db.database import Base


class AITriageResult(Base):
    """AI triage results from Groq LLM."""
    __tablename__ = "ai_triage_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="SET NULL"))

    # Input Data sent to Groq
    input_complaint = Column(Text, nullable=False)
    input_vitals = Column(JSONB)
    input_age = Column(Integer)
    input_gender = Column(String(10))
    input_history = Column(Text)

    # Groq LLM Output
    priority = Column(Integer)  # 1-5
    priority_label = Column(String(20))  # Critical, High, Medium, Low, Stable
    priority_color = Column(String(20))  # red, orange, yellow, green, blue
    confidence = Column(Numeric(4, 3))  # 0.000 - 1.000
    reasoning = Column(Text)
    recommendations = Column(ARRAY(Text))
    suggested_department = Column(String(100))
    estimated_wait_time = Column(String(50))

    # Groq API Metadata
    groq_model = Column(String(100), default="llama-3.3-70b-versatile")
    groq_request_id = Column(String(100))
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_tokens = Column(Integer)
    processing_time_ms = Column(Integer)
    temperature = Column(Numeric(3, 2))

    # Status
    is_applied = Column(Boolean, default=False)
    applied_at = Column(String)
    applied_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    override_priority = Column(Integer)
    override_reason = Column(Text)

    created_at = Column(String, server_default="now()")

    # Relationships
    from sqlalchemy.orm import relationship
    patient = relationship("Patient", back_populates="triage_results")

    def __repr__(self):
        return f"<AITriageResult P{self.priority} for patient {self.patient_id}>"
