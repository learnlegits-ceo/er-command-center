from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, date
from uuid import UUID


class VitalsInput(BaseModel):
    """Vitals input for patient registration."""
    hr: Optional[str] = None
    bp: Optional[str] = None
    spo2: Optional[str] = None
    temp: Optional[str] = None
    respiratory_rate: Optional[str] = None


class PatientCreate(BaseModel):
    """Create patient request."""
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    complaint: str
    vitals: Optional[VitalsInput] = None
    is_police_case: bool = False
    police_case_type: Optional[str] = None
    history: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    department_id: Optional[UUID] = None
    assigned_doctor_id: Optional[UUID] = None
    bed_id: Optional[UUID] = None
    auto_assign_bed: bool = True


class PatientUpdate(BaseModel):
    """Update patient request."""
    name: Optional[str] = None
    complaint: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    status: Optional[str] = None
    bed_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    assigned_doctor_id: Optional[UUID] = None
    assigned_nurse_id: Optional[UUID] = None
    history: Optional[str] = None


class AssignedStaffResponse(BaseModel):
    """Assigned staff info."""
    id: UUID
    name: str

    class Config:
        from_attributes = True


class PatientVitalsResponse(BaseModel):
    """Patient vitals in response."""
    hr: Optional[int] = None
    bp: Optional[str] = None
    spo2: Optional[float] = None
    temp: Optional[float] = None
    respiratory_rate: Optional[int] = None
    recorded_at: Optional[datetime] = None


class PatientResponse(BaseModel):
    """Patient response schema."""
    id: UUID
    patient_id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    photo_url: Optional[str] = None
    complaint: Optional[str] = None
    history: Optional[str] = None
    allergies: Optional[List[str]] = None
    status: str
    priority: Optional[int] = None
    priority_label: Optional[str] = None
    priority_color: Optional[str] = None
    department: Optional[str] = None
    bed: Optional[str] = None
    assigned_doctor: Optional[AssignedStaffResponse] = None
    assigned_nurse: Optional[AssignedStaffResponse] = None
    vitals: Optional[PatientVitalsResponse] = None
    is_police_case: bool = False
    police_case_type: Optional[str] = None
    admitted_at: Optional[datetime] = None
    discharged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    """Patient list response."""
    success: bool = True
    data: dict


class PatientDischargeRequest(BaseModel):
    """Discharge patient request."""
    discharge_notes: str
    prescriptions: Optional[List[dict]] = None
    follow_up_date: Optional[date] = None
