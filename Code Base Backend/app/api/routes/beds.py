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
from app.services.audit import log_action

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

    old_status = bed.status
    bed.status = request.status

    await log_action(
        db, current_user,
        action="update_status",
        entity_type="bed",
        entity_id=bed.id,
        old_values={"status": old_status},
        new_values={"status": bed.status, "bed_number": bed.bed_number},
    )
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
    # Get bed with row-level lock to prevent concurrent assignment
    bed_result = await db.execute(
        select(Bed).where(
            Bed.id == bed_id,
            Bed.tenant_id == current_user.tenant_id
        ).with_for_update()
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
            old_bed.status = "available"
            old_bed.current_patient_id = None
            old_bed.assigned_at = None

    # Assign bed
    bed.status = "occupied"
    bed.current_patient_id = patient.id
    bed.assigned_at = datetime.utcnow()

    patient.bed_id = bed.id

    # If the bed is in a different department than the patient's current dept,
    # the patient physically moves there — update their department so they
    # appear on the receiving dept's dashboard, and audit the transfer.
    transferred_from_dept_id = None
    if bed.department_id and patient.department_id != bed.department_id:
        transferred_from_dept_id = patient.department_id
        patient.department_id = bed.department_id

    # Create assignment record
    assignment = BedAssignment(
        bed_id=bed.id,
        patient_id=patient.id,
        assigned_by=current_user.id
    )
    db.add(assignment)

    await log_action(
        db, current_user,
        action="assign_bed",
        entity_type="bed",
        entity_id=bed.id,
        new_values={
            "bed_number": bed.bed_number,
            "patient_id": str(patient.id),
            "patient_name": patient.name,
            "transferred_from_dept_id": str(transferred_from_dept_id) if transferred_from_dept_id else None,
            "new_dept_id": str(bed.department_id) if bed.department_id else None,
        },
    )

    await db.commit()

    return {
        "success": True,
        "data": {
            "bedId": str(bed.id),
            "bedNumber": bed.bed_number,
            "patientId": str(patient.id),
            "assignedAt": bed.assigned_at,
            "departmentChanged": transferred_from_dept_id is not None,
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

    # Release bed — make available immediately
    released_patient_name = bed.current_patient.name if bed.current_patient else None
    bed.status = "available"
    bed.current_patient_id = None
    bed.assigned_at = None

    await log_action(
        db, current_user,
        action="release_bed",
        entity_type="bed",
        entity_id=bed.id,
        new_values={"bed_number": bed.bed_number, "released_patient": released_patient_name},
    )

    await db.commit()

    return {
        "success": True,
        "data": {
            "bedId": str(bed.id),
            "bedNumber": bed.bed_number,
            "status": "available",
            "releasedAt": datetime.utcnow().isoformat()
        }
    }
