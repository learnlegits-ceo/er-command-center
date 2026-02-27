from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


class UserBase(BaseModel):
    """Base user schema."""
    name: str
    email: EmailStr
    role: str
    department_id: Optional[UUID] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None


class UserCreate(UserBase):
    """Create user schema."""
    password: str
    avatar_url: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


class UserUpdate(BaseModel):
    """Update user schema."""
    name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    specialization: Optional[str] = None
    status: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema."""
    id: UUID
    name: str
    email: str
    role: str
    department: Optional[str] = None
    department_id: Optional[UUID] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    specialization: Optional[str] = None
    status: str
    joined_at: Optional[date] = None
    last_active_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserSettingsResponse(BaseModel):
    """User settings response."""
    theme: str = "light"
    language: str = "en"
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = True
    alert_sound: bool = True
    critical_alerts_only: bool = False
    session_timeout: int = 30

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    """Update user settings."""
    theme: Optional[str] = None
    language: Optional[str] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    alert_sound: Optional[bool] = None
    critical_alerts_only: Optional[bool] = None
    session_timeout: Optional[int] = None


class TwoFactorEnableResponse(BaseModel):
    """2FA enable response."""
    success: bool = True
    data: dict


class TwoFactorVerifyRequest(BaseModel):
    """2FA verify request."""
    code: str
