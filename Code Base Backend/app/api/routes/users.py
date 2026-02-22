from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import pyotp
import qrcode
import io
import base64

from app.db.database import get_db
from app.models.user import User, UserSettings, UserTwoFactorAuth
from app.schemas.user import (
    UserResponse, UserUpdate, UserSettingsResponse, UserSettingsUpdate,
    TwoFactorEnableResponse, TwoFactorVerifyRequest
)
from app.schemas.common import SuccessResponse
from app.core.dependencies import get_current_user
from app.core.security import verify_password

router = APIRouter()


@router.get("/me", response_model=dict)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile."""
    department_name = None
    if current_user.department:
        department_name = current_user.department.name

    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "department": department_name,
            "avatar": current_user.avatar_url,
            "phone": current_user.phone,
            "specialization": current_user.specialization,
            "createdAt": current_user.created_at.isoformat() if current_user.created_at else None
        }
    }


@router.put("/me", response_model=dict)
async def update_current_user_profile(
    request: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    if request.name is not None:
        current_user.name = request.name
    if request.phone is not None:
        current_user.phone = request.phone
    if request.department_id is not None:
        current_user.department_id = request.department_id

    await db.commit()
    await db.refresh(current_user)

    department_name = None
    if current_user.department:
        department_name = current_user.department.name

    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "department": department_name,
            "phone": current_user.phone
        }
    }


@router.post("/me/avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload/update profile photo."""
    # TODO: Upload to S3 and get URL
    # For now, just return a placeholder
    avatar_url = f"https://storage.example.com/avatars/{current_user.id}.jpg"
    current_user.avatar_url = avatar_url

    await db.commit()

    return {
        "success": True,
        "data": {
            "avatarUrl": avatar_url
        }
    }


@router.delete("/me/avatar", response_model=SuccessResponse)
async def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove profile photo."""
    current_user.avatar_url = None
    await db.commit()

    return {"success": True, "message": "Avatar removed"}


@router.get("/me/settings", response_model=dict)
async def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user settings."""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        # Create default settings
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    # Check 2FA status
    twofa_result = await db.execute(
        select(UserTwoFactorAuth).where(UserTwoFactorAuth.user_id == current_user.id)
    )
    twofa = twofa_result.scalar_one_or_none()

    return {
        "success": True,
        "data": {
            "theme": settings.theme,
            "language": settings.language,
            "emailNotifications": settings.email_notifications,
            "pushNotifications": settings.push_notifications,
            "smsNotifications": settings.sms_notifications,
            "alertSound": settings.alert_sound,
            "criticalAlertsOnly": settings.critical_alerts_only,
            "sessionTimeout": settings.session_timeout,
            "twoFactorAuth": twofa.is_enabled if twofa else False
        }
    }


@router.put("/me/settings", response_model=dict)
async def update_user_settings(
    request: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user settings."""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)

    return {
        "success": True,
        "data": {
            "theme": settings.theme,
            "language": settings.language,
            "emailNotifications": settings.email_notifications,
            "pushNotifications": settings.push_notifications,
            "smsNotifications": settings.sms_notifications,
            "alertSound": settings.alert_sound,
            "criticalAlertsOnly": settings.critical_alerts_only,
            "sessionTimeout": settings.session_timeout
        }
    }


@router.post("/me/2fa/enable", response_model=dict)
async def enable_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enable two-factor authentication."""
    # Generate secret
    secret = pyotp.random_base32()

    # Generate QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="ER Command Center"
    )

    # Create QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    # Generate backup codes
    import secrets
    backup_codes = [secrets.token_hex(4) for _ in range(6)]

    # Store 2FA settings (not enabled yet)
    result = await db.execute(
        select(UserTwoFactorAuth).where(UserTwoFactorAuth.user_id == current_user.id)
    )
    twofa = result.scalar_one_or_none()

    if not twofa:
        twofa = UserTwoFactorAuth(user_id=current_user.id)
        db.add(twofa)

    twofa.secret_key = secret
    twofa.backup_codes = backup_codes
    twofa.is_enabled = False

    await db.commit()

    return {
        "success": True,
        "data": {
            "qrCode": f"data:image/png;base64,{qr_base64}",
            "secret": secret,
            "backupCodes": backup_codes
        }
    }


@router.post("/me/2fa/verify", response_model=SuccessResponse)
async def verify_2fa(
    request: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify and activate 2FA."""
    result = await db.execute(
        select(UserTwoFactorAuth).where(UserTwoFactorAuth.user_id == current_user.id)
    )
    twofa = result.scalar_one_or_none()

    if not twofa or not twofa.secret_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup not initiated"
        )

    # Verify code
    totp = pyotp.TOTP(twofa.secret_key)
    if not totp.verify(request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Enable 2FA
    from datetime import datetime
    twofa.is_enabled = True
    twofa.verified_at = datetime.utcnow().isoformat()

    await db.commit()

    return {"success": True, "message": "2FA enabled successfully"}


@router.post("/me/2fa/disable", response_model=SuccessResponse)
async def disable_2fa(
    password: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disable two-factor authentication."""
    # Verify password
    if not verify_password(password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )

    result = await db.execute(
        select(UserTwoFactorAuth).where(UserTwoFactorAuth.user_id == current_user.id)
    )
    twofa = result.scalar_one_or_none()

    if twofa:
        twofa.is_enabled = False
        twofa.secret_key = None
        twofa.backup_codes = None
        await db.commit()

    return {"success": True, "message": "2FA disabled"}
