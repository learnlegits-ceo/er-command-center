from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class SubscriptionPlanCreate(BaseModel):
    """Create a subscription plan."""
    name: str
    code: str
    description: Optional[str] = None
    included_users: int = 10
    included_beds: int = 20
    max_users: int = 20
    max_beds: int = 50
    max_departments: int = 5
    base_price: Decimal
    price_per_extra_user: Decimal = Decimal("0")
    price_per_extra_bed: Decimal = Decimal("0")
    annual_discount_percent: int = 17
    billing_cycle: str = "monthly"
    currency: str = "INR"
    features: Dict[str, Any] = {}
    sort_order: int = 0


class SubscriptionPlanUpdate(BaseModel):
    """Update a subscription plan."""
    name: Optional[str] = None
    description: Optional[str] = None
    included_users: Optional[int] = None
    included_beds: Optional[int] = None
    max_users: Optional[int] = None
    max_beds: Optional[int] = None
    max_departments: Optional[int] = None
    base_price: Optional[Decimal] = None
    price_per_extra_user: Optional[Decimal] = None
    price_per_extra_bed: Optional[Decimal] = None
    annual_discount_percent: Optional[int] = None
    billing_cycle: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SubscriptionPlanResponse(BaseModel):
    """Subscription plan response."""
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    included_users: int
    included_beds: int
    max_users: int
    max_beds: int
    max_departments: int
    base_price: Decimal
    price_per_extra_user: Decimal
    price_per_extra_bed: Decimal
    annual_discount_percent: int
    billing_cycle: str
    currency: str
    features: Dict[str, Any] = {}
    is_active: bool
    sort_order: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
