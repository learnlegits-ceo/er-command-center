from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


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


class ChangePasswordRequest(BaseModel):
    """Change password request."""
    current_password: str
    new_password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str
