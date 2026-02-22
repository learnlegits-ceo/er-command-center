from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import base64

from app.db.database import get_db
from app.models.user import User
from app.models.patient import Patient, PatientVitals, PatientAllergy, PatientNote
from app.models.department import Department
from app.models.prescription import Prescription
from app.models.triage import AITriageResult
from app.models.bed import Bed, BedAssignment
from app.models.alert import Alert
from app.schemas.patient import (
    PatientCreate, PatientUpdate, PatientResponse,
    PatientListResponse, PatientDischargeRequest
)
from app.schemas.common import SuccessResponse
from app.core.dependencies import get_current_user, require_doctor, require_doctor_or_admin, require_any_staff, PaginationParams
from app.services.triage import TriageService

router = APIRouter()


def _create_alert(db: AsyncSession, tenant_id, title: str, message: str, priority: str,
                  category: str, for_roles: list, patient_id=None, triggered_by="system", metadata=None):
    """Create an in-app alert for the given roles."""
    alert = Alert(
        tenant_id=tenant_id,
        title=title,
        message=message,
        priority=priority,
        category=category,
        for_roles=for_roles,
        patient_id=patient_id,
        triggered_by=triggered_by,
        extra_data=metadata or {}
    )
    db.add(alert)


def _to_iso(value) -> str | None:
    """Convert a stored timestamp string or datetime to ISO 8601 format with UTC timezone."""
    if value is None:
        return None
    if isinstance(value, datetime):
        # If naive datetime (from utcnow()), mark as UTC
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        return value.isoformat()
    s = str(value).strip()
    if not s:
        return None
    # PostgreSQL text-cast timestamps use space instead of T
    if ' ' in s and 'T' not in s:
        s = s.replace(' ', 'T', 1)
    # If no timezone indicator, assume UTC
    if '+' not in s and 'Z' not in s and s[-1].isdigit():
        s = s + "Z"
    return s


def _parse_ts(value) -> datetime:
    """Parse a stored timestamp string (any format) into a naive-UTC datetime for comparison.

    Handles both Python ISO format ('2026-02-14T10:30:00Z') and
    PostgreSQL text format ('2026-02-14 10:30:00+05:30').
    Properly converts timezone offsets to UTC before returning.
    Returns datetime.min if parsing fails so callers can safely use max()/sorted().
    """
    if value is None:
        return datetime.min
    if isinstance(value, datetime):
        if value.tzinfo:
            from datetime import timezone
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
    s = str(value).strip()
    if not s:
        return datetime.min
    # Normalise: replace space separator with T
    if ' ' in s and 'T' not in s:
        s = s.replace(' ', 'T', 1)

    # Extract timezone offset and convert to UTC
    tz_offset_hours = 0
    tz_offset_minutes = 0

    if s.endswith('Z'):
        s = s[:-1]  # UTC, no offset needed
    elif '+' in s[10:]:
        # e.g. 2026-02-14T14:30:00.123456+05:30
        plus_pos = s.rfind('+')
        tz_part = s[plus_pos + 1:]
        s = s[:plus_pos]
        parts = tz_part.split(':')
        tz_offset_hours = int(parts[0]) if parts[0] else 0
        tz_offset_minutes = int(parts[1]) if len(parts) > 1 else 0
    elif s.count('-') == 3:
        # e.g. 2026-02-14T10:30:00-05:00 (negative offset)
        minus_pos = s.rfind('-')
        tz_part = s[minus_pos + 1:]
        s = s[:minus_pos]
        parts = tz_part.split(':')
        tz_offset_hours = -(int(parts[0]) if parts[0] else 0)
        tz_offset_minutes = -(int(parts[1]) if len(parts) > 1 else 0)

    try:
        from datetime import timedelta
        dt = datetime.fromisoformat(s)
        # Subtract the offset to convert to UTC
        dt = dt - timedelta(hours=tz_offset_hours, minutes=tz_offset_minutes)
        return dt
    except (ValueError, TypeError):
        return datetime.min


async def generate_patient_id(db: AsyncSession, tenant_id: UUID) -> str:
    """Generate a unique patient ID."""
    result = await db.execute(
        select(func.count(Patient.id)).where(Patient.tenant_id == tenant_id)
    )
    count = result.scalar() or 0
    return f"P{str(count + 1).zfill(5)}"


