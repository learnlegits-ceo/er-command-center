from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin


class Department(Base, TimestampMixin):
    """Hospital department."""
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    description = Column(Text)
    floor = Column(String(20))
    capacity = Column(Integer)
    is_active = Column(Boolean, default=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="departments")
    users = relationship("User", back_populates="department", lazy="dynamic")
    patients = relationship("Patient", back_populates="department", lazy="dynamic")
    beds = relationship("Bed", back_populates="department", lazy="dynamic")

    def __repr__(self):
        return f"<Department {self.name}>"
