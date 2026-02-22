from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class PatientBrief(BaseModel):
    """Brief patient info for alert."""
    id: UUID
    name: str
    bed: Optional[str] = None

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    """Create alert request."""
    title: str
    message: str
    priority: str  # critical, high, medium, low, info
    category: str
    for_roles: Optional[List[str]] = None
    patient_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None


class AlertResponse(BaseModel):
    """Alert response schema."""
    id: UUID
    title: str
    message: str
    priority: str
    status: str
    category: str
    for_roles: Optional[List[str]] = None
    patient: Optional[PatientBrief] = None
    metadata: Optional[Dict[str, Any]] = None
    triggered_by: Optional[str] = None
    created_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    read_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution: Optional[str] = None

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    """Alert list response."""
    success: bool = True
    data: dict


class AlertAcknowledgeRequest(BaseModel):
    """Acknowledge alert request."""
    notes: Optional[str] = None


class AlertResolveRequest(BaseModel):
    """Resolve alert request."""
    resolution: str


class AlertForwardRequest(BaseModel):
    """Forward alert request."""
    to_role: str
    notes: Optional[str] = None


class AlertCountsResponse(BaseModel):
    """Alert counts for dashboard."""
    total: int
    unread: int
    critical: int
