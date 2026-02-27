from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
import uuid as uuid_mod
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.models.user import User, UserSettings
from app.models.department import Department
from app.models.bed import Bed
from app.models.audit import AuditLog
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

    # Update only explicitly allowed fields to prevent privilege escalation
    UPDATABLE_STAFF_FIELDS = {"name", "phone", "department_id", "specialization", "status", "avatar_url"}
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in UPDATABLE_STAFF_FIELDS:
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

    # TODO: Send password reset email via SQS/Resend — never log the temporary password
    print(f"[ADMIN] Password reset for {user.email} — temporary password generated and hashed.")

    return {"success": True, "message": "Password has been reset. Please notify the staff member directly through a secure channel."}


@router.get("/audit-logs", response_model=dict)
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system audit logs for the current tenant."""
    query = (
        select(AuditLog, User.name.label("user_name"), User.role.label("user_role"))
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.tenant_id == current_user.tenant_id)
    )

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    total_result = await db.execute(
        select(func.count()).select_from(
            select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id).subquery()
        )
    )
    total = total_result.scalar() or 0

    query = query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    rows = result.all()

    logs = []
    for row in rows:
        log = row[0]
        logs.append({
            "id": str(log.id),
            "action": log.action,
            "entityType": log.entity_type,
            "entityId": str(log.entity_id) if log.entity_id else None,
            "userName": row[1] or "System",
            "userRole": row[2] or "system",
            "ipAddress": str(log.ip_address) if log.ip_address else None,
            "createdAt": log.created_at,
        })

    return {
        "success": True,
        "data": {
            "logs": logs,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.post("/initialize-departments", response_model=dict)
async def initialize_departments(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create standard hospital departments. Idempotent — skips departments that already exist."""
    DEPARTMENTS = [
        {"name": "Emergency Department", "code": "ED", "floor": "Ground Floor", "capacity": 30},
        {"name": "Emergency Care Unit", "code": "ECU", "floor": "Ground Floor", "capacity": 15},
        {"name": "Trauma Center", "code": "TC", "floor": "Ground Floor", "capacity": 20},
        {"name": "Outpatient Department", "code": "OPD", "floor": "1st Floor", "capacity": 50},
        {"name": "Intensive Care Unit", "code": "ICU", "floor": "2nd Floor", "capacity": 20},
        {"name": "General Ward", "code": "GW", "floor": "3rd Floor", "capacity": 60},
        {"name": "Pediatrics", "code": "PED", "floor": "4th Floor", "capacity": 25},
        {"name": "Cardiology", "code": "CARD", "floor": "5th Floor", "capacity": 20},
    ]

    # Get existing department codes for this tenant
    result = await db.execute(
        select(Department.code).where(Department.tenant_id == current_user.tenant_id)
    )
    existing_codes = {row[0] for row in result.all()}

    created = 0
    for dept_data in DEPARTMENTS:
        if dept_data["code"] in existing_codes:
            continue
        dept = Department(
            id=uuid_mod.uuid4(),
            tenant_id=current_user.tenant_id,
            name=dept_data["name"],
            code=dept_data["code"],
            description=f"{dept_data['name']} - Providing specialized care",
            floor=dept_data["floor"],
            capacity=dept_data["capacity"],
            is_active=True
        )
        db.add(dept)
        created += 1

    await db.commit()

    return {
        "success": True,
        "message": f"Created {created} new departments. {len(existing_codes)} already existed."
    }


@router.post("/initialize-beds", response_model=dict)
async def initialize_beds(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create default beds for every department that has none. Idempotent — safe to call multiple times."""
    # Bed configs per department code
    BED_CONFIGS = {
        "ED":   {"count": 15, "types": ["emergency", "trauma", "observation"]},
        "ECU":  {"count": 8,  "types": ["emergency", "observation", "monitoring"]},
        "TC":   {"count": 10, "types": ["trauma", "emergency", "observation"]},
        "OPD":  {"count": 20, "types": ["consultation", "examination", "procedure"]},
        "ICU":  {"count": 12, "types": ["icu", "isolation", "cardiac"]},
        "GW":   {"count": 30, "types": ["general", "semi-private", "private"]},
        "PED":  {"count": 15, "types": ["pediatric", "nicu", "general"]},
        "CARD": {"count": 12, "types": ["cardiac", "ccu", "monitoring"]},
    }
    # Fallback for departments not in the map
    DEFAULT_CONFIG = {"count": 10, "types": ["general"]}

    # Get all departments for this tenant
    result = await db.execute(
        select(Department).where(Department.tenant_id == current_user.tenant_id)
    )
    departments = result.scalars().all()

    if not departments:
        raise HTTPException(status_code=400, detail="No departments found. Create departments first.")

    created = 0
    skipped = 0
    for dept in departments:
        # Check if department already has beds
        bed_count = await db.execute(
            select(func.count(Bed.id)).where(
                Bed.department_id == dept.id,
                Bed.tenant_id == current_user.tenant_id
            )
        )
        if bed_count.scalar() > 0:
            skipped += 1
            continue

        config = BED_CONFIGS.get(dept.code, DEFAULT_CONFIG)
        for i in range(config["count"]):
            bed = Bed(
                id=uuid_mod.uuid4(),
                tenant_id=current_user.tenant_id,
                bed_number=f"{dept.code}-{i+1:03d}",
                department_id=dept.id,
                bed_type=config["types"][i % len(config["types"])],
                floor=dept.floor,
                wing="A" if i < config["count"] // 2 else "B",
                status="available",
                is_active=True
            )
            db.add(bed)
            created += 1

    await db.commit()

    return {
        "success": True,
        "message": f"Created {created} beds across {len(departments) - skipped} departments. {skipped} departments already had beds."
    }
