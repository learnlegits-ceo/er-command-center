from pydantic import BaseModel
from typing import Optional, List, Dict
from uuid import UUID


class VitalsInput(BaseModel):
    """Vitals input for triage."""
    hr: Optional[int] = None
    bp: Optional[str] = None
    spo2: Optional[int] = None
    temp: Optional[float] = None
    respiratory_rate: Optional[int] = None


class TriageRequest(BaseModel):
    """AI triage request."""
    complaint: str
    vitals: Optional[VitalsInput] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    history: Optional[str] = None


class QuickTriageRequest(BaseModel):
    """Quick triage request (without patient registration)."""
    complaint: str
    vitals: Optional[VitalsInput] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    history: Optional[str] = None


class TriageResult(BaseModel):
    """Triage result data."""
    priority: int
    priority_label: str
    priority_color: str
    reasoning: str
    recommendations: List[str]
    suggested_department: Optional[str] = None
    estimated_wait_time: Optional[str] = None
    confidence: Optional[float] = None


class TriageResponse(BaseModel):
    """Triage response schema."""
    success: bool = True
    data: TriageResult


class TriageOverrideRequest(BaseModel):
    """Override triage priority request."""
    priority: int
    reason: str
