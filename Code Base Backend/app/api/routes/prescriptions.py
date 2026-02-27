from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.patient import Patient, PatientVitals
from app.models.prescription import Prescription
from app.models.triage import AITriageResult
from app.schemas.prescription import (
    PrescriptionCreate, PrescriptionResponse,
    PrescriptionDiscontinueRequest, MedicationSearchRequest
)
from app.schemas.common import SuccessResponse
from app.core.dependencies import get_current_user, require_doctor
from app.services.mcp import MCPService
from app.services.triage import TriageService
from app.models.alert import Alert

router = APIRouter()


@router.get("/{patient_id}/prescriptions", response_model=dict)
async def get_patient_prescriptions(
    patient_id: UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get patient prescriptions."""
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

    query = select(Prescription).where(
        Prescription.patient_id == patient_id
    )

    if status_filter:
        query = query.where(Prescription.status == status_filter)

    query = query.order_by(Prescription.prescribed_at.desc())

    result = await db.execute(query)
    prescriptions = result.scalars().all()

    # Batch-fetch all prescribers in one query (avoids N+1 per prescription)
    prescriber_ids = {rx.prescribed_by for rx in prescriptions if rx.prescribed_by}
    prescribers_by_id: dict = {}
    if prescriber_ids:
        prescribers_result = await db.execute(
            select(User).where(User.id.in_(prescriber_ids))
        )
        prescribers_by_id = {u.id: u for u in prescribers_result.scalars().all()}

    rx_data = []
    for rx in prescriptions:
        prescriber = prescribers_by_id.get(rx.prescribed_by) if rx.prescribed_by else None
        rx_data.append({
            "id": str(rx.id),
            "medication": rx.medication_name,
            "medicationCode": rx.medication_code,
            "genericName": rx.generic_name,
            "dosage": rx.dosage,
            "frequency": rx.frequency,
            "duration": rx.duration,
            "route": rx.route,
            "instructions": rx.instructions,
            "status": rx.status,
            "prescribedBy": prescriber.name if prescriber else None,
            "prescribedAt": rx.prescribed_at,
            "startDate": rx.start_date.isoformat() if rx.start_date else None,
            "endDate": rx.end_date.isoformat() if rx.end_date else None,
            "drugInteractions": rx.drug_interactions,
            "contraindications": rx.contraindications
        })

    return {
        "success": True,
        "data": rx_data
    }


@router.post("/{patient_id}/prescriptions", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    patient_id: UUID,
    request: PrescriptionCreate,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Add prescription (doctor only)."""
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

    # Capture patient data before commit
    patient_name = patient.name
    patient_complaint = patient.complaint
    patient_age = patient.age
    patient_gender = patient.gender
    patient_history = patient.history
    patient_obj_id = patient.id
    tenant_id = current_user.tenant_id

    # Create prescription
    prescription = Prescription(
        patient_id=patient_id,
        medication_name=request.medication_name,
        medication_code=request.medication_code,
        medication_form=request.medication_form,
        generic_name=request.generic_name,
        dosage=request.dosage,
        dosage_unit=request.dosage_unit,
        frequency=request.frequency,
        route=request.route,
        duration=request.duration,
        quantity=request.quantity,
        instructions=request.instructions,
        special_instructions=request.special_instructions,
        start_date=request.start_date,
        end_date=request.end_date,
        mcp_drug_id=request.mcp_drug_id,
        drug_interactions=request.drug_interactions,
        contraindications=request.contraindications,
        prescribed_by=current_user.id
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)

    # Auto re-triage with updated prescription context
    triage_data = None
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

        # Fetch all active prescriptions including the new one
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
            if rx.route:
                parts.append(f"via {rx.route}")
            treatments.append(" - ".join(parts))

        triage_service = TriageService()
        triage_result = await triage_service.run_triage(
            complaint=patient_complaint,
            age=patient_age,
            gender=patient_gender,
            vitals=vitals_dict,
            history=patient_history,
            treatments=treatments
        )

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
            applied_at=datetime.utcnow().isoformat() + "Z",
            applied_by=current_user.id
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
        import logging
        logging.getLogger(__name__).warning(f"Auto re-triage after prescription failed for patient {patient_id}: {e}")

    # Alert: New prescription for nurses
    try:
        alert = Alert(
            tenant_id=current_user.tenant_id,
            title=f"New Prescription - {patient_name}",
            message=f"Dr. {current_user.name} prescribed {request.medication_name} ({request.dosage or ''} {request.frequency or ''}) for {patient_name}.",
            priority="medium",
            category="Medication",
            for_roles=["nurse"],
            patient_id=patient_obj_id,
            triggered_by="prescription",
            metadata={"medication": request.medication_name, "dosage": request.dosage}
        )
        db.add(alert)
        await db.commit()
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "id": str(prescription.id),
            "medication": prescription.medication_name,
            "prescribedBy": current_user.name,
            "prescribedAt": prescription.prescribed_at,
            "triage": triage_data
        }
    }


@router.put("/{patient_id}/prescriptions/{rx_id}/discontinue", response_model=dict)
async def discontinue_prescription(
    patient_id: UUID,
    rx_id: UUID,
    request: PrescriptionDiscontinueRequest,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Discontinue prescription."""
    result = await db.execute(
        select(Prescription).where(
            Prescription.id == rx_id,
            Prescription.patient_id == patient_id
        )
    )
    prescription = result.scalar_one_or_none()

    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )

    prescription.status = "discontinued"
    prescription.discontinued_by = current_user.id
    prescription.discontinued_at = datetime.utcnow().isoformat()
    prescription.discontinue_reason = request.reason

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(prescription.id),
            "status": "discontinued",
            "discontinuedAt": prescription.discontinued_at,
            "reason": prescription.discontinue_reason
        }
    }


@router.get("/medications/search", response_model=dict)
async def search_medications(
    query: str = "",
    limit: int = 300,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Search medications using MCP service. Empty query returns all medications."""
    mcp_service = MCPService()
    results = await mcp_service.search_medications(query, limit)

    return {
        "success": True,
        "data": results
    }


@router.get("/medications/{drug_id}/interactions", response_model=dict)
async def check_drug_interactions(
    drug_id: str,
    current_medications: Optional[str] = Query(None, description="Comma-separated drug IDs"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check drug interactions using MCP service."""
    mcp_service = MCPService()

    drug_list = []
    if current_medications:
        drug_list = [d.strip() for d in current_medications.split(",")]

    interactions = await mcp_service.check_interactions(drug_id, drug_list)

    return {
        "success": True,
        "data": interactions
    }
