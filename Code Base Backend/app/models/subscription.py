from sqlalchemy import Column, String, Boolean, Integer, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class SubscriptionPlan(Base, TimestampMixin):
    """SaaS subscription plan definition."""
    __tablename__ = "subscription_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)  # "Starter", "Professional", "Enterprise"
    code = Column(String(50), nullable=False, unique=True)   # "starter", "pro", "enterprise"
    description = Column(Text)

    # What's included in the base price
    included_users = Column(Integer, nullable=False, default=10)
    included_beds = Column(Integer, nullable=False, default=20)

    # Hard limits (0 = unlimited)
    max_users = Column(Integer, nullable=False, default=20)
    max_beds = Column(Integer, nullable=False, default=50)
    max_departments = Column(Integer, nullable=False, default=5)

    # Pricing (INR)
    base_price = Column(Numeric(10, 2), nullable=False, default=0)
    price_per_extra_user = Column(Numeric(10, 2), nullable=False, default=0)
    price_per_extra_bed = Column(Numeric(10, 2), nullable=False, default=0)
    annual_discount_percent = Column(Integer, default=17)  # ~2 months free on yearly
    billing_cycle = Column(String(20), nullable=False, default="monthly")  # monthly, yearly
    currency = Column(String(3), default="INR")

    # Feature gates
    features = Column(JSONB, default={})
    # Example: {"ai_triage": true, "ai_triage_limit": 100, "police_cases": false,
    #           "opd": false, "api_access": false, "abdm": false, "custom_branding": false}

    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    tenants = relationship("Tenant", back_populates="plan")

    def __repr__(self):
        return f"<SubscriptionPlan {self.name} ({self.code})>"
