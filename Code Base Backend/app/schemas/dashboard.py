from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime


class PatientStats(BaseModel):
    """Patient statistics."""
    total: int
    critical: int
    in_er: int
    in_icu: int
    in_ward: int
    pending_discharge: int


class BedStats(BaseModel):
    """Bed statistics."""
    total: int
    occupied: int
    available: int
    by_department: Optional[Dict[str, Dict[str, int]]] = None


class AlertStats(BaseModel):
    """Alert statistics."""
    unread: int
    critical: int


class TodayStats(BaseModel):
    """Today's statistics."""
    admissions: int
    discharges: int
    emergencies: int


class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response."""
    success: bool = True
    data: dict


class RecentPatientActivity(BaseModel):
    """Recent patient activity."""
    id: str
    name: str
    action: str  # admitted, discharged, transferred
    timestamp: datetime
    department: Optional[str] = None


class AlertsSummary(BaseModel):
    """Alerts summary for header badge."""
    unread_count: int
    critical_count: int
    recent_alerts: List[dict]


class OccupancyStats(BaseModel):
    """Bed occupancy statistics."""
    icu: float
    general: float
    isolation: float
    emergency: float


class PatientFlowData(BaseModel):
    """Patient flow data point."""
    date: str
    admissions: int
    discharges: int
