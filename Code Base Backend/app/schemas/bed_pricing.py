from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class BedPricingCreate(BaseModel):
    """Set pricing for a bed type."""
    bed_type: str  # icu, general, isolation, pediatric, maternity, emergency, daycare, observation
    cost_per_day: Decimal
    currency: str = "INR"


class BedPricingUpdate(BaseModel):
    """Update bed type pricing."""
    cost_per_day: Optional[Decimal] = None
    is_active: Optional[bool] = None


class BedPricingResponse(BaseModel):
    """Bed type pricing response."""
    id: UUID
    bed_type: str
    cost_per_day: Decimal
    currency: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
