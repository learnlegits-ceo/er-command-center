from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict
from datetime import datetime
from uuid import UUID


class VitalsCreate(BaseModel):
    """Create vitals request."""
    hr: Optional[int] = Field(None, ge=20, le=300, description="Heart rate in bpm")
    bp: Optional[str] = Field(None, description="Blood pressure as 'systolic/diastolic'")
    blood_pressure_systolic: Optional[int] = Field(None, ge=40, le=300, description="Systolic BP in mmHg")
    blood_pressure_diastolic: Optional[int] = Field(None, ge=20, le=200, description="Diastolic BP in mmHg")

    @field_validator("bp")
    @classmethod
    def validate_bp_string(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        if "/" not in v:
            raise ValueError("Blood pressure must be in format 'systolic/diastolic' (e.g., 120/80)")
        parts = v.split("/")
        if len(parts) != 2:
            raise ValueError("Blood pressure must have exactly one '/' separator (e.g., 120/80)")
        try:
            sys_val = int(parts[0])
            dia_val = int(parts[1])
        except ValueError:
            raise ValueError("Blood pressure values must be numbers (e.g., 120/80)")
        if sys_val < 40 or sys_val > 300:
            raise ValueError(f"Systolic BP ({sys_val}) must be between 40 and 300 mmHg")
        if dia_val < 20 or dia_val > 200:
            raise ValueError(f"Diastolic BP ({dia_val}) must be between 20 and 200 mmHg")
        if dia_val >= sys_val:
            raise ValueError("Diastolic BP must be less than systolic BP")
        return v
    spo2: Optional[float] = Field(None, ge=0, le=100, description="SpO2 percentage")
    temp: Optional[float] = Field(None, ge=30.0, le=45.0, description="Temperature in Celsius")
    respiratory_rate: Optional[int] = Field(None, ge=4, le=80, description="Respiratory rate breaths/min")
    blood_glucose: Optional[float] = Field(None, ge=10, le=800, description="Blood glucose mg/dL")
    pain_level: Optional[int] = Field(None, ge=0, le=10, description="Pain level 0-10")
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
