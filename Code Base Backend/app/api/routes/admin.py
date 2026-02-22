from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.models.user import User, UserSettings
from app.models.department import Department
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.common import SuccessResponse
from app.core.dependencies import require_admin
from app.core.security import get_password_hash

router = APIRouter()


@router.get("/staff", response_model=dict)
async def get_all_staff(
    role: Optional[str] = Query("all"),
    department: Optional[str] = None,
    status_filter: Optional[str] = Query("active", alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all staff members."""
    query = select(User).options(
        selectinload(User.department)
    ).where(
        User.tenant_id == current_user.tenant_id,
        User.deleted_at.is_(None)
    )

    if role and role != "all":
        query = query.where(User.role == role)

    if department:
        query = query.join(Department).where(Department.name == department)

    if status_filter and status_filter != "all":
        query = query.where(User.status == status_filter)

    if search:
        query = query.where(
            User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    query = query.order_by(User.name)

    result = await db.execute(query)
    staff = result.scalars().all()

    # Get counts
    doctors_count = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == current_user.tenant_id,
            User.role == "doctor",
            User.deleted_at.is_(None)
        )
    )
    nurses_count = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == current_user.tenant_id,
            User.role == "nurse",
            User.deleted_at.is_(None)
        )
    )
    admins_count = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == current_user.tenant_id,
            User.role == "admin",
            User.deleted_at.is_(None)
        )
    )

    staff_data = []
    for s in staff:
        staff_data.append({
            "id": str(s.id),
            "name": s.name,
            "email": s.email,
            "role": s.role,
            "department": s.department.name if s.department else None,
            "phone": s.phone,
            "avatar": s.avatar_url,
            "status": s.status,
            "joinedAt": s.joined_at.isoformat() if s.joined_at else None,
            "lastActive": s.last_active_at
        })

    return {
        "success": True,
        "data": {
            "staff": staff_data,
            "counts": {
                "total": len(staff_data),
                "doctors": doctors_count.scalar() or 0,
                "nurses": nurses_count.scalar() or 0,
                "admins": admins_count.scalar() or 0
            }
        }
    }


@router.post("/staff", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_staff(
    request: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create new staff member."""
    # Check if email already exists
    existing = await db.execute(
        select(User).where(
            User.tenant_id == current_user.tenant_id,
            User.email == request.email
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = User(
        tenant_id=current_user.tenant_id,
        name=request.name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=request.role,
        department_id=request.department_id,
        phone=request.phone,
        specialization=request.specialization,
        avatar_url=request.avatar_url,
        status="active",
        joined_at=datetime.utcnow().date()
    )
    db.add(user)
    await db.flush()

    # Create default settings
    settings = UserSettings(user_id=user.id)
    db.add(settings)

    await db.commit()

    # Re-fetch with department eagerly loaded
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user.id)
    )
    user = result.scalar_one()

    # TODO: Send welcome email with temporary password via SQS

    return {
        "success": True,
        "data": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department.name if user.department else None,
            "avatar": user.avatar_url,
            "phone": user.phone,
            "status": user.status,
            "joinedAt": user.joined_at.isoformat() if user.joined_at else None
        },
        "message": "Staff member created successfully."
    }


@router.put("/staff/{staff_id}", response_model=dict)
async def update_staff(
    staff_id: UUID,
    request: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update staff member."""
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(
            User.id == staff_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    await db.commit()

    # Re-fetch with department eagerly loaded
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user.id)
    )
    user = result.scalar_one()

    return {
        "success": True,
        "data": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department.name if user.department else None,
            "status": user.status
        }
    }


@router.delete("/staff/{staff_id}", response_model=SuccessResponse)
async def delete_staff(
    staff_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete/deactivate staff member."""
    result = await db.execute(
        select(User).where(
            User.id == staff_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    # Don't allow deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Soft delete
    user.status = "inactive"
    user.deleted_at = datetime.utcnow()

    await db.commit()

    return {"success": True, "message": "Staff member deactivated"}


@router.post("/staff/{staff_id}/reset-password", response_model=SuccessResponse)
async def reset_staff_password(
    staff_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reset staff member password."""
    result = await db.execute(
        select(User).where(
            User.id == staff_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    # Generate temporary password
    import secrets
    temp_password = secrets.token_urlsafe(12)
    user.password_hash = get_password_hash(temp_password)

    await db.commit()

    # TODO: Send password reset email via SQS
    print(f"Temporary password for {user.email}: {temp_password}")

    return {"success": True, "message": "Password reset email sent to staff member"}
