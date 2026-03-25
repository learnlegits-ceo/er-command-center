from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

VALID_CASE_TYPES = (
    "road_accident", "assault", "domestic_violence", "burn",
    "poisoning", "suicide_attempt", "unknown_identity", "other"
)


class PoliceCaseCreate(BaseModel):
    """Create police case request."""
    patient_id: UUID
    patient_name: str
    case_type: str
    description: Optional[str] = None
    complaint: Optional[str] = None

    @field_validator("case_type")
    @classmethod
    def validate_case_type(cls, v: str) -> str:
        if v not in VALID_CASE_TYPES:
            raise ValueError(f"Invalid case type. Must be one of: {', '.join(VALID_CASE_TYPES)}")
        return v


class PoliceCaseResponse(BaseModel):
    """Police case response schema."""
    id: UUID
    case_number: Optional[str] = None
    patient_id: UUID
    patient_name: str
    case_type: str
    case_type_label: Optional[str] = None
    description: Optional[str] = None
    complaint: Optional[str] = None
    status: str
    reported_by: Optional[str] = None
    reported_at: Optional[datetime] = None
    police_contacted: bool = False
    police_contacted_at: Optional[datetime] = None
    police_contacted_by: Optional[str] = None
    police_station: Optional[str] = None
    officer_name: Optional[str] = None
    officer_phone: Optional[str] = None
    fir_number: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None

    class Config:
        from_attributes = True


class PoliceContactRequest(BaseModel):
    """Contact police request."""
    police_station: str
    officer_name: Optional[str] = None
    officer_phone: Optional[str] = None
    fir_number: Optional[str] = None
    notes: Optional[str] = None


class PoliceCaseResolveRequest(BaseModel):
    """Resolve police case request."""
    resolution: str
    fir_number: Optional[str] = None
