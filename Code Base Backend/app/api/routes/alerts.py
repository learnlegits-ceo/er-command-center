from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.models.user import User
from app.models.alert import Alert, AlertHistory
from app.models.patient import Patient, PatientVitals
from app.models.department import Department
from app.models.triage import AITriageResult
from app.models.prescription import Prescription
from app.schemas.alert import (
    AlertCreate, AlertResponse, AlertAcknowledgeRequest,
    AlertResolveRequest, AlertForwardRequest
)
from app.schemas.common import SuccessResponse
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/active", response_model=dict)
async def get_active_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get active (unread/unacknowledged) alerts for current user."""
    result = await db.execute(
        select(Alert).options(
            selectinload(Alert.patient).selectinload(Patient.department)
        ).where(
            Alert.tenant_id == current_user.tenant_id,
            Alert.status.in_(["unread", "read"]),
            or_(
                Alert.for_roles.contains([current_user.role]),
                Alert.for_user_ids.contains([current_user.id]),
                Alert.for_roles.is_(None)
            )
        ).order_by(Alert.created_at.desc()).limit(10)
    )
    alerts = result.scalars().all()

    alerts_data = []
    for alert in alerts:
        patient_data = None
        if alert.patient:
            patient_data = {
                "id": str(alert.patient.id),
                "patientId": alert.patient.patient_id,
                "name": alert.patient.name,
                "uhi": alert.patient.uhi,
                "euhi": alert.patient.euhi,
                "department": alert.patient.department.name if alert.patient.department else None,
            }

        alerts_data.append({
            "id": str(alert.id),
            "title": alert.title,
            "message": alert.message,
            "priority": alert.priority,
            "status": alert.status,
            "category": alert.category,
            "triggeredBy": alert.triggered_by,
            "patient": patient_data,
            "createdAt": alert.created_at.isoformat() if alert.created_at else None
        })

    # Count all unread (not just the 10 returned)
    unread_count_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            Alert.tenant_id == current_user.tenant_id,
            Alert.status == "unread",
            or_(
                Alert.for_roles.contains([current_user.role]),
                Alert.for_user_ids.contains([current_user.id]),
                Alert.for_roles.is_(None)
            )
        )
    )
    unread_count = unread_count_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "alerts": alerts_data,
            "unreadCount": unread_count
        }
    }


@router.get("", response_model=dict)
async def get_alerts(
    priority: Optional[str] = Query("all"),
    status_filter: Optional[str] = Query("all", alias="status"),
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get alerts for current user based on role."""
    query = select(Alert).options(
        selectinload(Alert.patient).selectinload(Patient.bed),
        selectinload(Alert.patient).selectinload(Patient.department)
    ).where(
        Alert.tenant_id == current_user.tenant_id,
        or_(
            Alert.for_roles.contains([current_user.role]),
            Alert.for_user_ids.contains([current_user.id]),
            Alert.for_roles.is_(None)
        )
    )

    # Apply filters
    if priority and priority != "all":
        query = query.where(Alert.priority == priority)

    if status_filter and status_filter != "all":
        query = query.where(Alert.status == status_filter)

    if category:
        query = query.where(Alert.category == category)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get counts by status
    unread_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.tenant_id == current_user.tenant_id,
            Alert.status == "unread"
        )
    )
    unread_count = unread_result.scalar() or 0

    critical_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.tenant_id == current_user.tenant_id,
            Alert.priority == "critical",
            Alert.status.in_(["unread", "read"])
        )
    )
    critical_count = critical_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit).order_by(Alert.created_at.desc())

    result = await db.execute(query)
    alerts = result.scalars().all()

    # Format response
    alerts_data = []
    for alert in alerts:
        patient_data = None
        if alert.patient:
            patient_data = {
                "id": str(alert.patient.id),
                "patientId": alert.patient.patient_id,
                "name": alert.patient.name,
                "uhi": alert.patient.uhi,
                "euhi": alert.patient.euhi,
                "department": alert.patient.department.name if alert.patient.department else None,
                "bed": alert.patient.bed.bed_number if alert.patient.bed else None
            }

        alerts_data.append({
            "id": str(alert.id),
            "title": alert.title,
            "message": alert.message,
            "priority": alert.priority,
            "status": alert.status,
            "category": alert.category,
            "triggeredBy": alert.triggered_by,
            "forRoles": alert.for_roles,
            "patient": patient_data,
            "createdAt": alert.created_at.isoformat() if alert.created_at else None,
            "readAt": alert.read_at,
            "acknowledgedAt": alert.acknowledged_at,
            "resolvedAt": alert.resolved_at
        })

    return {
        "success": True,
        "data": {
            "alerts": alerts_data,
            "counts": {
                "total": total,
                "unread": unread_count,
                "critical": critical_count
            },
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit
            }
        }
    }


