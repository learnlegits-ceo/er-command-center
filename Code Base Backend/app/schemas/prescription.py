from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


class PrescriptionCreate(BaseModel):
    """Create prescription request."""
    medication_name: str = Field(..., min_length=1, max_length=200)
    medication_code: Optional[str] = None
    medication_form: Optional[str] = None
    generic_name: Optional[str] = None
    dosage: str = Field(..., min_length=1, max_length=100)
    dosage_unit: Optional[str] = None
    frequency: str = Field(..., min_length=1, max_length=100)
    route: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[int] = Field(None, gt=0, description="Must be positive")
    instructions: Optional[str] = None
    special_instructions: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    # MCP data
    mcp_drug_id: Optional[str] = None
    drug_interactions: Optional[dict] = None
    contraindications: Optional[List[str]] = None


class PrescriptionResponse(BaseModel):
    """Prescription response schema."""
    id: UUID
    medication_name: str
    medication_code: Optional[str] = None
    medication_form: Optional[str] = None
    generic_name: Optional[str] = None
    dosage: str
    dosage_unit: Optional[str] = None
    frequency: str
    route: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[int] = None
    refills: int = Field(0, ge=0, description="Must be non-negative")
    instructions: Optional[str] = None
    special_instructions: Optional[str] = None
    status: str = "active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    prescribed_by: Optional[str] = None
    prescribed_at: Optional[datetime] = None
    drug_interactions: Optional[dict] = None
    contraindications: Optional[List[str]] = None

    class Config:
        from_attributes = True


class PrescriptionDiscontinueRequest(BaseModel):
    """Discontinue prescription request."""
    reason: str


class MedicationSearchRequest(BaseModel):
    """Medication search request (MCP)."""
    query: str
    limit: int = 10


class MedicationSearchResponse(BaseModel):
    """Medication search response (MCP)."""
    success: bool = True
    data: List[dict]
