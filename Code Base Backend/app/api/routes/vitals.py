from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from uuid import UUID
from datetime import datetime
from typing import Optional
import base64

from app.db.database import get_db
from app.models.user import User
from app.models.patient import Patient, PatientVitals
from app.models.alert import Alert
from app.models.triage import AITriageResult
from app.models.prescription import Prescription
from app.schemas.vitals import VitalsCreate, VitalsResponse
from app.core.dependencies import get_current_user
from app.services.triage import TriageService

router = APIRouter()


async def get_active_treatments(db: AsyncSession, patient_id: UUID) -> list:
    """Fetch active prescriptions as treatment context strings for triage."""
    result = await db.execute(
        select(Prescription).where(
            Prescription.patient_id == patient_id,
            Prescription.status == "active"
        ).order_by(Prescription.prescribed_at.desc())
    )
    prescriptions = result.scalars().all()
    treatments = []
    for rx in prescriptions:
        parts = [rx.medication_name]
        if rx.dosage:
            parts.append(rx.dosage)
        if rx.frequency:
            parts.append(rx.frequency)
        if rx.route:
            parts.append(f"via {rx.route}")
        treatments.append(" - ".join(parts))
    return treatments


def check_critical_vitals(vitals: PatientVitals) -> list:
    """Check if vitals are in critical range and return alerts."""
    alerts = []

    if vitals.heart_rate:
        if vitals.heart_rate < 50 or vitals.heart_rate > 150:
            alerts.append({
                "type": "hr",
                "message": f"Critical heart rate: {vitals.heart_rate} bpm",
                "severity": "critical"
            })
        elif vitals.heart_rate < 60 or vitals.heart_rate > 100:
            alerts.append({
                "type": "hr",
                "message": f"Abnormal heart rate: {vitals.heart_rate} bpm",
                "severity": "warning"
            })

    if vitals.spo2:
        spo2_val = float(vitals.spo2)
        if spo2_val < 90:
            alerts.append({
                "type": "spo2",
                "message": f"Critical SpO2: {spo2_val}%",
                "severity": "critical"
            })
        elif spo2_val < 95:
            alerts.append({
                "type": "spo2",
                "message": f"Low SpO2: {spo2_val}%",
                "severity": "warning"
            })

    if vitals.blood_pressure_systolic and vitals.blood_pressure_diastolic:
        sys = vitals.blood_pressure_systolic
        dia = vitals.blood_pressure_diastolic
        if sys < 90 or sys > 180 or dia < 60 or dia > 120:
            alerts.append({
                "type": "bp",
                "message": f"Critical BP: {sys}/{dia} mmHg",
                "severity": "critical"
            })

    if vitals.temperature:
        temp = float(vitals.temperature)
        if temp < 95 or temp > 104:
            alerts.append({
                "type": "temp",
                "message": f"Critical temperature: {temp}°F",
                "severity": "critical"
            })

    return alerts