@router.get("/{alert_id}", response_model=dict)
async def get_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get single alert details."""
    result = await db.execute(
        select(Alert).options(
            selectinload(Alert.patient).selectinload(Patient.bed)
        ).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    # Get history
    history_result = await db.execute(
        select(AlertHistory)
        .where(AlertHistory.alert_id == alert_id)
        .order_by(AlertHistory.performed_at.desc())
    )
    history = history_result.scalars().all()

    history_data = [
        {
            "action": h.action,
            "timestamp": h.performed_at
        }
        for h in history
    ]

    patient_data = None
    if alert.patient:
        patient_data = {
            "id": str(alert.patient.id),
            "name": alert.patient.name,
            "bed": alert.patient.bed.bed_number if alert.patient.bed else None
        }

    return {
        "success": True,
        "data": {
            "id": str(alert.id),
            "title": alert.title,
            "message": alert.message,
            "priority": alert.priority,
            "status": alert.status,
            "category": alert.category,
            "triggeredBy": alert.triggered_by,
            "forRoles": alert.for_roles,
            "patient": patient_data,
            "metadata": alert.metadata,
            "createdAt": alert.created_at.isoformat() if alert.created_at else None,
            "history": history_data
        }
    }


@router.put("/{alert_id}/read", response_model=dict)
async def mark_alert_read(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark alert as read."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    old_status = alert.status
    alert.status = "read"
    alert.read_at = datetime.utcnow().isoformat() + "Z"
    alert.read_by = current_user.id

    # Add history (non-blocking - don't let history failure prevent status update)
    try:
        history = AlertHistory(
            alert_id=alert.id,
            action="read",
            old_status=old_status,
            new_status="read",
            performed_by=current_user.id
        )
        db.add(history)
    except Exception as e:
        logger.warning(f"Failed to create alert history: {e}")

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(alert.id),
            "status": "read",
            "readAt": alert.read_at,
            "readBy": current_user.name
        }
    }


@router.put("/{alert_id}/acknowledge", response_model=dict)
async def acknowledge_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    old_status = alert.status
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow().isoformat() + "Z"
    alert.acknowledged_by = current_user.id

    # Add history (non-blocking - don't let history failure prevent status update)
    try:
        history = AlertHistory(
            alert_id=alert.id,
            action="acknowledged",
            old_status=old_status,
            new_status="acknowledged",
            performed_by=current_user.id
        )
        db.add(history)
    except Exception as e:
        logger.warning(f"Failed to create alert history: {e}")

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(alert.id),
            "status": "acknowledged",
            "acknowledgedAt": alert.acknowledged_at,
            "acknowledgedBy": current_user.name
        }
    }


@router.put("/{alert_id}/resolve", response_model=dict)
async def resolve_alert(
    alert_id: UUID,
    request: AlertResolveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Resolve alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    old_status = alert.status
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow().isoformat() + "Z"
    alert.resolved_by = current_user.id
    alert.resolution = request.resolution

    # Add history (non-blocking - don't let history failure prevent status update)
    try:
        history = AlertHistory(
            alert_id=alert.id,
            action="resolved",
            old_status=old_status,
            new_status="resolved",
            notes=request.resolution,
            performed_by=current_user.id
        )
        db.add(history)
    except Exception as e:
        logger.warning(f"Failed to create alert history: {e}")

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(alert.id),
            "status": "resolved",
            "resolvedAt": alert.resolved_at,
            "resolvedBy": current_user.name,
            "resolution": alert.resolution
        }
    }


@router.delete("/{alert_id}", response_model=SuccessResponse)
async def dismiss_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dismiss/delete alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    alert.status = "dismissed"

    await db.commit()

    return {"success": True, "message": "Alert dismissed"}


@router.post("/{alert_id}/forward", response_model=dict)
async def forward_alert(
    alert_id: UUID,
    request: AlertForwardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Forward/reassign alert to another role."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    # Add new role to for_roles
    current_roles = alert.for_roles or []
    if request.to_role not in current_roles:
        current_roles.append(request.to_role)
        alert.for_roles = current_roles

    alert.forwarded_to_roles = [request.to_role]
    alert.forwarded_at = datetime.utcnow()
    alert.forwarded_by = current_user.id
    alert.forward_notes = request.notes

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(alert.id),
            "forRoles": alert.for_roles,
            "forwardedAt": alert.forwarded_at,
            "forwardedBy": current_user.name
        }
    }


@router.post("/seed", response_model=dict)
async def seed_alerts_from_existing_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate alerts from existing patient data so the alerts panel is not empty."""
    tenant_id = current_user.tenant_id
    created = 0

    # Guard: skip if alerts already exist (avoid duplicate seeding)
    existing_count_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            Alert.tenant_id == tenant_id,
            Alert.status.in_(["unread", "read"])
        )
    )
    existing_count = existing_count_result.scalar() or 0
    if existing_count > 0:
        return {
            "success": True,
            "data": {
                "alertsCreated": 0,
                "patientsScanned": 0,
                "message": "Alerts already exist, skipping seed"
            }
        }

    # 1. Fetch all active patients for this tenant
    patients_result = await db.execute(
        select(Patient).options(
            selectinload(Patient.bed),
            selectinload(Patient.department)
        ).where(
            Patient.tenant_id == tenant_id,
            Patient.status.notin_(["discharged", "transferred"])
        )
    )
    patients = patients_result.scalars().all()

    for patient in patients:
        bed_label = patient.bed.bed_number if patient.bed else "No Bed"
        dept_name = patient.department.name if patient.department else "Unassigned"
        uhi_label = f"UHI: {patient.uhi}" if patient.uhi else ""
        euhi_label = f"EUHI: {patient.euhi}" if patient.euhi else ""
        id_info = " | ".join(filter(None, [uhi_label, euhi_label]))
        patient_info = f"{patient.name} [{dept_name}] ({bed_label})"
        patient_detail = f"{patient_info} {id_info}." if id_info else f"{patient_info}."

        # --- Alert based on triage priority ---
        if patient.priority and patient.priority <= 2:
            level = "Critical" if patient.priority == 1 else "High"
            alert = Alert(
                tenant_id=tenant_id,
                title=f"{level} Priority - {patient.name}",
                message=f"{patient_detail} Triaged as {level} (L{patient.priority}). Complaint: {patient.complaint or 'N/A'}. Requires immediate attention.",
                priority="critical" if patient.priority == 1 else "high",
                category="Triage",
                for_roles=["nurse", "doctor", "admin"],
                patient_id=patient.id,
                triggered_by="seed_existing_data"
            )
            db.add(alert)
            created += 1

        # --- Alert for patients waiting without vitals recorded ---
        vitals_result = await db.execute(
            select(func.count()).select_from(PatientVitals).where(
                PatientVitals.patient_id == patient.id
            )
        )
        vitals_count = vitals_result.scalar() or 0

        if vitals_count == 0:
            alert = Alert(
                tenant_id=tenant_id,
                title=f"Vitals Pending - {patient.name}",
                message=f"{patient_detail} No vitals recorded yet. Please check and record vitals.",
                priority="medium",
                category="Vitals",
                for_roles=["nurse"],
                patient_id=patient.id,
                triggered_by="seed_existing_data"
            )
            db.add(alert)
            created += 1
        else:
            # Check if latest vitals are critical
            latest_vitals_result = await db.execute(
                select(PatientVitals).where(
                    PatientVitals.patient_id == patient.id
                ).order_by(PatientVitals.recorded_at.desc()).limit(1)
            )
            latest_vitals = latest_vitals_result.scalar_one_or_none()
            if latest_vitals:
                critical_items = []
                if latest_vitals.heart_rate and (latest_vitals.heart_rate < 50 or latest_vitals.heart_rate > 150):
                    critical_items.append(f"HR {latest_vitals.heart_rate} bpm")
                if latest_vitals.spo2 and float(latest_vitals.spo2) < 90:
                    critical_items.append(f"SpO2 {latest_vitals.spo2}%")
                if latest_vitals.temperature and (float(latest_vitals.temperature) < 95 or float(latest_vitals.temperature) > 104):
                    critical_items.append(f"Temp {latest_vitals.temperature}°F")
                if latest_vitals.blood_pressure_systolic and (latest_vitals.blood_pressure_systolic < 90 or latest_vitals.blood_pressure_systolic > 180):
                    critical_items.append(f"BP {latest_vitals.blood_pressure or ''}")

                if critical_items:
                    alert = Alert(
                        tenant_id=tenant_id,
                        title=f"Critical Vitals - {patient.name}",
                        message=f"{patient_detail} Critical vitals: {', '.join(critical_items)}. Immediate review needed.",
                        priority="critical",
                        category="Vitals",
                        for_roles=["nurse", "doctor"],
                        patient_id=patient.id,
                        triggered_by="seed_existing_data"
                    )
                    db.add(alert)
                    created += 1

        # --- Alert for active prescriptions needing nurse administration ---
        rx_result = await db.execute(
            select(Prescription).where(
                Prescription.patient_id == patient.id,
                Prescription.status == "active"
            )
        )
        prescriptions = rx_result.scalars().all()
        if prescriptions:
            med_names = [rx.medication_name for rx in prescriptions[:3]]
            more = f" (+{len(prescriptions) - 3} more)" if len(prescriptions) > 3 else ""
            alert = Alert(
                tenant_id=tenant_id,
                title=f"Active Medications - {patient.name}",
                message=f"{patient_detail} {len(prescriptions)} active prescription(s): {', '.join(med_names)}{more}. Ensure timely administration.",
                priority="medium",
                category="Medication",
                for_roles=["nurse"],
                patient_id=patient.id,
                triggered_by="seed_existing_data"
            )
            db.add(alert)
            created += 1

        # --- Alert for police case patients ---
        if patient.is_police_case:
            alert = Alert(
                tenant_id=tenant_id,
                title=f"Police Case - {patient.name}",
                message=f"{patient_detail} Flagged as a police case ({patient.police_case_type or 'unspecified'}). Follow medico-legal protocol.",
                priority="high",
                category="Administrative",
                for_roles=["doctor", "admin"],
                patient_id=patient.id,
                triggered_by="seed_existing_data"
            )
            db.add(alert)
            created += 1

        # --- Alert for patients with recent triage escalation ---
        triage_result = await db.execute(
            select(AITriageResult).where(
                AITriageResult.patient_id == patient.id,
                AITriageResult.is_applied == True
            ).order_by(AITriageResult.applied_at.desc()).limit(1)
        )
        latest_triage = triage_result.scalar_one_or_none()
        if latest_triage and latest_triage.reasoning:
            alert = Alert(
                tenant_id=tenant_id,
                title=f"AI Triage - {patient.name}",
                message=f"{patient_detail} Triaged L{latest_triage.priority} ({latest_triage.priority_label}): {latest_triage.reasoning}",
                priority="medium" if (latest_triage.priority or 5) > 2 else "high",
                category="Triage",
                for_roles=["nurse", "doctor"],
                patient_id=patient.id,
                triggered_by="seed_existing_data"
            )
            db.add(alert)
            created += 1

    await db.commit()

    return {
        "success": True,
        "data": {
            "alertsCreated": created,
            "patientsScanned": len(patients)
        }
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_alert(
    request: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new alert (system or manual)."""
    alert = Alert(
        tenant_id=current_user.tenant_id,
        title=request.title,
        message=request.message,
        priority=request.priority,
        category=request.category,
        for_roles=request.for_roles,
        patient_id=request.patient_id,
        metadata=request.metadata,
        triggered_by="manual"
    )
    db.add(alert)

    # Add history
    history = AlertHistory(
        alert_id=alert.id,
        action="created",
        new_status="unread",
        performed_by=current_user.id
    )
    db.add(history)

    await db.commit()
    await db.refresh(alert)

    return {
        "success": True,
        "data": {
            "id": str(alert.id),
            "title": alert.title,
            "status": "unread",
            "createdAt": alert.created_at.isoformat() if alert.created_at else None
        }
    }
