from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.department import Department
from app.models.bed import Bed
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=dict)
async def get_departments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all active departments."""
    query = select(Department).where(
        Department.tenant_id == current_user.tenant_id,
        Department.is_active == True
    ).order_by(Department.name)

    result = await db.execute(query)
    departments = result.scalars().all()

    departments_data = []
    for dept in departments:
        departments_data.append({
            "id": str(dept.id),
            "name": dept.name,
            "code": dept.code,
            "floor": dept.floor,
            "capacity": dept.capacity
        })

    return {
        "success": True,
        "data": {
            "departments": departments_data
        }
    }


@router.get("/{department_id}/doctors", response_model=dict)
async def get_department_doctors(
    department_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all active doctors in a department."""
    query = select(User).where(
        User.tenant_id == current_user.tenant_id,
        User.department_id == department_id,
        User.role == "doctor",
        User.status == "active",
        User.deleted_at.is_(None)
    ).order_by(User.name)

    result = await db.execute(query)
    doctors = result.scalars().all()

    doctors_data = []
    for doctor in doctors:
        doctors_data.append({
            "id": str(doctor.id),
            "name": doctor.name,
            "specialization": doctor.specialization
        })

    return {
        "success": True,
        "data": {
            "doctors": doctors_data
        }
    }


@router.get("/{department_id}/beds", response_model=dict)
async def get_department_beds(
    department_id: str,
    status: Optional[str] = Query("available", description="Filter by bed status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get beds in a department, optionally filtered by status."""
    query = select(Bed).where(
        Bed.tenant_id == current_user.tenant_id,
        Bed.department_id == department_id,
        Bed.is_active == True
    )

    if status and status != "all":
        query = query.where(Bed.status == status)

    query = query.order_by(Bed.bed_number)

    result = await db.execute(query)
    beds = result.scalars().all()

    beds_data = []
    for bed in beds:
        beds_data.append({
            "id": str(bed.id),
            "bedNumber": bed.bed_number,
            "bedType": bed.bed_type,
            "floor": bed.floor,
            "wing": bed.wing,
            "status": bed.status,
            "features": bed.features
        })

    return {
        "success": True,
        "data": {
            "beds": beds_data
        }
    }
