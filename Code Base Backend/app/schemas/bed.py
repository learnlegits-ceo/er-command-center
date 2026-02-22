from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class PatientBrief(BaseModel):
    """Brief patient info for bed."""
    id: UUID
    name: str

    class Config:
        from_attributes = True


class BedResponse(BaseModel):
    """Bed response schema."""
    id: UUID
    bed_number: str
    department: Optional[str] = None
    department_id: Optional[UUID] = None
    bed_type: Optional[str] = None
    floor: Optional[str] = None
    wing: Optional[str] = None
    status: str
    features: Optional[List[str]] = None
    patient: Optional[PatientBrief] = None
    assigned_at: Optional[str] = None

    class Config:
        from_attributes = True


class BedAssignRequest(BaseModel):
    """Assign bed request."""
    patient_id: UUID


class BedReleaseResponse(BaseModel):
    """Bed release response."""
    success: bool = True
    data: dict


class BedStatusUpdate(BaseModel):
    """Update bed status."""
    status: str  # available, occupied, maintenance, cleaning, reserved
