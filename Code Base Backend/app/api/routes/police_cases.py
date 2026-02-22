from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.police_case import PoliceCase
from app.models.alert import Alert
from app.schemas.police_case import (
    PoliceCaseCreate, PoliceCaseResponse,
    PoliceContactRequest, PoliceCaseResolveRequest
)
from app.schemas.common import SuccessResponse
from app.core.dependencies import get_current_user, require_admin

router = APIRouter()

CASE_TYPE_LABELS = {
    "road_accident": "Road Traffic Accident",
    "assault": "Assault",
    "domestic_violence": "Domestic Violence",
    "burn": "Burn Case",
    "poisoning": "Poisoning",
    "suicide_attempt": "Suicide Attempt",
    "unknown_identity": "Unknown Identity",
    "other": "Other"
}


async def generate_case_number(db: AsyncSession, tenant_id: UUID) -> str:
    """Generate a unique case number."""
    result = await db.execute(
        select(func.count(PoliceCase.id)).where(PoliceCase.tenant_id == tenant_id)
    )
    count = result.scalar() or 0
    year = datetime.utcnow().year
    return f"MLC/{year}/{str(count + 1).zfill(4)}"


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_police_case(
    request: PoliceCaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create police case alert (nurse flags during registration)."""
    # Generate case number
    case_number = await generate_case_number(db, current_user.tenant_id)

    # Create police case
    police_case = PoliceCase(
        tenant_id=current_user.tenant_id,
        case_number=case_number,
        patient_id=request.patient_id,
        patient_name=request.patient_name,
        case_type=request.case_type,
        case_type_label=CASE_TYPE_LABELS.get(request.case_type, request.case_type),
        description=request.description,
        complaint=request.complaint,
        status="pending",
        reported_by=current_user.id
    )
    db.add(police_case)
    await db.flush()

    # Create alert for admin
    alert = Alert(
        tenant_id=current_user.tenant_id,
        title=f"Police Case - {CASE_TYPE_LABELS.get(request.case_type, request.case_type)}",
        message=f"New police case reported for patient {request.patient_name}. Case #: {case_number}",
        priority="high",
        category="Police Case",
        for_roles=["admin"],
        patient_id=request.patient_id,
        metadata={
            "case_id": str(police_case.id),
            "case_type": request.case_type
        },
        triggered_by="police_case_reporter"
    )
    db.add(alert)
    await db.flush()

    # Link alert to case
    police_case.alert_id = alert.id

    await db.commit()
    await db.refresh(police_case)

    return {
        "success": True,
        "data": {
            "id": str(police_case.id),
            "alertId": str(alert.id),
            "patientId": str(police_case.patient_id),
            "caseType": police_case.case_type,
            "caseTypeLabel": police_case.case_type_label,
            "status": police_case.status,
            "reportedBy": current_user.name,
            "reportedAt": police_case.reported_at,
            "policeContacted": police_case.police_contacted
        }
    }


@router.get("", response_model=dict)
async def get_police_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    case_type: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all police cases (admin only)."""
    query = select(PoliceCase).where(
        PoliceCase.tenant_id == current_user.tenant_id
    )

    if status_filter:
        query = query.where(PoliceCase.status == status_filter)

    if case_type:
        query = query.where(PoliceCase.case_type == case_type)

    query = query.order_by(PoliceCase.reported_at.desc())

    result = await db.execute(query)
    cases = result.scalars().all()

    cases_data = []
    for case in cases:
        # Get reporter name
        reporter_result = await db.execute(
            select(User).where(User.id == case.reported_by)
        )
        reporter = reporter_result.scalar_one_or_none()

        contacted_by_result = None
        if case.police_contacted_by:
            contacted_by_result = await db.execute(
                select(User).where(User.id == case.police_contacted_by)
            )
            contacted_by = contacted_by_result.scalar_one_or_none()
        else:
            contacted_by = None

        cases_data.append({
            "id": str(case.id),
            "caseNumber": case.case_number,
            "patientId": str(case.patient_id),
            "patientName": case.patient_name,
            "caseType": case.case_type,
            "caseTypeLabel": case.case_type_label,
            "status": case.status,
            "reportedBy": reporter.name if reporter else None,
            "reportedAt": case.reported_at,
            "policeContacted": case.police_contacted,
            "policeContactedAt": case.police_contacted_at,
            "policeContactedBy": contacted_by.name if contacted_by else None,
            "policeStation": case.police_station,
            "firNumber": case.fir_number
        })

    return {
        "success": True,
        "data": cases_data
    }


@router.put("/{case_id}/contact-police", response_model=dict)
async def contact_police(
    case_id: UUID,
    request: PoliceContactRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Mark police as contacted."""
    result = await db.execute(
        select(PoliceCase).where(
            PoliceCase.id == case_id,
            PoliceCase.tenant_id == current_user.tenant_id
        )
    )
    police_case = result.scalar_one_or_none()

    if not police_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Police case not found"
        )

    police_case.status = "police_contacted"
    police_case.police_contacted = True
    police_case.police_contacted_at = datetime.utcnow().isoformat()
    police_case.police_contacted_by = current_user.id
    police_case.police_station = request.police_station
    police_case.officer_name = request.officer_name
    police_case.officer_phone = request.officer_phone
    police_case.fir_number = request.fir_number

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(police_case.id),
            "status": "police_contacted",
            "policeContacted": True,
            "policeContactedAt": police_case.police_contacted_at,
            "policeContactedBy": current_user.name,
            "policeStation": police_case.police_station,
            "firNumber": police_case.fir_number
        }
    }


@router.put("/{case_id}/resolve", response_model=dict)
async def resolve_police_case(
    case_id: UUID,
    request: PoliceCaseResolveRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Resolve police case."""
    result = await db.execute(
        select(PoliceCase).where(
            PoliceCase.id == case_id,
            PoliceCase.tenant_id == current_user.tenant_id
        )
    )
    police_case = result.scalar_one_or_none()

    if not police_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Police case not found"
        )

    police_case.status = "resolved"
    police_case.resolved_at = datetime.utcnow().isoformat()
    police_case.resolved_by = current_user.id
    police_case.resolution = request.resolution
    if request.fir_number:
        police_case.fir_number = request.fir_number

    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(police_case.id),
            "status": "resolved",
            "resolvedAt": police_case.resolved_at,
            "resolvedBy": current_user.name
        }
    }
