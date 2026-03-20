"""Hospital onboarding service — creates tenant + admin + departments + beds in one transaction."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date
from uuid import UUID
import uuid as uuid_mod

from app.models.tenant import Tenant
from app.models.user import User, UserSettings
from app.models.department import Department
from app.models.bed import Bed
from app.models.subscription import SubscriptionPlan
from app.core.security import get_password_hash


# Standard departments created for every new hospital
DEFAULT_DEPARTMENTS = [
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

# Bed configs per department code
BED_CONFIGS = {
    "ED-A": {"count": 15, "types": ["emergency", "trauma", "observation"]},
    "ED-B": {"count": 15, "types": ["emergency", "trauma", "observation"]},
    "ECU":  {"count": 8,  "types": ["emergency", "observation"]},
    "TC":   {"count": 10, "types": ["emergency", "observation"]},
    "OPD":  {"count": 20, "types": ["daycare", "observation"]},
    "ICU":  {"count": 12, "types": ["icu", "isolation"]},
    "GW":   {"count": 30, "types": ["general"]},
    "PED":  {"count": 15, "types": ["pediatric", "general"]},
    "CARD": {"count": 12, "types": ["icu", "general"]},
}
DEFAULT_BED_CONFIG = {"count": 10, "types": ["general"]}


async def create_departments_for_tenant(
    db: AsyncSession,
    tenant_id: UUID,
    department_codes: list[str] | None = None,
) -> list[Department]:
    """Create departments for a tenant. If department_codes is None, create all defaults."""
    departments_to_create = DEFAULT_DEPARTMENTS
    if department_codes:
        departments_to_create = [d for d in DEFAULT_DEPARTMENTS if d["code"] in department_codes]

    created = []
    for dept_data in departments_to_create:
        dept = Department(
            id=uuid_mod.uuid4(),
            tenant_id=tenant_id,
            name=dept_data["name"],
            code=dept_data["code"],
            description=f"{dept_data['name']} - Providing specialized care",
            floor=dept_data["floor"],
            capacity=dept_data["capacity"],
            is_active=True
        )
        db.add(dept)
        created.append(dept)

    await db.flush()
    return created


async def create_beds_for_departments(
    db: AsyncSession,
    tenant_id: UUID,
    departments: list[Department],
) -> int:
    """Create default beds for each department. Returns total beds created."""
    total = 0
    for dept in departments:
        config = BED_CONFIGS.get(dept.code, DEFAULT_BED_CONFIG)
        for i in range(config["count"]):
            bed = Bed(
                id=uuid_mod.uuid4(),
                tenant_id=tenant_id,
                bed_number=f"{dept.code}-{i+1:03d}",
                department_id=dept.id,
                bed_type=config["types"][i % len(config["types"])],
                floor=dept.floor,
                wing="A" if i < config["count"] // 2 else "B",
                status="available",
                is_active=True
            )
            db.add(bed)
            total += 1
    await db.flush()
    return total


async def onboard_hospital(
    db: AsyncSession,
    *,
    name: str,
    code: str,
    plan_id: UUID,
    admin_name: str,
    admin_email: str,
    admin_password: str,
    domain: str | None = None,
    logo_url: str | None = None,
    address: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    admin_phone: str | None = None,
    department_codes: list[str] | None = None,
) -> dict:
    """
    Onboard a new hospital in a single transaction.
    Creates: tenant, admin user, departments, beds.
    Returns dict with created entity IDs.
    """
    # Validate plan exists
    plan_result = await db.execute(
        select(SubscriptionPlan).where(
            SubscriptionPlan.id == plan_id,
            SubscriptionPlan.is_active == True
        )
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise ValueError("Invalid or inactive subscription plan")

    # Check tenant code uniqueness
    existing = await db.execute(
        select(Tenant.id).where(Tenant.code == code)
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Tenant code '{code}' already exists")

    # 1. Create tenant
    tenant_id = uuid_mod.uuid4()
    tenant = Tenant(
        id=tenant_id,
        name=name,
        code=code,
        domain=domain,
        logo_url=logo_url,
        address=address,
        phone=phone,
        email=email,
        plan_id=plan_id,
        subscription_plan=plan.code,
        subscription_status="active",
        subscription_starts_at=datetime.utcnow(),
        max_users=plan.max_users,
        max_beds=plan.max_beds,
        is_active=True,
    )
    db.add(tenant)
    await db.flush()

    # 2. Create initial admin user
    admin_user = User(
        id=uuid_mod.uuid4(),
        tenant_id=tenant_id,
        employee_id="ADMIN-001",
        email=admin_email,
        password_hash=get_password_hash(admin_password),
        name=admin_name,
        role="admin",
        phone=admin_phone,
        status="active",
        joined_at=date.today(),
    )
    db.add(admin_user)
    await db.flush()

    # Create default settings for admin
    settings = UserSettings(user_id=admin_user.id)
    db.add(settings)

    # 3. Create departments
    departments = await create_departments_for_tenant(db, tenant_id, department_codes)

    # 4. Create beds
    beds_created = await create_beds_for_departments(db, tenant_id, departments)

    await db.commit()

    return {
        "tenant_id": str(tenant_id),
        "tenant_name": name,
        "tenant_code": code,
        "plan_name": plan.name,
        "admin_user_id": str(admin_user.id),
        "admin_email": admin_email,
        "departments_created": len(departments),
        "beds_created": beds_created,
    }
