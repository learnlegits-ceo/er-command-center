from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, INET
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from .base import TimestampMixin, SoftDeleteMixin


class User(Base, TimestampMixin, SoftDeleteMixin):
    """Staff member (nurse, doctor, admin)."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(50))
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # nurse, doctor, admin, technician, receptionist
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    phone = Column(String(20))
    avatar_url = Column(Text)
    specialization = Column(String(100))
    license_number = Column(String(50))
    status = Column(String(20), default="active")  # active, inactive, suspended, on_leave
    last_active_at = Column(DateTime(timezone=True))
    joined_at = Column(Date)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    department = relationship("Department", back_populates="users")
    settings = relationship("UserSettings", back_populates="user", uselist=False)
    two_factor_auth = relationship("UserTwoFactorAuth", back_populates="user", uselist=False)
    sessions = relationship("UserSession", back_populates="user", lazy="dynamic")

    # Assigned patients
    assigned_patients_as_doctor = relationship(
        "Patient",
        foreign_keys="Patient.assigned_doctor_id",
        back_populates="assigned_doctor",
        lazy="dynamic"
    )
    assigned_patients_as_nurse = relationship(
        "Patient",
        foreign_keys="Patient.assigned_nurse_id",
        back_populates="assigned_nurse",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<User {self.name} ({self.role})>"


class UserSettings(Base, TimestampMixin):
    """User preferences and settings."""
    __tablename__ = "user_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    theme = Column(String(20), default="light")
    language = Column(String(10), default="en")
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=True)
    alert_sound = Column(Boolean, default=True)
    critical_alerts_only = Column(Boolean, default=False)
    session_timeout = Column(Integer, default=30)

    # Relationships
    user = relationship("User", back_populates="settings")


class UserTwoFactorAuth(Base, TimestampMixin):
    """Two-factor authentication settings."""
    __tablename__ = "user_two_factor_auth"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    is_enabled = Column(Boolean, default=False)
    secret_key = Column(String(255))
    backup_codes = Column(ARRAY(Text))
    verified_at = Column(String)

    # Relationships
    user = relationship("User", back_populates="two_factor_auth")


class UserSession(Base):
    """User session/token tracking."""
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    refresh_token_hash = Column(String(255))
    device_info = Column(JSONB)
    ip_address = Column(INET)
    user_agent = Column(Text)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    refresh_expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default="now()")
    last_used_at = Column(DateTime(timezone=True), server_default="now()")

    # Relationships
    user = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    """Password reset OTP and token."""
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    otp_hash = Column(String(255))
    reset_token_hash = Column(String(255))
    otp_expires_at = Column(String)
    token_expires_at = Column(String)
    is_used = Column(Boolean, default=False)
    created_at = Column(String, server_default="now()")
