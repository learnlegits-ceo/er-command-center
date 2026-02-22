from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.bed import Bed, BedAssignment
from app.models.patient import Patient
from app.schemas.bed import BedResponse, BedAssignRequest, BedStatusUpdate
from app.schemas.common import SuccessResponse
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=dict)
async def get_beds(
    department: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all beds with status."""
    query = select(Bed).options(
        selectinload(Bed.department),
        selectinload(Bed.current_patient)
    ).where(
        Bed.tenant_id == current_user.tenant_id,
        Bed.is_active == True
    )

    if department:
        query = query.join(Bed.department).filter_by(name=department)

    if status_filter:
        query = query.where(Bed.status == status_filter)

    query = query.order_by(Bed.bed_number)

    result = await db.execute(query)
    beds = result.scalars().all()

    beds_data = []
    for bed in beds:
        patient_data = None
        if bed.current_patient:
            patient_data = {
                "id": str(bed.current_patient.id),
                "name": bed.current_patient.name
            }

        beds_data.append({
            "id": str(bed.id),
            "bedNumber": bed.bed_number,
            "department": bed.department.name if bed.department else None,
            "bedType": bed.bed_type,
            "floor": bed.floor,
            "wing": bed.wing,
            "status": bed.status,
            "features": bed.features,
            "patient": patient_data
        })

    return {
        "success": True,
        "data": beds_data
    }


@router.get("/{bed_id}", response_model=dict)
async def get_bed(
    bed_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific bed by ID."""
    result = await db.execute(
        select(Bed).options(
            selectinload(Bed.department),
            selectinload(Bed.current_patient)
        ).where(
            Bed.id == bed_id,
            Bed.tenant_id == current_user.tenant_id
        )
    )
    bed = result.scalar_one_or_none()

    if not bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bed not found"
        )

    patient_data = None
    if bed.current_patient:
        patient_data = {
            "id": str(bed.current_patient.id),
            "name": bed.current_patient.name
        }

    return {
        "success": True,
        "data": {
            "id": str(bed.id),
            "bedNumber": bed.bed_number,
            "department": bed.department.name if bed.department else None,
            "bedType": bed.bed_type,
            "floor": bed.floor,
            "wing": bed.wing,
            "status": bed.status,
            "features": bed.features,
            "patient": patient_data,
            "assignedAt": bed.assigned_at
        }
    }


@router.patch("/{bed_id}/status", response_model=dict)
async def update_bed_status(
    bed_id: UUID,
    request: BedStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update bed status."""
    result = await db.execute(
        select(Bed).where(
            Bed.id == bed_id,
            Bed.tenant_id == current_user.tenant_id
        )
    )
    bed = result.scalar_one_or_none()

    if not bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bed not found"
        )

    bed.status = request.status
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(bed.id),
            "bedNumber": bed.bed_number,
            "status": bed.status
        }
    }


@router.post("/{bed_id}/assign", response_model=dict)
async def assign_bed(
    bed_id: UUID,
    request: BedAssignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign bed to a patient."""
    # Get bed
    bed_result = await db.execute(
        select(Bed).where(
            Bed.id == bed_id,
            Bed.tenant_id == current_user.tenant_id
        )
    )
    bed = bed_result.scalar_one_or_none()

    if not bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bed not found"
        )

    if bed.status == "occupied":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bed is already occupied"
        )

    # Get patient
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == request.patient_id,
            Patient.tenant_id == current_user.tenant_id
        )
    )
    patient = patient_result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Release patient's previous bed if any
    if patient.bed_id:
        old_bed_result = await db.execute(
            select(Bed).where(Bed.id == patient.bed_id)
        )
        old_bed = old_bed_result.scalar_one_or_none()
        if old_bed:
            old_bed.status = "cleaning"
            old_bed.current_patient_id = None

    # Assign bed
    bed.status = "occupied"
    bed.current_patient_id = patient.id
    bed.assigned_at = datetime.utcnow()

    patient.bed_id = bed.id

    # Create assignment record
    assignment = BedAssignment(
        bed_id=bed.id,
        patient_id=patient.id,
        assigned_by=current_user.id
    )
    db.add(assignment)

    await db.commit()

    return {
        "success": True,
        "data": {
            "bedId": str(bed.id),
            "bedNumber": bed.bed_number,
            "patientId": str(patient.id),
            "assignedAt": bed.assigned_at
        }
    }


@router.post("/{bed_id}/release", response_model=dict)
async def release_bed(
    bed_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Release bed (on discharge/transfer)."""
    result = await db.execute(
        select(Bed).options(
            selectinload(Bed.current_patient)
        ).where(
            Bed.id == bed_id,
            Bed.tenant_id == current_user.tenant_id
        )
    )
    bed = result.scalar_one_or_none()

    if not bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bed not found"
        )

    # Update active assignment
    assignment_result = await db.execute(
        select(BedAssignment).where(
            BedAssignment.bed_id == bed_id,
            BedAssignment.released_at.is_(None)
        )
    )
    assignment = assignment_result.scalar_one_or_none()

    if assignment:
        assignment.released_at = datetime.utcnow()
        assignment.released_by = current_user.id
        assignment.release_reason = "manual_release"

    # Update patient
    if bed.current_patient:
        bed.current_patient.bed_id = None

    # Release bed
    bed.status = "cleaning"
    bed.current_patient_id = None
    bed.assigned_at = None

    await db.commit()

    return {
        "success": True,
        "data": {
            "bedId": str(bed.id),
            "bedNumber": bed.bed_number,
            "status": "cleaning",
            "releasedAt": datetime.utcnow().isoformat()
        }
    }