@router.get("", response_model=PatientListResponse)
async def get_patients(
    status: Optional[str] = Query("active", description="Patient status filter"),
    department: Optional[str] = None,
    priority: Optional[int] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all patients with filters."""
    query = select(Patient).options(
        selectinload(Patient.department),
        selectinload(Patient.bed),
        selectinload(Patient.assigned_doctor),
        selectinload(Patient.assigned_nurse)
    ).where(
        Patient.tenant_id == current_user.tenant_id,
        Patient.deleted_at.is_(None)
    )

    # Apply filters
    if status and status != "all":
        query = query.where(Patient.status == status)

    if department:
        # Support filtering by department name or code
        query = query.join(Department).where(
            or_(Department.name == department, Department.code == department)
        )

    if priority:
        query = query.where(Patient.priority == priority)

    if search:
        query = query.where(
            or_(
                Patient.name.ilike(f"%{search}%"),
                Patient.patient_id.ilike(f"%{search}%")
            )
        )

    # Get total count using a clean separate query (avoids ORM subquery issues)
    count_query = select(func.count(Patient.id)).where(
        Patient.tenant_id == current_user.tenant_id,
        Patient.deleted_at.is_(None)
    )
    if status and status != "all":
        count_query = count_query.where(Patient.status == status)
    if department:
        count_query = count_query.join(Department).where(
            or_(Department.name == department, Department.code == department)
        )
    if priority:
        count_query = count_query.where(Patient.priority == priority)
    if search:
        count_query = count_query.where(
            or_(
                Patient.name.ilike(f"%{search}%"),
                Patient.patient_id.ilike(f"%{search}%")
            )
        )
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit).order_by(Patient.admitted_at.desc())

    result = await db.execute(query)
    patients = result.scalars().all()

    # Format response
    patients_data = []
    for patient in patients:
        # Get ALL vitals for this patient and pick the latest in Python.
        # This avoids SQL text-ordering bugs (the recorded_at column is String,
        # not DateTime, so different formats sort incorrectly in SQL).
        vitals_result = await db.execute(
            select(PatientVitals)
            .where(PatientVitals.patient_id == patient.id)
        )
        all_vitals = vitals_result.scalars().all()
        latest_vitals = max(all_vitals, key=lambda v: _parse_ts(v.recorded_at)) if all_vitals else None

        vitals_data = None
        last_updated_by = None
        if latest_vitals:
            vitals_data = {
                "hr": latest_vitals.heart_rate,
                "bp": latest_vitals.blood_pressure,
                "spo2": float(latest_vitals.spo2) if latest_vitals.spo2 else None,
                "temp": float(latest_vitals.temperature) if latest_vitals.temperature else None,
                "rr": latest_vitals.respiratory_rate,
                "recordedAt": _to_iso(latest_vitals.recorded_at),
                "source": latest_vitals.source
            }
            # Get the user who recorded vitals
            if latest_vitals.recorded_by:
                recorder_result = await db.execute(
                    select(User).where(User.id == latest_vitals.recorded_by)
                )
                recorder = recorder_result.scalar_one_or_none()
                if recorder:
                    last_updated_by = {
                        "id": str(recorder.id),
                        "name": recorder.name,
                        "role": recorder.role,
                        "time": _to_iso(latest_vitals.recorded_at)
                    }

        # Get latest triage result for reasoning
        # Sort by applied_at (always set explicitly in Python UTC ISO format)
        # instead of created_at (server_default with unreliable timezone)
        triage_result = await db.execute(
            select(AITriageResult)
            .where(AITriageResult.patient_id == patient.id)
        )
        all_triage_for_patient = triage_result.scalars().all()
        latest_triage = None
        if all_triage_for_patient:
            latest_triage = max(all_triage_for_patient, key=lambda t: t.applied_at or '')

        triage_data = None
        if latest_triage:
            triage_data = {
                "reasoning": latest_triage.reasoning,
                "recommendations": latest_triage.recommendations,
                "confidence": float(latest_triage.confidence) if latest_triage.confidence else None,
                "estimatedWaitTime": latest_triage.estimated_wait_time
            }

        # Fallback to admitted_by if no vitals recorded
        if not last_updated_by and patient.admitted_by:
            admitted_by_result = await db.execute(
                select(User).where(User.id == patient.admitted_by)
            )
            admitted_by_user = admitted_by_result.scalar_one_or_none()
            if admitted_by_user:
                last_updated_by = {
                    "id": str(admitted_by_user.id),
                    "name": admitted_by_user.name,
                    "role": admitted_by_user.role,
                    "time": _to_iso(patient.admitted_at)
                }

        patients_data.append({
            "id": str(patient.id),
            "patientId": patient.patient_id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "complaint": patient.complaint,
            "phone": patient.phone,
            "bloodGroup": patient.blood_group,
            "priority": patient.priority,
            "priorityLabel": patient.priority_label,
            "priorityColor": patient.priority_color,
            "status": patient.status,
            "bed": patient.bed.bed_number if patient.bed else None,
            "bedId": str(patient.bed.id) if patient.bed else None,
            "department": patient.department.name if patient.department else None,
            "admittedAt": _to_iso(patient.admitted_at),
            "assignedDoctor": patient.assigned_doctor.name if patient.assigned_doctor else None,
            "assignedNurse": patient.assigned_nurse.name if patient.assigned_nurse else None,
            "lastUpdatedBy": last_updated_by,
            "photo": patient.photo_url,
            "vitals": vitals_data,
            "triage": triage_data,
            "isPoliceCase": patient.is_police_case
        })

    return {
        "success": True,
        "data": {
            "patients": patients_data,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "totalPages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/{patient_id}", response_model=dict)
async def get_patient(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get single patient details."""
    result = await db.execute(
        select(Patient)
        .options(
            selectinload(Patient.department),
            selectinload(Patient.assigned_doctor),
            selectinload(Patient.assigned_nurse),
            selectinload(Patient.bed)
        )
        .where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Get allergies
    allergies_result = await db.execute(
        select(PatientAllergy).where(PatientAllergy.patient_id == patient.id)
    )
    allergies = [a.allergen for a in allergies_result.scalars().all()]

    return {
        "success": True,
        "data": {
            "id": str(patient.id),
            "patientId": patient.patient_id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "emergencyContact": patient.emergency_contact,
            "address": patient.address,
            "complaint": patient.complaint,
            "history": patient.history,
            "allergies": allergies,
            "priority": patient.priority,
            "priorityLabel": patient.priority_label,
            "status": patient.status,
            "bed": patient.bed.bed_number if patient.bed else None,
            "department": patient.department.name if patient.department else None,
            "admittedAt": _to_iso(patient.admitted_at),
            "assignedDoctor": {
                "id": str(patient.assigned_doctor.id),
                "name": patient.assigned_doctor.name
            } if patient.assigned_doctor else None,
            "assignedNurse": {
                "id": str(patient.assigned_nurse.id),
                "name": patient.assigned_nurse.name
            } if patient.assigned_nurse else None,
            "photo": patient.photo_url,
            "isPoliceCase": patient.is_police_case,
            "policeCaseType": patient.police_case_type
        }
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_patient(
    request: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register new patient (New ER Arrival)."""
    # Generate patient ID
    patient_id = await generate_patient_id(db, current_user.tenant_id)

    # Handle doctor assignment
    assigned_doctor_id = request.assigned_doctor_id

    # If department is provided but no doctor, auto-assign an available doctor from that department
    if request.department_id and not assigned_doctor_id:
        # Find an active doctor in the department with least patients assigned
        doctor_query = select(User).where(
            User.tenant_id == current_user.tenant_id,
            User.department_id == request.department_id,
            User.role == "doctor",
            User.status == "active",
            User.deleted_at.is_(None)
        )
        doctor_result = await db.execute(doctor_query)
        available_doctors = doctor_result.scalars().all()

        if available_doctors:
            # Get patient counts for each doctor to find the one with least workload
            doctor_workloads = []
            for doctor in available_doctors:
                count_result = await db.execute(
                    select(func.count(Patient.id)).where(
                        Patient.assigned_doctor_id == doctor.id,
                        Patient.status.in_(["pending_triage", "admitted", "active"]),
                        Patient.deleted_at.is_(None)
                    )
                )
                patient_count = count_result.scalar() or 0
                doctor_workloads.append((doctor.id, patient_count))

            # Sort by workload and pick the doctor with least patients
            doctor_workloads.sort(key=lambda x: x[1])
            assigned_doctor_id = doctor_workloads[0][0]

    # Create patient
    patient = Patient(
        tenant_id=current_user.tenant_id,
        patient_id=patient_id,
        name=request.name,
        age=request.age,
        gender=request.gender,
        phone=request.phone,
        emergency_contact=request.emergency_contact,
        complaint=request.complaint,
        history=request.history,
        address=request.address,
        blood_group=request.blood_group,
        is_police_case=request.is_police_case,
        police_case_type=request.police_case_type,
        department_id=request.department_id,
        assigned_doctor_id=assigned_doctor_id,
        status="pending_triage",
        admitted_at=datetime.utcnow(),
        admitted_by=current_user.id
    )
    db.add(patient)
    await db.flush()

    # Add initial vitals if provided
    vitals_dict = None
    if request.vitals:
        initial_vitals_ts = datetime.utcnow().isoformat() + "Z"
        vitals = PatientVitals(
            patient_id=patient.id,
            heart_rate=int(request.vitals.hr) if request.vitals.hr else None,
            blood_pressure=request.vitals.bp,
            spo2=float(request.vitals.spo2) if request.vitals.spo2 else None,
            temperature=float(request.vitals.temp) if request.vitals.temp else None,
            respiratory_rate=int(request.vitals.rr) if hasattr(request.vitals, 'rr') and request.vitals.rr else None,
            recorded_by=current_user.id,
            recorded_at=initial_vitals_ts,
            created_at=initial_vitals_ts,
            source="manual"
        )
        db.add(vitals)
        vitals_dict = {
            "hr": request.vitals.hr,
            "bp": request.vitals.bp,
            "spo2": request.vitals.spo2,
            "temp": request.vitals.temp
        }

    # Run AI Triage automatically
    triage_service = TriageService()
    triage_result = await triage_service.run_triage(
        complaint=request.complaint,
        age=request.age,
        gender=request.gender,
        vitals=vitals_dict,
        history=request.history
    )

    # Update patient with triage results (L1-L4 priority)
    patient.priority = triage_result.get("priority")
    patient.priority_label = triage_result.get("priority_label")
    patient.priority_color = triage_result.get("priority_color")
    patient.status = "active"  # Move from pending_triage to active

    # Store triage result
    triage_record = AITriageResult(
        tenant_id=current_user.tenant_id,
        patient_id=patient.id,
        input_complaint=request.complaint,
        input_vitals=vitals_dict,
        input_age=request.age,
        input_gender=request.gender,
        input_history=request.history,
        priority=triage_result.get("priority"),
        priority_label=triage_result.get("priority_label"),
        priority_color=triage_result.get("priority_color"),
        confidence=triage_result.get("confidence"),
        reasoning=triage_result.get("reasoning"),
        recommendations=triage_result.get("recommendations"),
        suggested_department=triage_result.get("suggested_department"),
        estimated_wait_time=triage_result.get("estimated_wait_time"),
        groq_model=triage_result.get("groq_model"),
        groq_request_id=triage_result.get("groq_request_id"),
        prompt_tokens=triage_result.get("prompt_tokens"),
        completion_tokens=triage_result.get("completion_tokens"),
        total_tokens=triage_result.get("total_tokens"),
        processing_time_ms=triage_result.get("processing_time_ms"),
        temperature=triage_result.get("temperature"),
        is_applied=True,
        applied_at=datetime.utcnow().isoformat() + "Z",
        applied_by=current_user.id,
        created_at=datetime.utcnow().isoformat() + "Z"
    )
    db.add(triage_record)

    # Handle bed assignment
    assigned_bed = None
    if request.bed_id:
        # Manual bed selection
        bed_result = await db.execute(
            select(Bed).where(
                Bed.id == request.bed_id,
                Bed.tenant_id == current_user.tenant_id,
                Bed.status == "available"
            )
        )
        assigned_bed = bed_result.scalar_one_or_none()
    elif request.auto_assign_bed and request.department_id:
        # Auto-assign available bed from department, prioritize by triage level
        bed_query = select(Bed).where(
            Bed.tenant_id == current_user.tenant_id,
            Bed.department_id == request.department_id,
            Bed.status == "available",
            Bed.is_active == True
        ).order_by(Bed.bed_number).limit(1)
        bed_result = await db.execute(bed_query)
        assigned_bed = bed_result.scalar_one_or_none()

    if assigned_bed:
        # Assign bed to patient
        assigned_bed.status = "occupied"
        assigned_bed.current_patient_id = patient.id
        assigned_bed.assigned_at = datetime.utcnow().isoformat() + "Z"
        patient.bed_id = assigned_bed.id

        # Create bed assignment record
        bed_assignment = BedAssignment(
            bed_id=assigned_bed.id,
            patient_id=patient.id,
            assigned_by=current_user.id
        )
        db.add(bed_assignment)

    await db.commit()

    # Alert: New patient registered
    _create_alert(
        db, current_user.tenant_id,
        title=f"New Patient - {request.name}",
        message=f"{request.name} ({request.age}{request.gender[0].upper()}) admitted with complaint: {request.complaint}. Priority: {patient.priority_label or 'Pending'}.",
        priority="medium",
        category="Patient Registration",
        for_roles=["nurse", "doctor"],
        patient_id=patient.id,
        triggered_by="patient_registration"
    )
    await db.commit()

    # Reload patient with relationships
    result = await db.execute(
        select(Patient).options(
            selectinload(Patient.department),
            selectinload(Patient.assigned_doctor),
            selectinload(Patient.bed)
        ).where(Patient.id == patient.id)
    )
    patient = result.scalar_one()

    return {
        "success": True,
        "data": {
            "id": str(patient.id),
            "patientId": patient.patient_id,
            "name": patient.name,
            "priority": patient.priority,
            "priorityLabel": patient.priority_label,
            "priorityColor": patient.priority_color,
            "status": patient.status,
            "department": patient.department.name if patient.department else None,
            "assignedDoctor": patient.assigned_doctor.name if patient.assigned_doctor else None,
            "bed": patient.bed.bed_number if patient.bed else None,
            "bedId": str(patient.bed.id) if patient.bed else None,
            "triage": {
                "reasoning": triage_result.get("reasoning"),
                "recommendations": triage_result.get("recommendations"),
                "confidence": triage_result.get("confidence"),
                "estimatedWaitTime": triage_result.get("estimated_wait_time")
            },
            "message": "Patient registered and triaged successfully."
        }
    }


@router.put("/{patient_id}", response_model=dict)
async def update_patient(
    patient_id: UUID,
    request: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update patient details."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)

    # Track if triage-relevant fields changed
    triage_relevant_fields = {"complaint", "history", "age", "gender"}
    triage_fields_changed = any(field in triage_relevant_fields for field in update_data.keys())

    # Capture patient data before modifications for re-triage
    patient_obj_id = patient.id
    tenant_id = current_user.tenant_id

    for field, value in update_data.items():
        if hasattr(patient, field):
            setattr(patient, field, value)

    await db.commit()
    await db.refresh(patient)

    # Auto re-triage if triage-relevant fields changed
    triage_data = None
    if triage_fields_changed:
        try:
            # Fetch latest vitals
            vitals_result = await db.execute(
                select(PatientVitals).where(
                    PatientVitals.patient_id == patient_obj_id
                ).order_by(PatientVitals.created_at.desc()).limit(1)
            )
            latest_vitals = vitals_result.scalar_one_or_none()
            vitals_dict = {}
            if latest_vitals:
                vitals_dict = {
                    "hr": str(latest_vitals.heart_rate) if latest_vitals.heart_rate else None,
                    "bp": latest_vitals.blood_pressure,
                    "spo2": str(latest_vitals.spo2) if latest_vitals.spo2 else None,
                    "temp": str(latest_vitals.temperature) if latest_vitals.temperature else None,
                }

            # Fetch active prescriptions
            rx_result = await db.execute(
                select(Prescription).where(
                    Prescription.patient_id == patient_obj_id,
                    Prescription.status == "active"
                ).order_by(Prescription.prescribed_at.desc())
            )
            active_prescriptions = rx_result.scalars().all()
            treatments = []
            for rx in active_prescriptions:
                parts = [rx.medication_name]
                if rx.dosage:
                    parts.append(rx.dosage)
                if rx.frequency:
                    parts.append(rx.frequency)
                treatments.append(" - ".join(parts))

            triage_service = TriageService()
            triage_result = await triage_service.run_triage(
                complaint=patient.complaint,
                age=patient.age,
                gender=patient.gender,
                vitals=vitals_dict,
                history=patient.history,
                treatments=treatments
            )

            # Update patient priority
            patient.priority = triage_result.get("priority")
            patient.priority_label = triage_result.get("priority_label")
            patient.priority_color = triage_result.get("priority_color")

            # Store triage result
            triage_record = AITriageResult(
                tenant_id=tenant_id,
                patient_id=patient_obj_id,
                input_complaint=patient.complaint,
                input_vitals=vitals_dict,
                input_age=patient.age,
                input_gender=patient.gender,
                input_history=patient.history,
                priority=triage_result.get("priority"),
                priority_label=triage_result.get("priority_label"),
                priority_color=triage_result.get("priority_color"),
                confidence=triage_result.get("confidence"),
                reasoning=triage_result.get("reasoning"),
                recommendations=triage_result.get("recommendations"),
                suggested_department=triage_result.get("suggested_department"),
                estimated_wait_time=triage_result.get("estimated_wait_time"),
                groq_model=triage_result.get("groq_model"),
                groq_request_id=triage_result.get("groq_request_id"),
                prompt_tokens=triage_result.get("prompt_tokens"),
                completion_tokens=triage_result.get("completion_tokens"),
                total_tokens=triage_result.get("total_tokens"),
                processing_time_ms=triage_result.get("processing_time_ms"),
                temperature=triage_result.get("temperature"),
                is_applied=True,
                applied_at=datetime.utcnow().isoformat() + "Z",
                applied_by=current_user.id,
                created_at=datetime.utcnow().isoformat() + "Z"
            )
            db.add(triage_record)
            await db.commit()

            triage_data = {
                "priority": triage_result.get("priority"),
                "priorityLabel": triage_result.get("priority_label"),
                "reasoning": triage_result.get("reasoning"),
            }
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Auto re-triage after patient edit failed for {patient_id}: {e}")

    return {
        "success": True,
        "data": {
            "id": str(patient.id),
            "patientId": patient.patient_id,
            "name": patient.name,
            "status": patient.status,
            "triage": triage_data
        }
    }


@router.post("/{patient_id}/photo", response_model=dict)
async def upload_patient_photo(
    patient_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload/update patient photo."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Read file and store as base64 data URL
    contents = await file.read()
    content_type = file.content_type or "image/jpeg"
    b64_data = base64.b64encode(contents).decode("utf-8")
    photo_url = f"data:{content_type};base64,{b64_data}"
    patient.photo_url = photo_url

    await db.commit()

    return {
        "success": True,
        "data": {
            "photoUrl": photo_url
        }
    }


@router.post("/{patient_id}/discharge", response_model=dict)
async def discharge_patient(
    patient_id: UUID,
    request: PatientDischargeRequest,
    current_user: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db)
):
    """Discharge patient."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Update patient status
    patient.status = "discharged"
    patient.discharged_at = datetime.utcnow()
    patient.discharged_by = current_user.id
    patient.discharge_notes = request.discharge_notes
    patient.follow_up_date = request.follow_up_date

    # Release bed if assigned
    if patient.bed_id:
        bed_result = await db.execute(
            select(Bed).where(Bed.id == patient.bed_id)
        )
        bed = bed_result.scalar_one_or_none()
        if bed:
            bed.status = "cleaning"
            bed.current_patient_id = None
        patient.bed_id = None

    # Add discharge prescriptions
    if request.prescriptions:
        for rx in request.prescriptions:
            prescription = Prescription(
                patient_id=patient.id,
                medication_name=rx.get("medication"),
                dosage=rx.get("dosage"),
                frequency=rx.get("frequency"),
                duration=rx.get("duration"),
                prescribed_by=current_user.id
            )
            db.add(prescription)

    # Alert: Patient discharged
    _create_alert(
        db, current_user.tenant_id,
        title=f"Patient Discharged - {patient.name}",
        message=f"{patient.name} has been discharged by {current_user.name}. {('Notes: ' + request.discharge_notes[:100]) if request.discharge_notes else ''}",
        priority="low",
        category="Discharge",
        for_roles=["nurse", "admin"],
        patient_id=patient.id,
        triggered_by="discharge"
    )
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(patient.id),
            "status": "discharged",
            "dischargedAt": patient.discharged_at,
            "dischargedBy": current_user.name
        }
    }


@router.post("/{patient_id}/transfer-to-opd", response_model=dict)
async def transfer_patient_to_opd(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Transfer a settled patient to OPD (Outpatient Department)."""
    try:
        result = await db.execute(
            select(Patient).where(
                Patient.id == patient_id,
                Patient.tenant_id == current_user.tenant_id,
                Patient.deleted_at.is_(None)
            )
        )
        patient = result.scalar_one_or_none()

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        if patient.status in ("discharged", "transferred_to_opd"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient has already been discharged or transferred"
            )

        # Find OPD department
        opd_result = await db.execute(
            select(Department).where(
                Department.tenant_id == current_user.tenant_id,
                or_(
                    Department.code == "OPD",
                    Department.name.ilike("%outpatient%"),
                    Department.name.ilike("%opd%")
                ),
                Department.is_active == True
            ).limit(1)
        )
        opd_dept = opd_result.scalar_one_or_none()

        # Release bed if assigned
        if patient.bed_id:
            bed_result = await db.execute(
                select(Bed).where(Bed.id == patient.bed_id)
            )
            bed = bed_result.scalar_one_or_none()
            if bed:
                bed.status = "cleaning"
                bed.current_patient_id = None
            patient.bed_id = None

        # Update patient department and status
        if opd_dept:
            patient.department_id = opd_dept.id
        patient.status = "transferred_to_opd"

        # Alert: Patient transferred to OPD
        _create_alert(
            db, current_user.tenant_id,
            title=f"Transfer to OPD - {patient.name}",
            message=f"{patient.name} has been transferred from ER to OPD by {current_user.name}.",
            priority="low",
            category="Transfer",
            for_roles=["nurse", "doctor"],
            patient_id=patient.id,
            triggered_by="opd_transfer"
        )
        await db.commit()

        return {
            "success": True,
            "data": {
                "id": str(patient.id),
                "status": "transferred_to_opd",
                "department": opd_dept.name if opd_dept else "OPD",
                "transferredAt": datetime.utcnow().isoformat() + "Z",
                "transferredBy": current_user.name,
                "message": "Patient transferred to OPD successfully."
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transfer failed: {str(e)}"
        )


@router.post("/{patient_id}/triage", response_model=dict)
async def run_patient_triage(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Run or re-run AI triage on a patient."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Get latest vitals — fetch all and pick latest in Python
    vitals_result = await db.execute(
        select(PatientVitals)
        .where(PatientVitals.patient_id == patient.id)
    )
    all_vitals = vitals_result.scalars().all()
    latest_vitals = max(all_vitals, key=lambda v: _parse_ts(v.recorded_at)) if all_vitals else None

    vitals_dict = None
    if latest_vitals:
        vitals_dict = {
            "hr": str(latest_vitals.heart_rate) if latest_vitals.heart_rate else None,
            "bp": latest_vitals.blood_pressure,
            "spo2": str(latest_vitals.spo2) if latest_vitals.spo2 else None,
            "temp": str(latest_vitals.temperature) if latest_vitals.temperature else None
        }

    # Run AI Triage
    triage_service = TriageService()
    triage_result = await triage_service.run_triage(
        complaint=patient.complaint,
        age=patient.age,
        gender=patient.gender,
        vitals=vitals_dict,
        history=patient.history
    )

    # Update patient with triage results (L1-L4 priority)
    patient.priority = triage_result.get("priority")
    patient.priority_label = triage_result.get("priority_label")
    patient.priority_color = triage_result.get("priority_color")
    if patient.status == "pending_triage":
        patient.status = "active"

    # Store triage result
    triage_record = AITriageResult(
        tenant_id=current_user.tenant_id,
        patient_id=patient.id,
        input_complaint=patient.complaint,
        input_vitals=vitals_dict,
        input_age=patient.age,
        input_gender=patient.gender,
        input_history=patient.history,
        priority=triage_result.get("priority"),
        priority_label=triage_result.get("priority_label"),
        priority_color=triage_result.get("priority_color"),
        confidence=triage_result.get("confidence"),
        reasoning=triage_result.get("reasoning"),
        recommendations=triage_result.get("recommendations"),
        suggested_department=triage_result.get("suggested_department"),
        estimated_wait_time=triage_result.get("estimated_wait_time"),
        groq_model=triage_result.get("groq_model"),
        groq_request_id=triage_result.get("groq_request_id"),
        prompt_tokens=triage_result.get("prompt_tokens"),
        completion_tokens=triage_result.get("completion_tokens"),
        total_tokens=triage_result.get("total_tokens"),
        processing_time_ms=triage_result.get("processing_time_ms"),
        temperature=triage_result.get("temperature"),
        is_applied=True,
        applied_at=datetime.utcnow().isoformat() + "Z",
        applied_by=current_user.id,
        created_at=datetime.utcnow().isoformat() + "Z"
    )
    db.add(triage_record)

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(patient.id),
            "patientId": patient.patient_id,
            "name": patient.name,
            "priority": patient.priority,
            "priorityLabel": patient.priority_label,
            "priorityColor": patient.priority_color,
            "triage": {
                "reasoning": triage_result.get("reasoning"),
                "recommendations": triage_result.get("recommendations"),
                "confidence": triage_result.get("confidence"),
                "estimatedWaitTime": triage_result.get("estimated_wait_time")
            },
            "message": "Patient triaged successfully."
        }
    }


@router.post("/batch-triage", response_model=dict)
async def batch_triage_patients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Run AI triage on all patients without proper triage (priority is null or not 1-4)."""
    # Find patients without proper triage
    result = await db.execute(
        select(Patient).where(
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None),
            Patient.status != "discharged",
            or_(
                Patient.priority.is_(None),
                Patient.priority < 1,
                Patient.priority > 4
            )
        )
    )
    patients = result.scalars().all()

    triaged_count = 0
    triage_service = TriageService()

    for patient in patients:
        # Get latest vitals — fetch all and pick latest in Python
        vitals_result = await db.execute(
            select(PatientVitals)
            .where(PatientVitals.patient_id == patient.id)
        )
        all_vitals = vitals_result.scalars().all()
        latest_vitals = max(all_vitals, key=lambda v: _parse_ts(v.recorded_at)) if all_vitals else None

        vitals_dict = None
        if latest_vitals:
            vitals_dict = {
                "hr": str(latest_vitals.heart_rate) if latest_vitals.heart_rate else None,
                "bp": latest_vitals.blood_pressure,
                "spo2": str(latest_vitals.spo2) if latest_vitals.spo2 else None,
                "temp": str(latest_vitals.temperature) if latest_vitals.temperature else None
            }

        # Run AI Triage
        triage_result = await triage_service.run_triage(
            complaint=patient.complaint or "General checkup",
            age=patient.age,
            gender=patient.gender,
            vitals=vitals_dict,
            history=patient.history
        )

        # Update patient with triage results
        patient.priority = triage_result.get("priority")
        patient.priority_label = triage_result.get("priority_label")
        patient.priority_color = triage_result.get("priority_color")
        if patient.status == "pending_triage":
            patient.status = "active"

        # Store triage result
        triage_record = AITriageResult(
            tenant_id=current_user.tenant_id,
            patient_id=patient.id,
            input_complaint=patient.complaint,
            input_vitals=vitals_dict,
            input_age=patient.age,
            input_gender=patient.gender,
            input_history=patient.history,
            priority=triage_result.get("priority"),
            priority_label=triage_result.get("priority_label"),
            priority_color=triage_result.get("priority_color"),
            confidence=triage_result.get("confidence"),
            reasoning=triage_result.get("reasoning"),
            recommendations=triage_result.get("recommendations"),
            suggested_department=triage_result.get("suggested_department"),
            estimated_wait_time=triage_result.get("estimated_wait_time"),
            groq_model=triage_result.get("groq_model"),
            processing_time_ms=triage_result.get("processing_time_ms"),
            is_applied=True,
            applied_at=datetime.utcnow().isoformat() + "Z",
            applied_by=current_user.id,
            created_at=datetime.utcnow().isoformat() + "Z"
        )
        db.add(triage_record)
        triaged_count += 1

    await db.commit()

    return {
        "success": True,
        "data": {
            "triaged_count": triaged_count,
            "message": f"Successfully triaged {triaged_count} patients."
        }
    }


@router.get("/{patient_id}/vitals", response_model=dict)
async def get_patient_vitals_history(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all vitals history for a patient."""
    # Verify patient exists
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get all vitals, sorted in Python to avoid text-column ordering bugs
    vitals_result = await db.execute(
        select(PatientVitals)
        .where(PatientVitals.patient_id == patient_id)
    )
    vitals_list = sorted(
        vitals_result.scalars().all(),
        key=lambda v: _parse_ts(v.recorded_at),
        reverse=True
    )

    vitals_data = []
    for vitals in vitals_list:
        # Get recorder info
        recorder = None
        if vitals.recorded_by:
            recorder_result = await db.execute(
                select(User).where(User.id == vitals.recorded_by)
            )
            recorder_user = recorder_result.scalar_one_or_none()
            if recorder_user:
                recorder = {
                    "id": str(recorder_user.id),
                    "name": recorder_user.name,
                    "role": recorder_user.role
                }

        vitals_data.append({
            "id": str(vitals.id),
            "hr": vitals.heart_rate,
            "bp": vitals.blood_pressure,
            "spo2": float(vitals.spo2) if vitals.spo2 else None,
            "temp": float(vitals.temperature) if vitals.temperature else None,
            "rr": vitals.respiratory_rate,
            "source": vitals.source,
            "recordedAt": _to_iso(vitals.recorded_at),
            "recordedBy": recorder
        })

    return {
        "success": True,
        "data": {
            "vitals": vitals_data
        }
    }


@router.post("/{patient_id}/vitals", response_model=dict)
async def add_patient_vitals(
    patient_id: UUID,
    vitals_input: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add new vitals for a patient."""
    # Verify patient exists
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Capture patient data before commit (commit expires SQLAlchemy objects)
    patient_name = patient.name
    patient_complaint = patient.complaint
    patient_age = patient.age
    patient_gender = patient.gender
    patient_history = patient.history
    patient_obj_id = patient.id
    tenant_id = current_user.tenant_id
    old_priority = patient.priority  # Track for alert on priority change

    # Create vitals record
    now_iso = datetime.utcnow().isoformat() + "Z"
    vitals = PatientVitals(
        patient_id=patient.id,
        heart_rate=int(vitals_input.get("hr")) if vitals_input.get("hr") else None,
        blood_pressure=vitals_input.get("bp"),
        spo2=float(vitals_input.get("spo2")) if vitals_input.get("spo2") else None,
        temperature=float(vitals_input.get("temp")) if vitals_input.get("temp") else None,
        respiratory_rate=int(vitals_input.get("rr")) if vitals_input.get("rr") else None,
        recorded_by=current_user.id,
        recorded_at=now_iso,
        created_at=now_iso,
        source=vitals_input.get("source", "manual")
    )
    db.add(vitals)
    await db.flush()
    await db.refresh(vitals)
    await db.commit()

    # Auto re-triage with updated vitals
    triage_data = None
    try:
        vitals_dict = {
            "hr": str(vitals.heart_rate) if vitals.heart_rate else None,
            "bp": vitals.blood_pressure,
            "spo2": str(vitals.spo2) if vitals.spo2 else None,
            "temp": str(vitals.temperature) if vitals.temperature else None,
        }

        # Fetch active prescriptions for context (non-blocking)
        current_treatments = []
        try:
            rx_result = await db.execute(
                select(Prescription).where(
                    Prescription.patient_id == patient_obj_id,
                    Prescription.status == "active"
                ).order_by(Prescription.prescribed_at.desc())
            )
            for rx in rx_result.scalars().all():
                parts = [rx.medication_name]
                if rx.dosage:
                    parts.append(rx.dosage)
                if rx.frequency:
                    parts.append(rx.frequency)
                current_treatments.append(" - ".join(parts))
        except Exception:
            pass

        print(f"[TRIAGE] Re-triage for patient {patient_id}: vitals={vitals_dict}, treatments={len(current_treatments)}")

        triage_service = TriageService()
        triage_result = await triage_service.run_triage(
            complaint=patient_complaint,
            age=patient_age,
            gender=patient_gender,
            vitals=vitals_dict,
            history=patient_history,
            treatments=current_treatments
        )

        print(f"[TRIAGE] Result: priority={triage_result.get('priority')}, reasoning={triage_result.get('reasoning', '')[:80]}")

        # Update patient priority
        patient_reload = await db.execute(
            select(Patient).where(Patient.id == patient_obj_id)
        )
        patient_fresh = patient_reload.scalar_one_or_none()
        if patient_fresh:
            patient_fresh.priority = triage_result.get("priority")
            patient_fresh.priority_label = triage_result.get("priority_label")
            patient_fresh.priority_color = triage_result.get("priority_color")

        # Store triage result for audit trail
        triage_record = AITriageResult(
            tenant_id=tenant_id,
            patient_id=patient_obj_id,
            input_complaint=patient_complaint,
            input_vitals=vitals_dict,
            input_age=patient_age,
            input_gender=patient_gender,
            input_history=patient_history,
            priority=triage_result.get("priority"),
            priority_label=triage_result.get("priority_label"),
            priority_color=triage_result.get("priority_color"),
            confidence=triage_result.get("confidence"),
            reasoning=triage_result.get("reasoning"),
            recommendations=triage_result.get("recommendations"),
            suggested_department=triage_result.get("suggested_department"),
            estimated_wait_time=triage_result.get("estimated_wait_time"),
            groq_model=triage_result.get("groq_model"),
            groq_request_id=triage_result.get("groq_request_id"),
            prompt_tokens=triage_result.get("prompt_tokens"),
            completion_tokens=triage_result.get("completion_tokens"),
            total_tokens=triage_result.get("total_tokens"),
            processing_time_ms=triage_result.get("processing_time_ms"),
            temperature=triage_result.get("temperature"),
            is_applied=True,
            applied_at=now_iso,
            applied_by=current_user.id,
            created_at=now_iso
        )
        db.add(triage_record)
        await db.commit()

        triage_data = {
            "priority": triage_result.get("priority"),
            "priorityLabel": triage_result.get("priority_label"),
            "reasoning": triage_result.get("reasoning"),
            "recommendations": triage_result.get("recommendations"),
            "confidence": triage_result.get("confidence"),
            "estimatedWaitTime": triage_result.get("estimated_wait_time"),
        }
    except Exception as e:
        import traceback
        print(f"[TRIAGE] ERROR: Re-triage failed for patient {patient_id}: {e}")
        traceback.print_exc()

    # Alert: Vitals recorded and triage updated
    try:
        new_priority = triage_data.get("priority") if triage_data else None
        priority_changed = new_priority is not None and new_priority != old_priority
        if priority_changed:
            alert_priority = "high" if new_priority in (1, 2) else "medium"
            _create_alert(
                db, tenant_id,
                title=f"Triage Changed - {patient_name}",
                message=f"Vitals update triggered triage change from L{old_priority or '?'} to L{new_priority} for {patient_name}. {triage_data.get('reasoning') or ''}",
                priority=alert_priority,
                category="Triage",
                for_roles=["nurse", "doctor", "admin"],
                patient_id=patient_obj_id,
                triggered_by="vitals_retriage"
            )
        else:
            _create_alert(
                db, tenant_id,
                title=f"Vitals Updated - {patient_name}",
                message=f"New vitals recorded for {patient_name}: HR {vitals_input.get('hr') or '-'}, SpO2 {vitals_input.get('spo2') or '-'}%, Temp {vitals_input.get('temp') or '-'}°.",
                priority="low",
                category="Vitals",
                for_roles=["nurse", "doctor"],
                patient_id=patient_obj_id,
                triggered_by="vitals_update"
            )
        await db.commit()
    except Exception:
        pass  # Don't fail the vitals response if alert creation fails

    return {
        "success": True,
        "data": {
            "id": str(vitals.id),
            "message": "Vitals recorded successfully.",
            "vitals": {
                "hr": vitals.heart_rate,
                "bp": vitals.blood_pressure,
                "spo2": float(vitals.spo2) if vitals.spo2 else None,
                "temp": float(vitals.temperature) if vitals.temperature else None,
                "rr": vitals.respiratory_rate,
                "recordedAt": now_iso,
                "source": vitals.source
            },
            "recordedBy": {
                "id": str(current_user.id),
                "name": current_user.name,
                "role": current_user.role
            },
            "triage": triage_data
        }
    }


@router.get("/{patient_id}/triage-timeline", response_model=dict)
async def get_patient_triage_timeline(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all triage history for a patient."""
    # Verify patient exists
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get all triage results and sort by applied_at (always Python UTC ISO)
    triage_result = await db.execute(
        select(AITriageResult)
        .where(AITriageResult.patient_id == patient_id)
    )
    all_triage = triage_result.scalars().all()

    # Sort oldest-first so we can compute fromPriority transitions
    triage_list = sorted(all_triage, key=lambda t: t.applied_at or '')

    timeline_data = []
    prev_priority = None
    for i, triage in enumerate(triage_list):
        # Get who applied this triage
        applied_by_user = None
        if triage.applied_by:
            user_result = await db.execute(
                select(User).where(User.id == triage.applied_by)
            )
            applied_by_user = user_result.scalar_one_or_none()

        timeline_data.append({
            "id": str(triage.id),
            "fromPriority": prev_priority,
            "toPriority": triage.priority,
            "priorityLabel": triage.priority_label,
            "priorityColor": triage.priority_color,
            "reasoning": triage.reasoning,
            "recommendations": triage.recommendations,
            "confidence": float(triage.confidence) if triage.confidence else None,
            "estimatedWaitTime": triage.estimated_wait_time,
            "suggestedDepartment": triage.suggested_department,
            "isApplied": triage.is_applied,
            "appliedAt": _to_iso(triage.applied_at),
            "appliedBy": {
                "id": str(applied_by_user.id),
                "name": applied_by_user.name,
                "role": applied_by_user.role
            } if applied_by_user else None,
            "createdAt": _to_iso(triage.created_at),
            "source": "ai" if triage.groq_model else "manual"
        })
        prev_priority = triage.priority

    return {
        "success": True,
        "data": {
            "timeline": list(reversed(timeline_data))  # Most recent first
        }
    }


@router.post("/{patient_id}/recommend-triage-shift", response_model=dict)
async def recommend_triage_shift(
    patient_id: UUID,
    context: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get LLM recommendation for shifting triage level based on current condition."""
    # Get patient with current triage
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get latest vitals — fetch all and pick latest in Python
    vitals_result = await db.execute(
        select(PatientVitals)
        .where(PatientVitals.patient_id == patient.id)
    )
    all_vitals = vitals_result.scalars().all()
    latest_vitals = max(all_vitals, key=lambda v: _parse_ts(v.recorded_at)) if all_vitals else None

    vitals_dict = None
    if latest_vitals:
        vitals_dict = {
            "hr": str(latest_vitals.heart_rate) if latest_vitals.heart_rate else None,
            "bp": latest_vitals.blood_pressure,
            "spo2": str(latest_vitals.spo2) if latest_vitals.spo2 else None,
            "temp": str(latest_vitals.temperature) if latest_vitals.temperature else None
        }

    # Run triage with additional context about condition change
    triage_service = TriageService()

    # Build context for re-evaluation
    additional_context = context.get("notes", "")
    procedure_done = context.get("procedure", "")
    condition_change = context.get("conditionChange", "")

    enhanced_history = f"""
Current Triage Level: L{patient.priority} ({patient.priority_label})
Original Complaint: {patient.complaint}
Patient History: {patient.history or 'None'}

--- CONDITION UPDATE ---
Procedure/Treatment Done: {procedure_done or 'None specified'}
Condition Change: {condition_change or 'Not specified'}
Additional Notes: {additional_context or 'None'}
---
Please re-evaluate the triage level considering the above updates.
"""

    triage_result = await triage_service.run_triage(
        complaint=patient.complaint,
        age=patient.age,
        gender=patient.gender,
        vitals=vitals_dict,
        history=enhanced_history
    )

    return {
        "success": True,
        "data": {
            "currentPriority": patient.priority,
            "currentLabel": patient.priority_label,
            "recommendedPriority": triage_result.get("priority"),
            "recommendedLabel": triage_result.get("priority_label"),
            "reasoning": triage_result.get("reasoning"),
            "recommendations": triage_result.get("recommendations"),
            "confidence": triage_result.get("confidence"),
            "estimatedWaitTime": triage_result.get("estimated_wait_time"),
            "shouldShift": triage_result.get("priority") != patient.priority
        }
    }


@router.post("/{patient_id}/shift-triage", response_model=dict)
async def shift_patient_triage(
    patient_id: UUID,
    shift_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually shift patient triage level with optional LLM reasoning."""
    # Get patient
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_priority = shift_data.get("priority")
    if not new_priority or new_priority not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Invalid priority level (must be 1-4)")

    old_priority = patient.priority

    # Priority label map
    priority_labels = {
        1: "L1 - Critical",
        2: "L2 - Emergent",
        3: "L3 - Urgent",
        4: "L4 - Non-Urgent"
    }
    priority_colors = {
        1: "red",
        2: "orange",
        3: "yellow",
        4: "green"
    }

    # Update patient priority
    patient.priority = new_priority
    patient.priority_label = priority_labels[new_priority]
    patient.priority_color = priority_colors[new_priority]

    # Create triage record for this shift
    triage_record = AITriageResult(
        tenant_id=current_user.tenant_id,
        patient_id=patient.id,
        input_complaint=patient.complaint,
        input_age=patient.age,
        input_gender=patient.gender,
        priority=new_priority,
        priority_label=priority_labels[new_priority],
        priority_color=priority_colors[new_priority],
        reasoning=shift_data.get("reasoning", f"Manual triage shift from L{old_priority} to L{new_priority}"),
        recommendations=shift_data.get("recommendations", []),
        confidence=shift_data.get("confidence"),
        estimated_wait_time=shift_data.get("estimatedWaitTime"),
        is_applied=True,
        applied_at=datetime.utcnow().isoformat() + "Z",
        applied_by=current_user.id,
        created_at=datetime.utcnow().isoformat() + "Z"
    )
    db.add(triage_record)

    # Alert: Triage level shifted
    escalated = new_priority < (old_priority or 5)
    _create_alert(
        db, current_user.tenant_id,
        title=f"Triage {'Escalated' if escalated else 'De-escalated'} - {patient.name}",
        message=f"{patient.name} triage shifted from L{old_priority or '?'} to L{new_priority} ({priority_labels[new_priority]}) by {current_user.name}.",
        priority="high" if new_priority in (1, 2) else "medium",
        category="Triage",
        for_roles=["nurse", "doctor", "admin"],
        patient_id=patient.id,
        triggered_by="triage_shift"
    )
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(patient.id),
            "fromPriority": old_priority,
            "toPriority": new_priority,
            "priorityLabel": priority_labels[new_priority],
            "shiftedBy": {
                "id": str(current_user.id),
                "name": current_user.name,
                "role": current_user.role
            },
            "message": f"Triage shifted from L{old_priority} to L{new_priority} successfully."
        }
    }
