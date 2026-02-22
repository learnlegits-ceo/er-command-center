from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, Date, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin, SoftDeleteMixin


class Patient(Base, TimestampMixin, SoftDeleteMixin):
    """Patient record."""
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    age = Column(Integer)
    date_of_birth = Column(Date)
    gender = Column(String(10))  # M, F, Other
    phone = Column(String(20))
    emergency_contact = Column(String(20))
    emergency_contact_name = Column(String(255))
    emergency_contact_relation = Column(String(50))
    address = Column(Text)
    blood_group = Column(String(5))
    photo_url = Column(Text)

    # Chief Complaint & History
    complaint = Column(Text)
    history = Column(Text)

    # Status & Priority (from AI Triage)
    status = Column(String(30), default="pending_triage")
    priority = Column(Integer)
    priority_label = Column(String(20))
    priority_color = Column(String(20))

    # Location
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    bed_id = Column(UUID(as_uuid=True), ForeignKey("beds.id"))

    # Assigned Staff
    assigned_doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    assigned_nurse_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Police Case
    is_police_case = Column(Boolean, default=False)
    police_case_type = Column(String(50))

    # Admission & Discharge
    admitted_at = Column(DateTime(timezone=True))
    admitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    discharged_at = Column(DateTime(timezone=True))
    discharged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    discharge_notes = Column(Text)
    follow_up_date = Column(Date)

    # Unique Health Identifiers
    uhi = Column(String(20))   # Universal Health ID
    euhi = Column(String(30))  # Encounter-specific Universal Health ID

    # FHIR Integration
    fhir_resource_id = Column(String(100))
    external_mrn = Column(String(50))

    # Relationships
    tenant = relationship("Tenant", back_populates="patients")
    department = relationship("Department", back_populates="patients")
    bed = relationship("Bed", foreign_keys=[bed_id], uselist=False, overlaps="current_patient")
    assigned_doctor = relationship("User", foreign_keys=[assigned_doctor_id], back_populates="assigned_patients_as_doctor")
    assigned_nurse = relationship("User", foreign_keys=[assigned_nurse_id], back_populates="assigned_patients_as_nurse")

    allergies = relationship("PatientAllergy", back_populates="patient", lazy="dynamic")
    vitals = relationship("PatientVitals", back_populates="patient", lazy="dynamic", order_by="desc(PatientVitals.recorded_at)")
    notes = relationship("PatientNote", back_populates="patient", lazy="dynamic", order_by="desc(PatientNote.created_at)")
    triage_results = relationship("AITriageResult", back_populates="patient", lazy="dynamic")
    prescriptions = relationship("Prescription", back_populates="patient", lazy="dynamic")
    alerts = relationship("Alert", back_populates="patient", lazy="dynamic")
    bed_assignments = relationship("BedAssignment", back_populates="patient", lazy="dynamic")

    def __repr__(self):
        return f"<Patient {self.patient_id}: {self.name}>"


class PatientAllergy(Base):
    """Patient allergy record."""
    __tablename__ = "patient_allergies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    allergen = Column(String(255), nullable=False)
    severity = Column(String(20))  # mild, moderate, severe, life_threatening
    reaction = Column(Text)
    notes = Column(Text)
    reported_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(String, server_default="now()")

    # Relationships
    patient = relationship("Patient", back_populates="allergies")


class PatientVitals(Base):
    """Patient vital signs."""
    __tablename__ = "patient_vitals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)

    # Vital Signs
    heart_rate = Column(Integer)
    blood_pressure_systolic = Column(Integer)
    blood_pressure_diastolic = Column(Integer)
    blood_pressure = Column(String(10))
    spo2 = Column(Numeric(5, 2))
    temperature = Column(Numeric(5, 2))
    respiratory_rate = Column(Integer)
    blood_glucose = Column(Numeric(6, 2))
    pain_level = Column(Integer)

    # Additional
    notes = Column(Text)
    is_critical = Column(Boolean, default=False)
    alert_generated = Column(Boolean, default=False)

    # Source
    source = Column(String(20), default="manual")  # manual, ocr, device, import
    ocr_confidence = Column(JSONB)
    raw_ocr_text = Column(Text)

    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    recorded_at = Column(String, server_default="now()")
    created_at = Column(String, server_default="now()")

    # Relationships
    patient = relationship("Patient", back_populates="vitals")


class PatientNote(Base, TimestampMixin, SoftDeleteMixin):
    """Patient clinical notes."""
    __tablename__ = "patient_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    note_type = Column(String(20), nullable=False)  # nurse, doctor, admin, system, discharge
    content = Column(Text, nullable=False)
    is_confidential = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    patient = relationship("Patient", back_populates="notes")