@router.get("/{patient_id}", response_model=dict)
async def get_patient_vitals(
    patient_id: UUID,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get patient vitals history."""
    # Verify patient exists and belongs to tenant
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

    # Fetch all vitals and sort in Python to avoid text-column ordering bugs
    result = await db.execute(
        select(PatientVitals).where(PatientVitals.patient_id == patient_id)
    )
    all_vitals = result.scalars().all()

    def _parse_ts_local(val):
        """Parse timestamp string into naive-UTC datetime for sorting."""
        if not val:
            return datetime.min
        s = str(val).strip()
        if ' ' in s and 'T' not in s:
            s = s.replace(' ', 'T', 1)
        tz_offset_hours = 0
        tz_offset_minutes = 0
        if s.endswith('Z'):
            s = s[:-1]
        elif '+' in s[10:]:
            plus_pos = s.rfind('+')
            tz_part = s[plus_pos + 1:]
            s = s[:plus_pos]
            parts = tz_part.split(':')
            tz_offset_hours = int(parts[0]) if parts[0] else 0
            tz_offset_minutes = int(parts[1]) if len(parts) > 1 else 0
        elif s.count('-') == 3:
            minus_pos = s.rfind('-')
            tz_part = s[minus_pos + 1:]
            s = s[:minus_pos]
            parts = tz_part.split(':')
            tz_offset_hours = -(int(parts[0]) if parts[0] else 0)
            tz_offset_minutes = -(int(parts[1]) if len(parts) > 1 else 0)
        try:
            from datetime import timedelta
            dt = datetime.fromisoformat(s)
            dt = dt - timedelta(hours=tz_offset_hours, minutes=tz_offset_minutes)
            return dt
        except (ValueError, TypeError):
            return datetime.min

    vitals_list = sorted(all_vitals, key=lambda v: _parse_ts_local(v.recorded_at), reverse=True)[:limit]

    # Get current (latest) vitals
    current = None
    history = []

    for v in vitals_list:
        # Ensure recordedAt is in ISO format with UTC timezone for frontend parsing
        recorded_at_iso = None
        if v.recorded_at:
            s = str(v.recorded_at).strip()
            if s and ' ' in s and 'T' not in s:
                s = s.replace(' ', 'T', 1)
            # If no timezone indicator, assume UTC
            if s and '+' not in s and 'Z' not in s and s[-1].isdigit():
                s = s + "Z"
            recorded_at_iso = s if s else None

        vitals_data = {
            "hr": v.heart_rate,
            "bp": v.blood_pressure,
            "spo2": float(v.spo2) if v.spo2 else None,
            "temp": float(v.temperature) if v.temperature else None,
            "respiratoryRate": v.respiratory_rate,
            "bloodGlucose": float(v.blood_glucose) if v.blood_glucose else None,
            "painLevel": v.pain_level,
            "notes": v.notes,
            "recordedAt": recorded_at_iso,
            "recordedBy": None  # TODO: Get user name
        }

        if current is None:
            current = vitals_data
        else:
            history.append(vitals_data)

    return {
        "success": True,
        "data": {
            "current": current,
            "history": history
        }
    }


@router.post("/{patient_id}", response_model=dict, status_code=status.HTTP_201_CREATED)
async def record_vitals(
    patient_id: UUID,
    request: VitalsCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record new vitals."""
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

    # Parse blood pressure if provided as string
    bp_sys = request.blood_pressure_systolic
    bp_dia = request.blood_pressure_diastolic
    bp_str = request.bp

    if bp_str and "/" in bp_str:
        parts = bp_str.split("/")
        bp_sys = int(parts[0])
        bp_dia = int(parts[1])

    # Create vitals record
    now_iso = datetime.utcnow().isoformat() + "Z"
    vitals = PatientVitals(
        patient_id=patient_id,
        heart_rate=request.hr,
        blood_pressure_systolic=bp_sys,
        blood_pressure_diastolic=bp_dia,
        blood_pressure=bp_str or (f"{bp_sys}/{bp_dia}" if bp_sys and bp_dia else None),
        spo2=request.spo2,
        temperature=request.temp,
        respiratory_rate=request.respiratory_rate,
        blood_glucose=request.blood_glucose,
        pain_level=request.pain_level,
        notes=request.notes,
        source="manual",
        recorded_by=current_user.id,
        recorded_at=now_iso,
        created_at=now_iso
    )

    # Check for critical values
    alerts = check_critical_vitals(vitals)
    vitals.is_critical = any(a["severity"] == "critical" for a in alerts)

    # Capture patient data before commit (commit expires SQLAlchemy objects)
    patient_complaint = patient.complaint
    patient_age = patient.age
    patient_gender = patient.gender
    patient_history = patient.history
    patient_obj_id = patient.id
    tenant_id = current_user.tenant_id

    db.add(vitals)

    # Create alerts for critical vitals
    if vitals.is_critical:
        vitals.alert_generated = True
        alert = Alert(
            tenant_id=current_user.tenant_id,
            title=f"Critical Vitals - {patient.bed.bed_number if patient.bed else 'No Bed'}",
            message=f"Patient {patient.name} has critical vitals: {', '.join([a['message'] for a in alerts if a['severity'] == 'critical'])}",
            priority="critical",
            category="Vitals",
            patient_id=patient_id,
            for_roles=["doctor", "nurse", "admin"],
            triggered_by="vitals_monitor",
            extra_data={"vitals_alerts": alerts}
        )
        db.add(alert)

    await db.commit()
    await db.refresh(vitals)

    # Auto re-triage with updated vitals
    triage_data = None
    try:
        vitals_dict = {
            "hr": str(vitals.heart_rate) if vitals.heart_rate else None,
            "bp": vitals.blood_pressure,
            "spo2": str(vitals.spo2) if vitals.spo2 else None,
            "temp": str(vitals.temperature) if vitals.temperature else None,
        }

        # Fetch current prescriptions/treatments for context (non-blocking)
        current_treatments = []
        try:
            current_treatments = await get_active_treatments(db, patient_obj_id)
        except Exception as tx_err:
            print(f"[TRIAGE] Warning: Failed to fetch treatments for patient {patient_id}: {tx_err}")

        print(f"[TRIAGE] Running re-triage for patient {patient_id} with vitals: {vitals_dict}, treatments count: {len(current_treatments)}")

        triage_service = TriageService()
        triage_result = await triage_service.run_triage(
            complaint=patient_complaint,
            age=patient_age,
            gender=patient_gender,
            vitals=vitals_dict,
            history=patient_history,
            treatments=current_treatments
        )

        print(f"[TRIAGE] Re-triage result for patient {patient_id}: priority={triage_result.get('priority')}, reasoning={triage_result.get('reasoning', '')[:100]}")

        # Re-load patient to update priority (it was expired after commit)
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
            "recommendations": triage_result.get("recommendations"),
            "confidence": triage_result.get("confidence"),
            "estimatedWaitTime": triage_result.get("estimated_wait_time"),
        }
    except Exception as e:
        import logging, traceback
        logging.getLogger(__name__).warning(f"Auto re-triage failed for patient {patient_id}: {e}")
        print(f"[TRIAGE] ERROR: Auto re-triage failed for patient {patient_id}: {e}")
        traceback.print_exc()

    return {
        "success": True,
        "data": {
            "id": str(vitals.id),
            "patientId": str(patient_id),
            "hr": vitals.heart_rate,
            "bp": vitals.blood_pressure,
            "spo2": float(vitals.spo2) if vitals.spo2 else None,
            "temp": float(vitals.temperature) if vitals.temperature else None,
            "respiratoryRate": vitals.respiratory_rate,
            "notes": vitals.notes,
            "recordedAt": str(vitals.recorded_at) if vitals.recorded_at else datetime.utcnow().isoformat() + "Z",
            "recordedBy": current_user.name,
            "alerts": alerts,
            "triage": triage_data
        }
    }


@router.post("/ocr", response_model=dict)
async def extract_vitals_ocr(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Extract vitals from image using OCR."""
    # Read and encode image
    contents = await file.read()
    image_base64 = base64.b64encode(contents).decode()

    # Use triage service for OCR
    triage_service = TriageService()
    result = await triage_service.extract_vitals_from_image(image_base64)

    return {
        "success": True,
        "data": {
            "extracted": result.get("extracted", {}),
            "confidence": result.get("confidence", {}),
            "rawText": result.get("rawText", "")
        }
    }
