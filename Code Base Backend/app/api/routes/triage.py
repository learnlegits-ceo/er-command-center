from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.triage import AITriageResult
from app.schemas.triage import TriageRequest, TriageResponse, QuickTriageRequest
from app.core.dependencies import get_current_user
from app.services.triage import TriageService

router = APIRouter()


@router.post("/quick", response_model=TriageResponse)
async def quick_triage(
    request: QuickTriageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Quick triage without patient registration (for assessment)."""
    triage_service = TriageService()

    # Prepare vitals dict
    vitals_dict = None
    if request.vitals:
        vitals_dict = {
            "hr": request.vitals.hr,
            "bp": request.vitals.bp,
            "spo2": request.vitals.spo2,
            "temp": request.vitals.temp,
            "respiratory_rate": request.vitals.respiratory_rate
        }

    # Run triage
    result = await triage_service.run_triage(
        complaint=request.complaint,
        age=request.age,
        gender=request.gender,
        vitals=vitals_dict,
        history=request.history
    )

    # Store result without patient association
    triage_result = AITriageResult(
        tenant_id=current_user.tenant_id,
        patient_id=None,
        input_complaint=request.complaint,
        input_vitals=vitals_dict,
        input_age=request.age,
        input_gender=request.gender,
        input_history=request.history,
        priority=result.get("priority"),
        priority_label=result.get("priority_label"),
        priority_color=result.get("priority_color"),
        confidence=result.get("confidence"),
        reasoning=result.get("reasoning"),
        recommendations=result.get("recommendations"),
        suggested_department=result.get("suggested_department"),
        estimated_wait_time=result.get("estimated_wait_time"),
        groq_model=result.get("groq_model"),
        groq_request_id=result.get("groq_request_id"),
        prompt_tokens=result.get("prompt_tokens"),
        completion_tokens=result.get("completion_tokens"),
        total_tokens=result.get("total_tokens"),
        processing_time_ms=result.get("processing_time_ms"),
        temperature=result.get("temperature")
    )
    db.add(triage_result)
    await db.commit()

    return {
        "success": True,
        "data": {
            "priority": result.get("priority"),
            "priorityLabel": result.get("priority_label"),
            "priorityColor": result.get("priority_color"),
            "reasoning": result.get("reasoning"),
            "recommendations": result.get("recommendations"),
            "suggestedDepartment": result.get("suggested_department"),
            "estimatedWaitTime": result.get("estimated_wait_time"),
            "confidence": result.get("confidence")
        }
    }


@router.post("/{patient_id}", response_model=TriageResponse)
async def run_patient_triage(
    patient_id: UUID,
    request: TriageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Run AI triage on patient."""
    # Get patient
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

    triage_service = TriageService()

    # Prepare vitals dict
    vitals_dict = None
    if request.vitals:
        vitals_dict = {
            "hr": request.vitals.hr,
            "bp": request.vitals.bp,
            "spo2": request.vitals.spo2,
            "temp": request.vitals.temp,
            "respiratory_rate": request.vitals.respiratory_rate
        }

    # Run triage
    triage_result_data = await triage_service.run_triage(
        complaint=request.complaint or patient.complaint,
        age=request.age or patient.age,
        gender=request.gender or patient.gender,
        vitals=vitals_dict,
        history=request.history or patient.history
    )

    # Store triage result
    triage_record = AITriageResult(
        tenant_id=current_user.tenant_id,
        patient_id=patient.id,
        input_complaint=request.complaint or patient.complaint,
        input_vitals=vitals_dict,
        input_age=request.age or patient.age,
        input_gender=request.gender or patient.gender,
        input_history=request.history or patient.history,
        priority=triage_result_data.get("priority"),
        priority_label=triage_result_data.get("priority_label"),
        priority_color=triage_result_data.get("priority_color"),
        confidence=triage_result_data.get("confidence"),
        reasoning=triage_result_data.get("reasoning"),
        recommendations=triage_result_data.get("recommendations"),
        suggested_department=triage_result_data.get("suggested_department"),
        estimated_wait_time=triage_result_data.get("estimated_wait_time"),
        groq_model=triage_result_data.get("groq_model"),
        groq_request_id=triage_result_data.get("groq_request_id"),
        prompt_tokens=triage_result_data.get("prompt_tokens"),
        completion_tokens=triage_result_data.get("completion_tokens"),
        total_tokens=triage_result_data.get("total_tokens"),
        processing_time_ms=triage_result_data.get("processing_time_ms"),
        temperature=triage_result_data.get("temperature"),
        is_applied=True,
        applied_at=datetime.utcnow(),
        applied_by=current_user.id
    )
    db.add(triage_record)

    # Update patient with triage results
    patient.priority = triage_result_data.get("priority")
    patient.priority_label = triage_result_data.get("priority_label")
    patient.priority_color = triage_result_data.get("priority_color")
    patient.status = "active"

    await db.commit()

    return {
        "success": True,
        "data": {
            "priority": triage_result_data.get("priority"),
            "priorityLabel": triage_result_data.get("priority_label"),
            "priorityColor": triage_result_data.get("priority_color"),
            "reasoning": triage_result_data.get("reasoning"),
            "recommendations": triage_result_data.get("recommendations"),
            "suggestedDepartment": triage_result_data.get("suggested_department"),
            "estimatedWaitTime": triage_result_data.get("estimated_wait_time"),
            "confidence": triage_result_data.get("confidence")
        }
    }
