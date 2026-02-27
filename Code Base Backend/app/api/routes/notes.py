from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.patient import Patient, PatientNote
from app.models.alert import Alert
from app.schemas.note import NoteCreate, NoteResponse
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/{patient_id}/notes", response_model=dict)
async def get_patient_notes(
    patient_id: UUID,
    type: Optional[str] = Query("all", description="Note type filter"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get patient notes."""
    # Verify patient exists
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id
        )
    )
    patient = patient_result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Build query
    query = select(PatientNote).where(
        PatientNote.patient_id == patient_id,
        PatientNote.deleted_at.is_(None)
    )

    if type and type != "all":
        query = query.where(PatientNote.note_type == type)

    query = query.order_by(PatientNote.created_at.desc())

    result = await db.execute(query)
    notes = result.scalars().all()

    # Batch-fetch all note creators in one query (avoids N+1 per note)
    creator_ids = {note.created_by for note in notes if note.created_by}
    creators_by_id: dict = {}
    if creator_ids:
        creators_result = await db.execute(
            select(User).where(User.id.in_(creator_ids))
        )
        creators_by_id = {u.id: u for u in creators_result.scalars().all()}

    notes_data = []
    for note in notes:
        creator = creators_by_id.get(note.created_by) if note.created_by else None
        notes_data.append({
            "id": str(note.id),
            "type": note.note_type,
            "content": note.content,
            "createdAt": note.created_at.isoformat() if note.created_at else None,
            "createdBy": {
                "id": str(creator.id),
                "name": creator.name,
                "role": creator.role
            } if creator else None
        })

    return {
        "success": True,
        "data": notes_data
    }


@router.post("/{patient_id}/notes", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_patient_note(
    patient_id: UUID,
    request: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add note to patient."""
    # Verify patient exists
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id
        )
    )
    patient = patient_result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Check role permissions for note type
    if request.type == "doctor" and current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can add doctor notes"
        )

    # Create note
    note = PatientNote(
        patient_id=patient_id,
        note_type=request.type,
        content=request.content,
        is_confidential=request.is_confidential,
        created_by=current_user.id
    )
    db.add(note)

    # Alert: Notify the other role about the note
    # Doctor notes → alert nurses; Nurse notes → alert doctors
    if request.type == "doctor":
        alert = Alert(
            tenant_id=current_user.tenant_id,
            title=f"Doctor Note - {patient.name}",
            message=f"Dr. {current_user.name} added a note for {patient.name}: {request.content[:120]}",
            priority="medium",
            category="Consultation",
            for_roles=["nurse"],
            patient_id=patient_id,
            triggered_by="doctor_note"
        )
        db.add(alert)
    elif request.type == "nurse":
        alert = Alert(
            tenant_id=current_user.tenant_id,
            title=f"Nurse Note - {patient.name}",
            message=f"Nurse {current_user.name} added a note for {patient.name}: {request.content[:120]}",
            priority="medium",
            category="Consultation",
            for_roles=["doctor"],
            patient_id=patient_id,
            triggered_by="nurse_note"
        )
        db.add(alert)

    await db.commit()
    await db.refresh(note)

    return {
        "success": True,
        "data": {
            "id": str(note.id),
            "type": note.note_type,
            "content": note.content,
            "createdAt": note.created_at.isoformat() if note.created_at else None,
            "createdBy": {
                "id": str(current_user.id),
                "name": current_user.name
            }
        }
    }


# This router is included in patients router
# Add to patients.py:
# from .notes import router as notes_router
# Include notes routes under /patients/{patient_id}/notes
