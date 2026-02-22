from sqlalchemy import Column, String, Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class Tenant(Base, TimestampMixin):
    """Multi-tenant organization (hospital/clinic)."""
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    domain = Column(String(255))
    logo_url = Column(Text)
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    subscription_plan = Column(String(50), default="basic")
    subscription_status = Column(String(20), default="active")
    max_users = Column(Integer, default=50)
    max_beds = Column(Integer, default=100)
    settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)

    # Relationships
    departments = relationship("Department", back_populates="tenant", lazy="dynamic")
    users = relationship("User", back_populates="tenant", lazy="dynamic")
    patients = relationship("Patient", back_populates="tenant", lazy="dynamic")
    beds = relationship("Bed", back_populates="tenant", lazy="dynamic")
    alerts = relationship("Alert", back_populates="tenant", lazy="dynamic")
    police_cases = relationship("PoliceCase", back_populates="tenant", lazy="dynamic")

    def __repr__(self):
        return f"<Tenant {self.name}>"
