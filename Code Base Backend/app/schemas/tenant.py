from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from .subscription import SubscriptionPlanResponse


class InitialAdmin(BaseModel):
    """Initial admin user created during hospital onboarding."""
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class TenantCreate(BaseModel):
    """Create a new hospital/tenant."""
    name: str
    code: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan_id: UUID
    initial_admin: InitialAdmin


class TenantUpdate(BaseModel):
    """Update hospital/tenant details."""
    name: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan_id: Optional[UUID] = None
    settings: Optional[Dict[str, Any]] = None


class TenantStatusUpdate(BaseModel):
    """Update tenant subscription status."""
    status: str  # active, inactive, suspended


class TenantResponse(BaseModel):
    """Full tenant response with plan and stats."""
    id: UUID
    name: str
    code: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan: Optional[SubscriptionPlanResponse] = None
    subscription_status: str
    subscription_starts_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    is_active: bool
    settings: Dict[str, Any] = {}
    # Live counts — populated at query time
    user_count: Optional[int] = None
    bed_count: Optional[int] = None
    department_count: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenantListItem(BaseModel):
    """Lightweight tenant for list views."""
    id: UUID
    name: str
    code: str
    plan_name: Optional[str] = None
    subscription_status: str
    is_active: bool
    user_count: int = 0
    bed_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
