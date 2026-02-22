from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, date
import traceback
import uuid

from app.db.database import get_db
from app.models.user import User, UserSession, PasswordResetToken
from app.models.tenant import Tenant
from app.models.department import Department
from app.schemas.auth import (
    LoginRequest,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest,
    ChangePasswordRequest, RefreshTokenRequest, TokenResponse
)
from app.schemas.common import SuccessResponse
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    decode_token, hash_token, generate_otp, generate_reset_token
)
from app.core.dependencies import get_current_user
from app.services.email import email_service

router = APIRouter()


@router.get("/debug-settings")
async def debug_settings():
    """Debug: Show current settings."""
    from app.core.config import settings
    return {
        "database_url": settings.DATABASE_URL[:50] + "...",
        "debug": settings.DEBUG
    }


@router.get("/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    """Test database connection."""
    try:
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        return {"success": True, "user_found": user is not None, "user_name": user.name if user else None}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.post("/login")
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT token."""
    try:
        print(f"[LOGIN] Attempting login for: {request.email}")

        # Find user by email with department eagerly loaded
        result = await db.execute(
            select(User)
            .options(selectinload(User.department))
            .where(
                User.email == request.email,
                User.deleted_at.is_(None)
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            print(f"[LOGIN] User not found: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        print(f"[LOGIN] User found: {user.name}, verifying password...")

        if not verify_password(request.password, user.password_hash):
            print(f"[LOGIN] Password verification failed for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        print(f"[LOGIN] Password verified for: {user.name}")

        if user.status != "active":
            print(f"[LOGIN] User not active: {user.name}, status: {user.status}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active"
            )

        # Create tokens
        token_data = {
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id),
            "role": user.role
        }

        print(f"[LOGIN] Creating tokens for: {user.name}")
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # Store session (non-blocking)
        try:
            session = UserSession(
                user_id=user.id,
                token_hash=hash_token(access_token),
                refresh_token_hash=hash_token(refresh_token),
                expires_at=datetime.utcnow() + timedelta(hours=1),
                refresh_expires_at=datetime.utcnow() + timedelta(days=7),
                is_active=True
            )
            db.add(session)
            user.last_active_at = datetime.utcnow()
            await db.commit()
            print(f"[LOGIN] Session stored for: {user.name}")
        except Exception as session_error:
            print(f"[LOGIN] Session storage error (continuing anyway): {session_error}")

        # Get department name
        department_name = None
        if user.department:
            department_name = user.department.name

        print(f"[LOGIN] SUCCESS for: {user.name}")

        return {
            "success": True,
            "data": {
                "user": {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "department": department_name,
                    "avatar": user.avatar_url,
                    "phone": user.phone
                },
                "token": access_token,
                "refreshToken": refresh_token
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN] UNEXPECTED ERROR: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout and invalidate token."""
    try:
        result = await db.execute(
            select(UserSession).where(
                UserSession.user_id == current_user.id,
                UserSession.is_active == True
            )
        )
        sessions = result.scalars().all()

        for session in sessions:
            session.is_active = False

        await db.commit()
        return {"success": True, "message": "Logged out successfully"}
    except Exception as e:
        print(f"[LOGOUT] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset OTP."""
    try:
        result = await db.execute(
            select(User).where(
                User.email == request.email,
                User.deleted_at.is_(None)
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            return {
                "success": True,
                "message": "If the email exists, OTP has been sent",
                "otpExpiry": (datetime.utcnow() + timedelta(minutes=10)).isoformat()
            }

        otp = generate_otp()
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)

        reset_token = PasswordResetToken(
            user_id=user.id,
            email=user.email,
            otp_hash=hash_token(otp),
            otp_expires_at=otp_expiry.isoformat()
        )
        db.add(reset_token)
        await db.commit()

        try:
            await email_service.send_otp_email(
                to_email=user.email,
                otp=otp,
                user_name=user.name
            )
        except Exception as e:
            print(f"[FORGOT-PASSWORD] Email error: {str(e)}")
            print(f"[FORGOT-PASSWORD] OTP for {request.email}: {otp}")

        return {
            "success": True,
            "message": "OTP sent to email",
            "otpExpiry": otp_expiry.isoformat()
        }
    except Exception as e:
        print(f"[FORGOT-PASSWORD] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )


@router.post("/verify-otp")
async def verify_otp(
    request: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify OTP for password reset."""
    try:
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.email == request.email,
                PasswordResetToken.is_used == False
            ).order_by(PasswordResetToken.created_at.desc())
        )
        reset_token = result.scalar_one_or_none()

        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )

        if reset_token.otp_hash != hash_token(request.otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP"
            )

        if reset_token.otp_expires_at:
            expiry = datetime.fromisoformat(reset_token.otp_expires_at.replace('Z', '+00:00').replace('+00:00', ''))
            if datetime.utcnow() > expiry:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="OTP has expired"
                )

        new_reset_token = generate_reset_token()
        reset_token.reset_token_hash = hash_token(new_reset_token)
        reset_token.token_expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()

        await db.commit()

        return {
            "success": True,
            "resetToken": new_reset_token
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VERIFY-OTP] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )


@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with verified token."""
    try:
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.reset_token_hash == hash_token(request.reset_token),
                PasswordResetToken.is_used == False
            )
        )
        reset_token = result.scalar_one_or_none()

        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        if reset_token.token_expires_at:
            expiry = datetime.fromisoformat(reset_token.token_expires_at.replace('Z', '+00:00').replace('+00:00', ''))
            if datetime.utcnow() > expiry:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reset token has expired"
                )

        user_result = await db.execute(
            select(User).where(User.id == reset_token.user_id)
        )
        user = user_result.scalar_one_or_none()

        if user:
            user.password_hash = get_password_hash(request.new_password)
            reset_token.is_used = True
            await db.commit()

        return {"success": True, "message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[RESET-PASSWORD] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change password for logged-in user."""
    try:
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        current_user.password_hash = get_password_hash(request.new_password)
        await db.commit()

        return {"success": True, "message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CHANGE-PASSWORD] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token."""
    try:
        payload = decode_token(request.refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        from uuid import UUID
        result = await db.execute(
            select(User).where(
                User.id == UUID(user_id),
                User.deleted_at.is_(None),
                User.status == "active"
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        token_data = {
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id),
            "role": user.role
        }

        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        return {
            "success": True,
            "token": new_access_token,
            "refresh_token": new_refresh_token
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[REFRESH-TOKEN] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user information."""
    try:
        result = await db.execute(
            select(User)
            .options(selectinload(User.department))
            .where(User.id == current_user.id)
        )
        user = result.scalar_one_or_none()

        department_name = None
        if user and user.department:
            department_name = user.department.name

        return {
            "success": True,
            "data": {
                "id": str(current_user.id),
                "name": current_user.name,
                "email": current_user.email,
                "role": current_user.role,
                "department": department_name,
                "avatar": current_user.avatar_url,
                "phone": current_user.phone
            }
        }
    except Exception as e:
        print(f"[ME] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )


@router.get("/seed-database")
@router.post("/seed-database")
async def seed_database(db: AsyncSession = Depends(get_db)):
    """One-time database seeding. Only works on an empty database."""
    try:
        # Refuse to run if users already exist
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Database already seeded. This endpoint only works on an empty database."
            )

        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            name="City General Hospital",
            code="CGH001",
            domain="citygeneral.health",
            address="123 Medical Center Drive, Healthcare City",
            phone="+1-555-0100",
            email="admin@citygeneral.health",
            subscription_plan="enterprise",
            subscription_status="active",
            max_users=200,
            max_beds=500,
            is_active=True
        )
        db.add(tenant)

        dept = Department(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name="Emergency Department",
            code="ED",
            description="Emergency Department - Providing specialized care",
            floor="Ground Floor",
            capacity=30,
            is_active=True
        )
        db.add(dept)

        # Flush so dept.id is available
        await db.flush()

        demo_users = [
            {"name": "Priya Sharma", "email": "priya@hospital.com", "password": "nurse123", "role": "nurse", "emp": "DEMO1", "phone": "+91-9876543210"},
            {"name": "Dr. Ananya Patel", "email": "ananya@hospital.com", "password": "doctor123", "role": "doctor", "emp": "DEMO2", "phone": "+91-9876543211", "spec": "Emergency Medicine"},
            {"name": "Rajesh Kumar", "email": "rajesh@hospital.com", "password": "admin123", "role": "admin", "emp": "DEMO3", "phone": "+91-9876543212"},
        ]

        for u in demo_users:
            user = User(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                employee_id=u["emp"],
                email=u["email"],
                password_hash=get_password_hash(u["password"]),
                name=u["name"],
                role=u["role"],
                department_id=dept.id,
                phone=u["phone"],
                specialization=u.get("spec"),
                status="active",
                joined_at=date.today() - timedelta(days=365)
            )
            db.add(user)

        await db.commit()
        print("[SEED] Database seeded successfully!")

        return {
            "success": True,
            "message": "Database seeded! You can now log in.",
            "credentials": [
                {"role": "nurse", "email": "priya@hospital.com", "password": "nurse123"},
                {"role": "doctor", "email": "ananya@hospital.com", "password": "doctor123"},
                {"role": "admin", "email": "rajesh@hospital.com", "password": "admin123"},
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[SEED] Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seeding failed: {str(e)}"
        )
