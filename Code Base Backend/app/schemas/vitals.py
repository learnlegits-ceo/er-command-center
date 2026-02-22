from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
from uuid import UUID


class VitalsCreate(BaseModel):
    """Create vitals request."""
    hr: Optional[int] = None
    bp: Optional[str] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    spo2: Optional[float] = None
    temp: Optional[float] = None
    respiratory_rate: Optional[int] = None
    blood_glucose: Optional[float] = None
    pain_level: Optional[int] = None
    notes: Optional[str] = None


class VitalsResponse(BaseModel):
    """Vitals response schema."""
    id: UUID
    patient_id: UUID
    heart_rate: Optional[int] = None
    blood_pressure: Optional[str] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    blood_glucose: Optional[float] = None
    pain_level: Optional[int] = None
    notes: Optional[str] = None
    is_critical: bool = False
    source: str = "manual"
    recorded_by: Optional[str] = None
    recorded_at: Optional[datetime] = None
    alerts: Optional[list] = None

    class Config:
        from_attributes = True


class VitalsHistoryResponse(BaseModel):
    """Vitals history response."""
    success: bool = True
    data: dict


class VitalsOCRResponse(BaseModel):
    """OCR vitals extraction response."""
    success: bool = True
    data: dict


class OCRExtractedVitals(BaseModel):
    """Extracted vitals from OCR."""
    hr: Optional[str] = None
    bp: Optional[str] = None
    spo2: Optional[str] = None
    temp: Optional[str] = None


class OCRConfidence(BaseModel):
    """OCR confidence scores."""
    hr: Optional[float] = None
    bp: Optional[float] = None
    spo2: Optional[float] = None
    temp: Optional[float] = None
