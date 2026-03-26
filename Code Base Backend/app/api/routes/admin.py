from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
import uuid as uuid_mod
import random
from datetime import datetime, date, timedelta
from typing import Optional

from app.db.database import get_db
from app.models.user import User, UserSettings
from app.models.department import Department
from app.models.bed import Bed
from app.models.patient import Patient, PatientVitals
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.models.bed_pricing import BedTypePricing
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.bed_pricing import BedPricingCreate, BedPricingUpdate
from app.schemas.common import SuccessResponse
from app.core.dependencies import require_admin
from app.core.security import get_password_hash
from app.services.plan_limits import check_user_limit, check_bed_limit
from app.services.usage_tracker import get_current_usage

router = APIRouter()


@router.get("/staff", response_model=dict)
async def get_all_staff(
    role: Optional[str] = Query("all"),
    department: Optional[str] = None,
    status_filter: Optional[str] = Query("active", alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all staff members."""
    query = select(User).options(
        selectinload(User.department)
    ).where(
        User.tenant_id == current_user.tenant_id,
        User.deleted_at.is_(None)
    )

    if role and role != "all":
        query = query.where(User.role == role)

    if department:
        query = query.join(Department).where(Department.name == department)

    if status_filter and status_filter != "all":
        query = query.where(User.status == status_filter)

    if search:
        query = query.where(
            User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    query = query.order_by(User.name)

    result = await db.execute(query)
    staff = result.scalars().all()

    # Get counts
    doctors_count = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == current_user.tenant_id,
            User.role == "doctor",
            User.deleted_at.is_(None)
        )
    )
    nurses_count = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == current_user.tenant_id,
            User.role == "nurse",
            User.deleted_at.is_(None)
        )
    )
    admins_count = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == current_user.tenant_id,
            User.role == "admin",
            User.deleted_at.is_(None)
        )
    )

    staff_data = []
    for s in staff:
        staff_data.append({
            "id": str(s.id),
            "name": s.name,
            "email": s.email,
            "role": s.role,
            "department": s.department.name if s.department else None,
            "phone": s.phone,
            "avatar": s.avatar_url,
            "status": s.status,
            "joinedAt": s.joined_at.isoformat() if s.joined_at else None,
            "lastActive": s.last_active_at
        })

    return {
        "success": True,
        "data": {
            "staff": staff_data,
            "counts": {
                "total": len(staff_data),
                "doctors": doctors_count.scalar() or 0,
                "nurses": nurses_count.scalar() or 0,
                "admins": admins_count.scalar() or 0
            }
        }
    }


@router.post("/staff", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_staff(
    request: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create new staff member."""
    # Check plan user limit
    limit = await check_user_limit(db, current_user.tenant_id)
    if not limit["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit reached ({limit['current']}/{limit['max']}). Contact platform admin to upgrade your plan."
        )

    # Check if email already exists
    existing = await db.execute(
        select(User).where(
            User.tenant_id == current_user.tenant_id,
            User.email == request.email
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = User(
        tenant_id=current_user.tenant_id,
        name=request.name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=request.role,
        department_id=request.department_id,
        phone=request.phone,
        specialization=request.specialization,
        avatar_url=request.avatar_url,
        status="active",
        joined_at=datetime.utcnow().date()
    )
    db.add(user)
    await db.flush()

    # Create default settings
    settings = UserSettings(user_id=user.id)
    db.add(settings)

    await db.commit()

    # Re-fetch with department eagerly loaded
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user.id)
    )
    user = result.scalar_one()

    # TODO: Send welcome email with temporary password via SQS

    return {
        "success": True,
        "data": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department.name if user.department else None,
            "avatar": user.avatar_url,
            "phone": user.phone,
            "status": user.status,
            "joinedAt": user.joined_at.isoformat() if user.joined_at else None
        },
        "message": "Staff member created successfully."
    }


@router.put("/staff/{staff_id}", response_model=dict)
async def update_staff(
    staff_id: UUID,
    request: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update staff member."""
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(
            User.id == staff_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    # Update only explicitly allowed fields to prevent privilege escalation
    UPDATABLE_STAFF_FIELDS = {"name", "phone", "department_id", "specialization", "status", "avatar_url"}
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in UPDATABLE_STAFF_FIELDS:
            setattr(user, field, value)

    await db.commit()

    # Re-fetch with department eagerly loaded
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user.id)
    )
    user = result.scalar_one()

    return {
        "success": True,
        "data": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department.name if user.department else None,
            "status": user.status
        }
    }


@router.delete("/staff/{staff_id}", response_model=SuccessResponse)
async def delete_staff(
    staff_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete/deactivate staff member."""
    result = await db.execute(
        select(User).where(
            User.id == staff_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    # Don't allow deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Soft delete
    user.status = "inactive"
    user.deleted_at = datetime.utcnow()

    await db.commit()

    return {"success": True, "message": "Staff member deactivated"}


@router.post("/staff/{staff_id}/reset-password", response_model=SuccessResponse)
async def reset_staff_password(
    staff_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reset staff member password."""
    result = await db.execute(
        select(User).where(
            User.id == staff_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    # Generate temporary password
    import secrets
    temp_password = secrets.token_urlsafe(12)
    user.password_hash = get_password_hash(temp_password)

    await db.commit()

    # TODO: Send password reset email via SQS/Resend

    return {"success": True, "message": "Password has been reset. Please notify the staff member directly through a secure channel."}


@router.get("/audit-logs", response_model=dict)
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system audit logs for the current tenant."""
    query = (
        select(AuditLog, User.name.label("user_name"), User.role.label("user_role"))
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.tenant_id == current_user.tenant_id)
    )

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    total_result = await db.execute(
        select(func.count()).select_from(
            select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id).subquery()
        )
    )
    total = total_result.scalar() or 0

    query = query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    rows = result.all()

    logs = []
    for row in rows:
        log = row[0]
        logs.append({
            "id": str(log.id),
            "action": log.action,
            "entityType": log.entity_type,
            "entityId": str(log.entity_id) if log.entity_id else None,
            "userName": row[1] or "System",
            "userRole": row[2] or "system",
            "ipAddress": str(log.ip_address) if log.ip_address else None,
            "createdAt": log.created_at,
        })

    return {
        "success": True,
        "data": {
            "logs": logs,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.post("/initialize-departments", response_model=dict)
async def initialize_departments(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create standard hospital departments. Idempotent — skips departments that already exist."""
    DEPARTMENTS = [
        {"name": "Emergency Department - Unit A", "code": "ED-A", "floor": "Ground Floor", "capacity": 15},
        {"name": "Emergency Department - Unit B", "code": "ED-B", "floor": "Ground Floor", "capacity": 15},
        {"name": "Emergency Care Unit", "code": "ECU", "floor": "Ground Floor", "capacity": 15},
        {"name": "Trauma Center", "code": "TC", "floor": "Ground Floor", "capacity": 20},
        {"name": "Outpatient Department", "code": "OPD", "floor": "1st Floor", "capacity": 50},
        {"name": "Intensive Care Unit", "code": "ICU", "floor": "2nd Floor", "capacity": 20},
        {"name": "General Ward", "code": "GW", "floor": "3rd Floor", "capacity": 60},
        {"name": "Pediatrics", "code": "PED", "floor": "4th Floor", "capacity": 25},
        {"name": "Cardiology", "code": "CARD", "floor": "5th Floor", "capacity": 20},
    ]

    # Get existing department codes for this tenant
    result = await db.execute(
        select(Department.code).where(Department.tenant_id == current_user.tenant_id)
    )
    existing_codes = {row[0] for row in result.all()}

    created = 0
    for dept_data in DEPARTMENTS:
        if dept_data["code"] in existing_codes:
            continue
        dept = Department(
            id=uuid_mod.uuid4(),
            tenant_id=current_user.tenant_id,
            name=dept_data["name"],
            code=dept_data["code"],
            description=f"{dept_data['name']} - Providing specialized care",
            floor=dept_data["floor"],
            capacity=dept_data["capacity"],
            is_active=True
        )
        db.add(dept)
        created += 1

    await db.commit()

    return {
        "success": True,
        "message": f"Created {created} new departments. {len(existing_codes)} already existed."
    }


@router.post("/initialize-beds", response_model=dict)
async def initialize_beds(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create default beds for every department that has none. Idempotent — safe to call multiple times."""
    # Check plan bed limit
    limit = await check_bed_limit(db, current_user.tenant_id)
    if not limit["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bed limit reached ({limit['current']}/{limit['max']}). Contact platform admin to upgrade your plan."
        )

    # Bed configs per department code
    BED_CONFIGS = {
        "ED-A": {"count": 15, "types": ["emergency", "trauma", "observation"]},
        "ED-B": {"count": 15, "types": ["emergency", "trauma", "observation"]},
        "ECU":  {"count": 8,  "types": ["emergency", "observation", "monitoring"]},
        "TC":   {"count": 10, "types": ["trauma", "emergency", "observation"]},
        "OPD":  {"count": 20, "types": ["consultation", "examination", "procedure"]},
        "ICU":  {"count": 12, "types": ["icu", "isolation", "cardiac"]},
        "GW":   {"count": 30, "types": ["general", "semi-private", "private"]},
        "PED":  {"count": 15, "types": ["pediatric", "nicu", "general"]},
        "CARD": {"count": 12, "types": ["cardiac", "ccu", "monitoring"]},
    }
    # Fallback for departments not in the map
    DEFAULT_CONFIG = {"count": 10, "types": ["general"]}

    # Get all departments for this tenant
    result = await db.execute(
        select(Department).where(Department.tenant_id == current_user.tenant_id)
    )
    departments = result.scalars().all()

    if not departments:
        raise HTTPException(status_code=400, detail="No departments found. Create departments first.")

    created = 0
    skipped = 0
    for dept in departments:
        # Check if department already has beds
        bed_count = await db.execute(
            select(func.count(Bed.id)).where(
                Bed.department_id == dept.id,
                Bed.tenant_id == current_user.tenant_id
            )
        )
        if bed_count.scalar() > 0:
            skipped += 1
            continue

        config = BED_CONFIGS.get(dept.code, DEFAULT_CONFIG)
        for i in range(config["count"]):
            bed = Bed(
                id=uuid_mod.uuid4(),
                tenant_id=current_user.tenant_id,
                bed_number=f"{dept.code}-{i+1:03d}",
                department_id=dept.id,
                bed_type=config["types"][i % len(config["types"])],
                floor=dept.floor,
                wing="A" if i < config["count"] // 2 else "B",
                status="available",
                is_active=True
            )
            db.add(bed)
            created += 1

    await db.commit()

    return {
        "success": True,
        "message": f"Created {created} beds across {len(departments) - skipped} departments. {skipped} departments already had beds."
    }


@router.post("/seed-patients", response_model=dict)
async def seed_patients(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Seed sample patients across all departments. Idempotent — skips if patients already exist."""
    # Check if patients already exist
    patient_count_result = await db.execute(
        select(func.count(Patient.id)).where(
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    existing_count = patient_count_result.scalar() or 0
    if existing_count >= 20:
        return {
            "success": True,
            "message": f"Database already has {existing_count} patients. Skipping seed."
        }

    # Get departments
    dept_result = await db.execute(
        select(Department).where(Department.tenant_id == current_user.tenant_id)
    )
    departments = {d.code: d for d in dept_result.scalars().all()}

    if not departments:
        raise HTTPException(status_code=400, detail="No departments found. Create departments first.")

    # Get doctors and nurses per department
    staff_result = await db.execute(
        select(User).where(
            User.tenant_id == current_user.tenant_id,
            User.role.in_(["doctor", "nurse"]),
            User.deleted_at.is_(None)
        )
    )
    all_staff = staff_result.scalars().all()
    doctors_by_dept: dict = {}
    nurses_by_dept: dict = {}
    for s in all_staff:
        dept_id = str(s.department_id) if s.department_id else None
        if not dept_id:
            continue
        if s.role == "doctor":
            doctors_by_dept.setdefault(dept_id, []).append(s)
        else:
            nurses_by_dept.setdefault(dept_id, []).append(s)

    # Get available beds per department
    beds_result = await db.execute(
        select(Bed).where(
            Bed.tenant_id == current_user.tenant_id,
            Bed.status == "available",
            Bed.is_active == True
        ).order_by(Bed.bed_number)
    )
    all_beds = beds_result.scalars().all()
    beds_by_dept: dict = {}
    for b in all_beds:
        dept_id = str(b.department_id)
        beds_by_dept.setdefault(dept_id, []).append(b)

    # Sample patient data per department code
    PATIENT_DATA = {
        "ED-A": [
            {"name": "John Smith", "age": 45, "gender": "M", "complaint": "Severe chest pain radiating to left arm", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "A+"},
            {"name": "Maria Garcia", "age": 32, "gender": "F", "complaint": "High fever with severe headache and stiff neck", "priority": 2, "priority_label": "L2 - Emergent", "status": "admitted", "blood_group": "O+"},
            {"name": "Robert Johnson", "age": 58, "gender": "M", "complaint": "Difficulty breathing, history of COPD", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "B+"},
        ],
        "ED-B": [
            {"name": "Emily Brown", "age": 28, "gender": "F", "complaint": "Severe abdominal pain, vomiting blood", "priority": 2, "priority_label": "L2 - Emergent", "status": "pending_triage", "blood_group": "AB+"},
            {"name": "David Wilson", "age": 67, "gender": "M", "complaint": "Sudden weakness on right side, slurred speech", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "O-"},
            {"name": "Linda Martinez", "age": 41, "gender": "F", "complaint": "Allergic reaction with swelling and difficulty breathing", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "A+"},
        ],
        "ECU": [
            {"name": "Sunita Devi", "age": 55, "gender": "F", "complaint": "Sudden weakness, dizziness, near-syncope", "priority": 3, "priority_label": "L3 - Urgent", "status": "admitted", "blood_group": "A+"},
            {"name": "Karthik Reddy", "age": 48, "gender": "M", "complaint": "Chest discomfort with palpitations", "priority": 2, "priority_label": "L2 - Emergent", "status": "admitted", "blood_group": "B+"},
            {"name": "Anita Verma", "age": 62, "gender": "F", "complaint": "Acute gastritis with severe vomiting", "priority": 3, "priority_label": "L3 - Urgent", "status": "pending_triage", "blood_group": "O+"},
        ],
        "TC": [
            {"name": "Rahul Sharma", "age": 25, "gender": "M", "complaint": "Fall from height, suspected head injury", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "O+"},
            {"name": "Priya Nair", "age": 31, "gender": "F", "complaint": "Motor vehicle accident, open fracture right leg", "priority": 2, "priority_label": "L2 - Emergent", "status": "admitted", "blood_group": "A+"},
            {"name": "Suresh Babu", "age": 40, "gender": "M", "complaint": "Industrial crush injury, left hand", "priority": 2, "priority_label": "L2 - Emergent", "status": "admitted", "blood_group": "B-"},
        ],
        "OPD": [
            {"name": "Michael Lee", "age": 35, "gender": "M", "complaint": "Follow-up for diabetes management", "priority": 4, "priority_label": "L4 - Non-Urgent", "status": "pending_triage", "blood_group": "B+"},
            {"name": "Jennifer Taylor", "age": 42, "gender": "F", "complaint": "Annual health checkup", "priority": 4, "priority_label": "L4 - Non-Urgent", "status": "pending_triage", "blood_group": "O+"},
            {"name": "Christopher Moore", "age": 55, "gender": "M", "complaint": "Hypertension medication review", "priority": 4, "priority_label": "L4 - Non-Urgent", "status": "admitted", "blood_group": "A+"},
            {"name": "Amanda Martinez", "age": 29, "gender": "F", "complaint": "Persistent cough for 2 weeks", "priority": 3, "priority_label": "L3 - Urgent", "status": "pending_triage", "blood_group": "AB+"},
        ],
        "ICU": [
            {"name": "George Harris", "age": 72, "gender": "M", "complaint": "Post cardiac surgery - triple bypass", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "O+"},
            {"name": "Patricia Clark", "age": 65, "gender": "F", "complaint": "Severe pneumonia with respiratory failure", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "A+"},
            {"name": "James Lewis", "age": 48, "gender": "M", "complaint": "Multi-organ failure - sepsis", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "B+"},
        ],
        "GW": [
            {"name": "Nancy Young", "age": 45, "gender": "F", "complaint": "Post appendectomy - Day 2", "priority": 3, "priority_label": "L3 - Urgent", "status": "admitted", "blood_group": "A+"},
            {"name": "Steven King", "age": 56, "gender": "M", "complaint": "Diabetic foot ulcer treatment", "priority": 3, "priority_label": "L3 - Urgent", "status": "admitted", "blood_group": "B+"},
            {"name": "Dorothy Wright", "age": 68, "gender": "F", "complaint": "Hip replacement recovery - Day 4", "priority": 4, "priority_label": "L4 - Non-Urgent", "status": "admitted", "blood_group": "O+"},
        ],
        "PED": [
            {"name": "Tommy Adams", "age": 8, "gender": "M", "complaint": "Asthma exacerbation", "priority": 2, "priority_label": "L2 - Emergent", "status": "admitted", "blood_group": "O+"},
            {"name": "Sophie Nelson", "age": 5, "gender": "F", "complaint": "High fever with ear infection", "priority": 3, "priority_label": "L3 - Urgent", "status": "pending_triage", "blood_group": "A+"},
            {"name": "Lucas Carter", "age": 12, "gender": "M", "complaint": "Fractured arm - sports injury", "priority": 3, "priority_label": "L3 - Urgent", "status": "admitted", "blood_group": "B+"},
        ],
        "CARD": [
            {"name": "Margaret Roberts", "age": 62, "gender": "F", "complaint": "Atrial fibrillation - rate control", "priority": 2, "priority_label": "L2 - Emergent", "status": "admitted", "blood_group": "A+"},
            {"name": "Frank Turner", "age": 70, "gender": "M", "complaint": "Congestive heart failure - fluid management", "priority": 2, "priority_label": "L2 - Emergent", "status": "admitted", "blood_group": "B+"},
            {"name": "Betty Parker", "age": 74, "gender": "F", "complaint": "Hypertensive crisis", "priority": 1, "priority_label": "L1 - Critical", "status": "admitted", "blood_group": "A-"},
        ],
    }

    created = 0
    beds_assigned = 0
    patient_counter = existing_count + 1

    for dept_code, patients_list in PATIENT_DATA.items():
        dept = departments.get(dept_code)
        if not dept:
            continue

        dept_id = str(dept.id)
        dept_doctors = doctors_by_dept.get(dept_id, [])
        dept_nurses = nurses_by_dept.get(dept_id, [])
        dept_beds = beds_by_dept.get(dept_id, [])
        bed_idx = 0

        for p_data in patients_list:
            # Check if patient with same name already exists in this department
            existing = await db.execute(
                select(Patient.id).where(
                    Patient.tenant_id == current_user.tenant_id,
                    Patient.name == p_data["name"],
                    Patient.department_id == dept.id,
                    Patient.deleted_at.is_(None)
                )
            )
            if existing.scalar_one_or_none():
                continue

            # Assign bed for admitted patients
            bed = None
            if p_data["status"] == "admitted" and bed_idx < len(dept_beds):
                bed = dept_beds[bed_idx]
                bed.status = "occupied"
                bed_idx += 1

            admit_time = datetime.utcnow() - timedelta(hours=random.randint(1, 48))

            patient = Patient(
                id=uuid_mod.uuid4(),
                tenant_id=current_user.tenant_id,
                patient_id=f"PT-{patient_counter:05d}",
                name=p_data["name"],
                age=p_data["age"],
                date_of_birth=date.today() - timedelta(days=p_data["age"] * 365),
                gender=p_data["gender"],
                phone=f"+91-98765{patient_counter:05d}",
                blood_group=p_data.get("blood_group", "O+"),
                complaint=p_data["complaint"],
                status=p_data["status"],
                priority=p_data["priority"],
                priority_label=p_data["priority_label"],
                priority_color="red" if p_data["priority"] == 1 else "orange" if p_data["priority"] == 2 else "yellow" if p_data["priority"] == 3 else "green",
                department_id=dept.id,
                bed_id=bed.id if bed else None,
                assigned_doctor_id=dept_doctors[created % len(dept_doctors)].id if dept_doctors else None,
                assigned_nurse_id=dept_nurses[created % len(dept_nurses)].id if dept_nurses else None,
                admitted_at=admit_time,
            )
            db.add(patient)

            if bed:
                bed.current_patient_id = patient.id
                beds_assigned += 1

            # Add vitals for admitted patients
            if p_data["status"] == "admitted":
                vitals = PatientVitals(
                    id=uuid_mod.uuid4(),
                    patient_id=patient.id,
                    heart_rate=70 + random.randint(0, 30),
                    blood_pressure_systolic=110 + random.randint(0, 40),
                    blood_pressure_diastolic=70 + random.randint(0, 20),
                    blood_pressure=f"{110 + random.randint(0, 40)}/{70 + random.randint(0, 20)}",
                    spo2=95 + random.randint(0, 4),
                    temperature=round(36.5 + random.randint(0, 20) / 10, 1),
                    respiratory_rate=14 + random.randint(0, 8),
                    pain_level=random.randint(1, 8),
                    source="manual",
                    is_critical=p_data["priority"] == 1
                )
                db.add(vitals)

            created += 1
            patient_counter += 1

    await db.commit()

    return {
        "success": True,
        "message": f"Created {created} sample patients ({beds_assigned} with beds assigned) across departments."
    }


@router.post("/split-emergency-department", response_model=dict)
async def split_emergency_department(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Migrate existing 'Emergency Department' (ED) into Unit A and Unit B.
    - Renames existing ED → 'Emergency Department - Unit A' (ED-A)
    - Creates new 'Emergency Department - Unit B' (ED-B)
    - Moves half the beds and patients from Unit A to Unit B
    Idempotent — safe to call multiple times."""

    # Check if already split
    result = await db.execute(
        select(Department).where(
            Department.tenant_id == current_user.tenant_id,
            Department.code == "ED-A"
        )
    )
    if result.scalar_one_or_none():
        return {"success": True, "message": "Already split. ED-A and ED-B exist."}

    # Find existing ED department
    result = await db.execute(
        select(Department).where(
            Department.tenant_id == current_user.tenant_id,
            Department.code == "ED"
        )
    )
    old_ed = result.scalar_one_or_none()

    if not old_ed:
        return {"success": True, "message": "No 'ED' department found. Use initialize-departments to create ED-A and ED-B."}

    # Rename existing ED → Unit A
    old_ed.name = "Emergency Department - Unit A"
    old_ed.code = "ED-A"
    old_ed.capacity = 15

    # Create Unit B
    unit_b = Department(
        id=uuid_mod.uuid4(),
        tenant_id=current_user.tenant_id,
        name="Emergency Department - Unit B",
        code="ED-B",
        description="Emergency Department - Unit B - Providing specialized care",
        floor="Ground Floor",
        capacity=15,
        is_active=True
    )
    db.add(unit_b)
    await db.flush()

    # Move half the beds from Unit A to Unit B
    beds_result = await db.execute(
        select(Bed).where(
            Bed.department_id == old_ed.id,
            Bed.tenant_id == current_user.tenant_id
        ).order_by(Bed.bed_number)
    )
    all_ed_beds = beds_result.scalars().all()
    half = len(all_ed_beds) // 2
    moved_beds = 0
    moved_patients = 0

    for i, bed in enumerate(all_ed_beds):
        if i >= half:
            bed.department_id = unit_b.id
            # Rename bed number to ED-B prefix
            old_num = bed.bed_number.split("-")[-1] if "-" in bed.bed_number else f"{i+1:03d}"
            bed.bed_number = f"ED-B-{old_num}"
            moved_beds += 1
        else:
            # Rename remaining beds to ED-A prefix
            old_num = bed.bed_number.split("-")[-1] if "-" in bed.bed_number else f"{i+1:03d}"
            bed.bed_number = f"ED-A-{old_num}"

    # Move half the patients from Unit A to Unit B
    patients_result = await db.execute(
        select(Patient).where(
            Patient.department_id == old_ed.id,
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        ).order_by(Patient.admitted_at)
    )
    all_ed_patients = patients_result.scalars().all()
    p_half = len(all_ed_patients) // 2

    for i, patient in enumerate(all_ed_patients):
        if i >= p_half:
            patient.department_id = unit_b.id
            moved_patients += 1

    await db.commit()

    return {
        "success": True,
        "message": f"Split complete. Renamed ED → ED-A. Created ED-B. Moved {moved_beds} beds and {moved_patients} patients to Unit B."
    }


# ─── Bed Pricing (Hospital Admin) ───────────────────────────────────────────

VALID_BED_TYPES = ["icu", "general", "isolation", "pediatric", "maternity", "emergency", "daycare", "observation"]


@router.get("/bed-pricing", response_model=dict)
async def get_bed_pricing(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all bed type pricing for this hospital."""
    result = await db.execute(
        select(BedTypePricing).where(
            BedTypePricing.tenant_id == current_user.tenant_id
        ).order_by(BedTypePricing.bed_type)
    )
    pricing = result.scalars().all()

    # Build a map of configured types
    configured = {p.bed_type: p for p in pricing}

    data = []
    for bed_type in VALID_BED_TYPES:
        if bed_type in configured:
            p = configured[bed_type]
            data.append({
                "id": str(p.id),
                "bed_type": p.bed_type,
                "cost_per_day": float(p.cost_per_day),
                "currency": p.currency,
                "is_active": p.is_active,
                "status": "configured",
            })
        else:
            data.append({
                "id": None,
                "bed_type": bed_type,
                "cost_per_day": 0,
                "currency": "INR",
                "is_active": False,
                "status": "not_set",
            })

    return {"success": True, "data": data}


@router.post("/bed-pricing", response_model=dict, status_code=status.HTTP_201_CREATED)
async def set_bed_pricing(
    request: BedPricingCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Set or update pricing for a bed type (upsert)."""
    if request.bed_type not in VALID_BED_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid bed type. Must be one of: {', '.join(VALID_BED_TYPES)}")

    # Check if already exists (upsert)
    result = await db.execute(
        select(BedTypePricing).where(
            BedTypePricing.tenant_id == current_user.tenant_id,
            BedTypePricing.bed_type == request.bed_type,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.cost_per_day = request.cost_per_day
        existing.currency = request.currency
        existing.is_active = True
        await db.commit()
        return {"success": True, "data": {"id": str(existing.id)}, "message": f"Bed pricing updated for {request.bed_type}"}

    pricing = BedTypePricing(
        tenant_id=current_user.tenant_id,
        bed_type=request.bed_type,
        cost_per_day=request.cost_per_day,
        currency=request.currency,
        is_active=True,
    )
    db.add(pricing)
    await db.commit()
    return {"success": True, "data": {"id": str(pricing.id)}, "message": f"Bed pricing set for {request.bed_type}"}


@router.put("/bed-pricing/{pricing_id}", response_model=dict)
async def update_bed_pricing(
    pricing_id: UUID,
    request: BedPricingUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update bed type pricing."""
    result = await db.execute(
        select(BedTypePricing).where(
            BedTypePricing.id == pricing_id,
            BedTypePricing.tenant_id == current_user.tenant_id,
        )
    )
    pricing = result.scalar_one_or_none()
    if not pricing:
        raise HTTPException(status_code=404, detail="Bed pricing not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pricing, field, value)

    await db.commit()
    return {"success": True, "message": "Bed pricing updated"}


@router.delete("/bed-pricing/{pricing_id}", response_model=dict)
async def delete_bed_pricing(
    pricing_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Remove bed type pricing."""
    result = await db.execute(
        select(BedTypePricing).where(
            BedTypePricing.id == pricing_id,
            BedTypePricing.tenant_id == current_user.tenant_id,
        )
    )
    pricing = result.scalar_one_or_none()
    if not pricing:
        raise HTTPException(status_code=404, detail="Bed pricing not found")

    await db.delete(pricing)
    await db.commit()
    return {"success": True, "message": "Bed pricing removed"}


# ─── Usage Stats (Hospital Admin) ───────────────────────────────────────────

@router.get("/usage", response_model=dict)
async def get_usage_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get current live usage stats for this hospital."""
    usage = await get_current_usage(db, current_user.tenant_id)
    return {"success": True, "data": usage}


@router.get("/usage/history", response_model=dict)
async def get_usage_history(
    limit: int = Query(12, ge=1, le=24),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get historical usage snapshots for this hospital."""
    from app.models.usage import UsageRecord

    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.tenant_id == current_user.tenant_id
        ).order_by(UsageRecord.period_start.desc()).limit(limit)
    )
    records = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(r.id),
                "period_start": r.period_start.isoformat() if r.period_start else None,
                "period_end": r.period_end.isoformat() if r.period_end else None,
                "active_users": r.active_users,
                "total_beds": r.total_beds,
                "occupied_beds_avg": r.occupied_beds_avg,
                "patients_admitted": r.patients_admitted,
                "patients_discharged": r.patients_discharged,
                "ai_triage_calls": r.ai_triage_calls,
                "computed_amount": float(r.computed_amount) if r.computed_amount else 0,
            }
            for r in records
        ]
    }


@router.post("/cleanup-vitals", response_model=dict)
async def cleanup_invalid_vitals(
    dry_run: bool = Query(True, description="If true, only reports invalid records without fixing them"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Find and fix patient vitals with physiologically impossible values."""
    result = await db.execute(
        select(PatientVitals).where(
            PatientVitals.patient_id.in_(
                select(Patient.id).where(Patient.tenant_id == current_user.tenant_id)
            )
        )
    )
    all_vitals = result.scalars().all()

    invalid_records = []
    fixed_count = 0

    for v in all_vitals:
        issues = []
        if v.heart_rate is not None and (v.heart_rate < 20 or v.heart_rate > 300):
            issues.append(f"HR={v.heart_rate} (valid: 20-300)")
            if not dry_run:
                v.heart_rate = None
        if v.spo2 is not None and (float(v.spo2) < 0 or float(v.spo2) > 100):
            issues.append(f"SpO2={v.spo2} (valid: 0-100)")
            if not dry_run:
                v.spo2 = None
        if v.temperature is not None and (float(v.temperature) < 30 or float(v.temperature) > 45):
            issues.append(f"Temp={v.temperature} (valid: 30-45°C)")
            if not dry_run:
                v.temperature = None
        if v.respiratory_rate is not None and (v.respiratory_rate < 4 or v.respiratory_rate > 80):
            issues.append(f"RR={v.respiratory_rate} (valid: 4-80)")
            if not dry_run:
                v.respiratory_rate = None
        if v.blood_pressure_systolic is not None and (v.blood_pressure_systolic < 40 or v.blood_pressure_systolic > 300):
            issues.append(f"BP_sys={v.blood_pressure_systolic} (valid: 40-300)")
            if not dry_run:
                v.blood_pressure_systolic = None
        if v.blood_pressure_diastolic is not None and (v.blood_pressure_diastolic < 20 or v.blood_pressure_diastolic > 200):
            issues.append(f"BP_dia={v.blood_pressure_diastolic} (valid: 20-200)")
            if not dry_run:
                v.blood_pressure_diastolic = None

        if issues:
            invalid_records.append({
                "vitals_id": str(v.id),
                "patient_id": str(v.patient_id),
                "issues": issues
            })
            if not dry_run:
                fixed_count += 1

    if not dry_run and fixed_count > 0:
        await db.commit()

    return {
        "success": True,
        "data": {
            "total_vitals_checked": len(all_vitals),
            "invalid_records": len(invalid_records),
            "fixed": fixed_count if not dry_run else 0,
            "dry_run": dry_run,
            "details": invalid_records[:50]
        }
    }


@router.delete("/patients/{patient_id}", response_model=dict)
async def soft_delete_patient(
    patient_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Soft-delete a patient record (admin only). Used to remove test/dummy data."""
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

    patient.deleted_at = datetime.utcnow()

    # Also release any assigned bed
    if patient.bed_id:
        bed_result = await db.execute(
            select(Bed).where(Bed.id == patient.bed_id)
        )
        bed = bed_result.scalar_one_or_none()
        if bed:
            bed.status = "available"
            bed.current_patient_id = None
            bed.assigned_at = None

    await db.commit()

    return {
        "success": True,
        "message": f"Patient {patient.name} ({patient.patient_id}) has been deleted."
    }


@router.post("/cleanup-test-data", response_model=dict)
async def cleanup_test_data(
    dry_run: bool = Query(True, description="If true, only reports test records without deleting them"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Find and soft-delete obvious test/dummy patient records."""
    # Patterns that indicate test data
    test_patterns = [
        "test", "dummy", "flo3", "flow", "lappy", "gajala", "dance",
        "muqabulla", "burger", "asdf", "qwer", "xxx", "aaa", "bbb"
    ]

    result = await db.execute(
        select(Patient).where(
            Patient.tenant_id == current_user.tenant_id,
            Patient.deleted_at.is_(None)
        )
    )
    all_patients = result.scalars().all()

    test_patients = []
    for p in all_patients:
        name_lower = (p.name or "").lower().strip()
        is_test = any(pat in name_lower for pat in test_patterns)
        # Also flag single-word names < 4 chars that are not real names
        if not is_test and len(name_lower) <= 3 and name_lower.isalpha():
            is_test = True

        if is_test:
            test_patients.append({
                "id": str(p.id),
                "patient_id": p.patient_id,
                "name": p.name,
                "status": p.status
            })
            if not dry_run:
                p.deleted_at = datetime.utcnow()
                # Release bed
                if p.bed_id:
                    bed_result = await db.execute(
                        select(Bed).where(Bed.id == p.bed_id)
                    )
                    bed = bed_result.scalar_one_or_none()
                    if bed:
                        bed.status = "available"
                        bed.current_patient_id = None

    if not dry_run and test_patients:
        await db.commit()

    return {
        "success": True,
        "data": {
            "total_patients_checked": len(all_patients),
            "test_patients_found": len(test_patients),
            "deleted": len(test_patients) if not dry_run else 0,
            "dry_run": dry_run,
            "details": test_patients
        }
    }
