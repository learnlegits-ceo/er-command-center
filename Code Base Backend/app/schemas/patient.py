from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any, Literal
from datetime import datetime, date
from uuid import UUID


VALID_BLOOD_GROUPS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
VALID_GENDERS = ("M", "F", "O", "male", "female", "other")


class VitalsInput(BaseModel):
    """Vitals input for patient registration."""
    hr: Optional[str] = None
    bp: Optional[str] = None
    spo2: Optional[str] = None
    temp: Optional[str] = None
    respiratory_rate: Optional[str] = None


class PatientCreate(BaseModel):
    """Create patient request."""
    name: str = Field(..., min_length=1, max_length=200)
    age: Optional[int] = Field(None, ge=0, le=150, description="Patient age in years")
    gender: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    emergency_contact: Optional[str] = Field(None, max_length=20)
    complaint: str = Field(..., min_length=1)
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

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip()

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_BLOOD_GROUPS:
            raise ValueError(f"Invalid blood group. Must be one of: {', '.join(VALID_BLOOD_GROUPS)}")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.lower() not in ("m", "f", "o", "male", "female", "other"):
            raise ValueError("Gender must be one of: M, F, O, male, female, other")
        return v


class PatientUpdate(BaseModel):
    """Update patient request."""
    name: Optional[str] = None
    complaint: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    blood_group: Optional[str] = None
    status: Optional[str] = None
    bed_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    assigned_doctor_id: Optional[UUID] = None
    assigned_nurse_id: Optional[UUID] = None
    history: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip() if v else v

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_BLOOD_GROUPS:
            raise ValueError(f"Invalid blood group. Must be one of: {', '.join(VALID_BLOOD_GROUPS)}")
        return v


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
