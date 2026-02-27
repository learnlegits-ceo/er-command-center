from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


def _validate_password_strength(v: str) -> str:
    """Enforce minimum password strength requirements."""
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not any(c.isupper() for c in v):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one digit.")
    return v


class LoginRequest(BaseModel):
    """Login request."""
    email: EmailStr
    password: str


class UserData(BaseModel):
    """User data in login response."""
    id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None
    avatar: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Login response."""
    success: bool = True
    data: dict


class TokenResponse(BaseModel):
    """Token response."""
    success: bool = True
    token: str
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Forgot password request."""
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Forgot password response."""
    success: bool = True
    message: str
    otp_expiry: Optional[datetime] = None


class VerifyOTPRequest(BaseModel):
    """Verify OTP request."""
    email: EmailStr
    otp: str


class VerifyOTPResponse(BaseModel):
    """Verify OTP response."""
    success: bool = True
    reset_token: str


class ResetPasswordRequest(BaseModel):
    """Reset password request."""
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class ChangePasswordRequest(BaseModel):
    """Change password request."""
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str
