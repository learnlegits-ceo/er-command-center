"""
Seed data script for ER Command Center
Creates sample data for all departments with different patients
"""

import asyncio
import uuid
import random
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.database import Base
from app.models.tenant import Tenant
from app.models.department import Department
from app.models.user import User
from app.models.bed import Bed
from app.models.patient import Patient, PatientVitals

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    poolclass=NullPool,
    future=True
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def create_tables():
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created")


async def seed_data():
    """Seed the database with sample data."""
    async with async_session_maker() as session:
        # Create Tenant
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            name="City General Hospital",
            code="CGH001",
            domain="citygeneral.health",
            address="123 Medical Center Drive, Healthcare City",
            phone="+1-555-0100",
            email="admin@citygeneral.health",
            subscription_plan="enterprise",
            subscription_status="active",
            max_users=200,
            max_beds=500,
            is_active=True
        )
        session.add(tenant)
        print("[OK] Tenant created")

        # Create Departments
        departments_data = [
            {"name": "Emergency Department", "code": "ED", "floor": "Ground Floor", "capacity": 30},
            {"name": "Emergency Care Unit", "code": "ECU", "floor": "Ground Floor", "capacity": 15},
            {"name": "Trauma Center", "code": "TC", "floor": "Ground Floor", "capacity": 20},
            {"name": "Outpatient Department", "code": "OPD", "floor": "1st Floor", "capacity": 50},
            {"name": "Intensive Care Unit", "code": "ICU", "floor": "2nd Floor", "capacity": 20},
            {"name": "General Ward", "code": "GW", "floor": "3rd Floor", "capacity": 60},
            {"name": "Pediatrics", "code": "PED", "floor": "4th Floor", "capacity": 25},
            {"name": "Cardiology", "code": "CARD", "floor": "5th Floor", "capacity": 20},
        ]

        departments = {}
        for dept_data in departments_data:
            dept = Department(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                name=dept_data["name"],
                code=dept_data["code"],
                description=f"{dept_data['name']} - Providing specialized care",
                floor=dept_data["floor"],
                capacity=dept_data["capacity"],
                is_active=True
            )
            session.add(dept)
            departments[dept_data["code"]] = dept
        print("[OK] Departments created")

        # Create Users (Doctors and Nurses)
        # Default password for most users
        password_hash = get_password_hash("password123")

        # Demo user passwords (matching Login page)
        nurse_hash = get_password_hash("nurse123")
        doctor_hash = get_password_hash("doctor123")
        admin_hash = get_password_hash("admin123")

        # Demo users first (matching Login page credentials)
        demo_users = [
            {"name": "Priya Sharma", "email": "priya@hospital.com", "role": "nurse", "dept": "ED", "password_hash": nurse_hash},
            {"name": "Dr. Ananya Patel", "email": "ananya@hospital.com", "role": "doctor", "dept": "ED", "specialization": "Emergency Medicine", "password_hash": doctor_hash},
            {"name": "Rajesh Kumar", "email": "rajesh@hospital.com", "role": "admin", "dept": "ED", "password_hash": admin_hash},
        ]

        users_data = [
            # Emergency Department Staff
            {"name": "Dr. Sarah Johnson", "email": "sarah.johnson@hospital.com", "role": "doctor", "dept": "ED", "specialization": "Emergency Medicine"},
            {"name": "Dr. Michael Chen", "email": "michael.chen@hospital.com", "role": "doctor", "dept": "ED", "specialization": "Trauma Surgery"},
            {"name": "Nurse Emily Davis", "email": "emily.davis@hospital.com", "role": "nurse", "dept": "ED"},
            {"name": "Nurse James Wilson", "email": "james.wilson@hospital.com", "role": "nurse", "dept": "ED"},

            # OPD Staff
            {"name": "Dr. Amanda Roberts", "email": "amanda.roberts@hospital.com", "role": "doctor", "dept": "OPD", "specialization": "General Medicine"},
            {"name": "Dr. David Lee", "email": "david.lee@hospital.com", "role": "doctor", "dept": "OPD", "specialization": "Family Medicine"},
            {"name": "Nurse Rachel Green", "email": "rachel.green@hospital.com", "role": "nurse", "dept": "OPD"},

            # ICU Staff
            {"name": "Dr. Robert Martinez", "email": "robert.martinez@hospital.com", "role": "doctor", "dept": "ICU", "specialization": "Critical Care"},
            {"name": "Dr. Jennifer White", "email": "jennifer.white@hospital.com", "role": "doctor", "dept": "ICU", "specialization": "Pulmonology"},
            {"name": "Nurse Mark Thompson", "email": "mark.thompson@hospital.com", "role": "nurse", "dept": "ICU"},
            {"name": "Nurse Lisa Anderson", "email": "lisa.anderson@hospital.com", "role": "nurse", "dept": "ICU"},

            # General Ward Staff
            {"name": "Dr. William Brown", "email": "william.brown@hospital.com", "role": "doctor", "dept": "GW", "specialization": "Internal Medicine"},
            {"name": "Nurse Susan Miller", "email": "susan.miller@hospital.com", "role": "nurse", "dept": "GW"},

            # Pediatrics Staff
            {"name": "Dr. Patricia Garcia", "email": "patricia.garcia@hospital.com", "role": "doctor", "dept": "PED", "specialization": "Pediatrics"},
            {"name": "Nurse Nancy Taylor", "email": "nancy.taylor@hospital.com", "role": "nurse", "dept": "PED"},

            # Cardiology Staff
            {"name": "Dr. Thomas Anderson", "email": "thomas.anderson@hospital.com", "role": "doctor", "dept": "CARD", "specialization": "Cardiology"},
            {"name": "Nurse Karen Jackson", "email": "karen.jackson@hospital.com", "role": "nurse", "dept": "CARD"},

            # Emergency Care Unit Staff
            {"name": "Dr. Anil Gupta", "email": "anil.gupta@hospital.com", "role": "doctor", "dept": "ECU", "specialization": "Emergency Medicine"},
            {"name": "Nurse Sneha Reddy", "email": "sneha.reddy@hospital.com", "role": "nurse", "dept": "ECU"},

            # Trauma Center Staff
            {"name": "Dr. Vikram Kapoor", "email": "vikram.kapoor@hospital.com", "role": "doctor", "dept": "TC", "specialization": "Trauma Surgery"},
            {"name": "Nurse Deepak Verma", "email": "deepak.verma@hospital.com", "role": "nurse", "dept": "TC"},

            # Admin
            {"name": "Admin User", "email": "admin@hospital.com", "role": "admin", "dept": "OPD"},
        ]

        users = {}

        # Create demo users first (with specific passwords matching Login page)
        for i, user_data in enumerate(demo_users):
            user = User(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                employee_id=f"DEMO{1+i}",
                email=user_data["email"],
                password_hash=user_data["password_hash"],
                name=user_data["name"],
                role=user_data["role"],
                department_id=departments[user_data["dept"]].id,
                phone=f"+91-9876543{210+i}",
                specialization=user_data.get("specialization"),
                status="active",
                joined_at=date.today() - timedelta(days=365)
            )
            session.add(user)
            users[user_data["email"]] = user
        print("[OK] Demo users created (priya, ananya, rajesh)")

        # Create other staff users
        for i, user_data in enumerate(users_data):
            user = User(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                employee_id=f"EMP{1001+i}",
                email=user_data["email"],
                password_hash=password_hash,
                name=user_data["name"],
                role=user_data["role"],
                department_id=departments[user_data["dept"]].id,
                phone=f"+1-555-{1000+i:04d}",
                specialization=user_data.get("specialization"),
                status="active",
                joined_at=date.today() - timedelta(days=365)
            )
            session.add(user)
            users[user_data["email"]] = user
        print("[OK] Staff users created")

        # Create Beds for each department
        bed_configs = {
            "ED": {"prefix": "ED", "count": 15, "types": ["emergency", "trauma", "observation"]},
            "ECU": {"prefix": "ECU", "count": 8, "types": ["emergency", "observation", "monitoring"]},
            "TC": {"prefix": "TC", "count": 10, "types": ["trauma", "emergency", "observation"]},
            "OPD": {"prefix": "OPD", "count": 20, "types": ["consultation", "examination", "procedure"]},
            "ICU": {"prefix": "ICU", "count": 12, "types": ["icu", "isolation", "cardiac"]},
            "GW": {"prefix": "GW", "count": 30, "types": ["general", "semi-private", "private"]},
            "PED": {"prefix": "PED", "count": 15, "types": ["pediatric", "nicu", "general"]},
            "CARD": {"prefix": "CARD", "count": 12, "types": ["cardiac", "ccu", "monitoring"]},
        }

        beds = {}
        for dept_code, config in bed_configs.items():
            dept_beds = []
            for i in range(config["count"]):
                bed = Bed(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    bed_number=f"{config['prefix']}-{i+1:03d}",
                    department_id=departments[dept_code].id,
                    bed_type=config["types"][i % len(config["types"])],
                    floor=departments[dept_code].floor,
                    wing="A" if i < config["count"]//2 else "B",
                    status="available",
                    is_active=True
                )
                session.add(bed)
                dept_beds.append(bed)
            beds[dept_code] = dept_beds
        print("[OK] Beds created")

        # Create Patients with DIFFERENT data for each department

        # Emergency Department Patients - Acute cases
        ed_patients = [
            {"name": "John Smith", "age": 45, "gender": "M", "complaint": "Severe chest pain radiating to left arm", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "in_treatment", "blood_group": "A+"},
            {"name": "Maria Garcia", "age": 32, "gender": "F", "complaint": "High fever with severe headache and stiff neck", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "in_treatment", "blood_group": "O+"},
            {"name": "Robert Johnson", "age": 58, "gender": "M", "complaint": "Difficulty breathing, history of COPD", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "in_treatment", "blood_group": "B+"},
            {"name": "Emily Brown", "age": 28, "gender": "F", "complaint": "Severe abdominal pain, vomiting blood", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "waiting", "blood_group": "AB+"},
            {"name": "David Wilson", "age": 67, "gender": "M", "complaint": "Sudden weakness on right side, slurred speech", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "in_treatment", "blood_group": "O-"},
            {"name": "Sarah Davis", "age": 41, "gender": "F", "complaint": "Allergic reaction with swelling and difficulty breathing", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "waiting", "blood_group": "A-"},
        ]

        # OPD Patients - Routine and follow-up cases
        opd_patients = [
            {"name": "Michael Lee", "age": 35, "gender": "M", "complaint": "Follow-up for diabetes management", "priority": 4, "priority_label": "Non-Urgent", "priority_color": "green", "status": "waiting", "blood_group": "B+"},
            {"name": "Jennifer Taylor", "age": 42, "gender": "F", "complaint": "Annual health checkup", "priority": 5, "priority_label": "Routine", "priority_color": "blue", "status": "waiting", "blood_group": "O+"},
            {"name": "Christopher Moore", "age": 55, "gender": "M", "complaint": "Hypertension medication review", "priority": 4, "priority_label": "Non-Urgent", "priority_color": "green", "status": "in_consultation", "blood_group": "A+"},
            {"name": "Amanda Martinez", "age": 29, "gender": "F", "complaint": "Persistent cough for 2 weeks", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "waiting", "blood_group": "AB+"},
            {"name": "Daniel Anderson", "age": 48, "gender": "M", "complaint": "Lower back pain, chronic", "priority": 4, "priority_label": "Non-Urgent", "priority_color": "green", "status": "in_consultation", "blood_group": "B-"},
            {"name": "Jessica Thomas", "age": 38, "gender": "F", "complaint": "Skin rash and itching", "priority": 4, "priority_label": "Non-Urgent", "priority_color": "green", "status": "waiting", "blood_group": "O-"},
            {"name": "Kevin Jackson", "age": 52, "gender": "M", "complaint": "Post-surgery follow-up - knee replacement", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "waiting", "blood_group": "A-"},
            {"name": "Michelle White", "age": 33, "gender": "F", "complaint": "Prenatal checkup - 28 weeks", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "in_consultation", "blood_group": "AB-"},
        ]

        # ICU Patients - Critical care
        icu_patients = [
            {"name": "George Harris", "age": 72, "gender": "M", "complaint": "Post cardiac surgery - triple bypass", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "critical", "blood_group": "O+"},
            {"name": "Patricia Clark", "age": 65, "gender": "F", "complaint": "Severe pneumonia with respiratory failure", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "critical", "blood_group": "A+"},
            {"name": "James Lewis", "age": 48, "gender": "M", "complaint": "Multi-organ failure - sepsis", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "critical", "blood_group": "B+"},
            {"name": "Barbara Walker", "age": 58, "gender": "F", "complaint": "Traumatic brain injury - car accident", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "critical", "blood_group": "AB+"},
            {"name": "Richard Hall", "age": 69, "gender": "M", "complaint": "Acute myocardial infarction - stent placement", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "stable", "blood_group": "O-"},
        ]

        # General Ward Patients - Admitted for observation/recovery
        gw_patients = [
            {"name": "Nancy Young", "age": 45, "gender": "F", "complaint": "Post appendectomy - Day 2", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "admitted", "blood_group": "A+"},
            {"name": "Steven King", "age": 56, "gender": "M", "complaint": "Diabetic foot ulcer treatment", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "admitted", "blood_group": "B+"},
            {"name": "Dorothy Wright", "age": 68, "gender": "F", "complaint": "Hip replacement recovery - Day 4", "priority": 4, "priority_label": "Non-Urgent", "priority_color": "green", "status": "admitted", "blood_group": "O+"},
            {"name": "Paul Scott", "age": 42, "gender": "M", "complaint": "Dehydration and electrolyte imbalance", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "admitted", "blood_group": "AB+"},
            {"name": "Ruth Green", "age": 75, "gender": "F", "complaint": "Urinary tract infection - IV antibiotics", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "admitted", "blood_group": "A-"},
            {"name": "Edward Baker", "age": 51, "gender": "M", "complaint": "Gallbladder removal recovery", "priority": 4, "priority_label": "Non-Urgent", "priority_color": "green", "status": "ready_for_discharge", "blood_group": "B-"},
        ]

        # Pediatrics Patients - Children
        ped_patients = [
            {"name": "Tommy Adams", "age": 8, "gender": "M", "complaint": "Asthma exacerbation", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "in_treatment", "blood_group": "O+"},
            {"name": "Sophie Nelson", "age": 5, "gender": "F", "complaint": "High fever with ear infection", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "waiting", "blood_group": "A+"},
            {"name": "Lucas Carter", "age": 12, "gender": "M", "complaint": "Fractured arm - sports injury", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "in_treatment", "blood_group": "B+"},
            {"name": "Emma Mitchell", "age": 3, "gender": "F", "complaint": "Severe dehydration - gastroenteritis", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "admitted", "blood_group": "AB+"},
            {"name": "Oliver Perez", "age": 10, "gender": "M", "complaint": "Appendicitis symptoms", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "in_treatment", "blood_group": "O-"},
        ]

        # Emergency Care Unit Patients - Acute observation
        ecu_patients = [
            {"name": "Sunita Devi", "age": 55, "gender": "F", "complaint": "Sudden weakness, dizziness, near-syncope", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "in_treatment", "blood_group": "A+"},
            {"name": "Karthik Reddy", "age": 48, "gender": "M", "complaint": "Chest discomfort with palpitations", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "in_treatment", "blood_group": "B+"},
            {"name": "Anita Verma", "age": 62, "gender": "F", "complaint": "Acute gastritis with severe vomiting", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "waiting", "blood_group": "O+"},
            {"name": "Mohan Das", "age": 71, "gender": "M", "complaint": "Hypoglycemic episode, diabetic patient", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "in_treatment", "blood_group": "AB+"},
        ]

        # Trauma Center Patients - Injuries and accidents
        tc_patients = [
            {"name": "Rahul Sharma", "age": 25, "gender": "M", "complaint": "Fall from height, suspected head injury", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "critical", "blood_group": "O+"},
            {"name": "Priya Nair", "age": 31, "gender": "F", "complaint": "Motor vehicle accident, open fracture right leg", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "in_treatment", "blood_group": "A+"},
            {"name": "Suresh Babu", "age": 40, "gender": "M", "complaint": "Industrial crush injury, left hand", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "in_treatment", "blood_group": "B-"},
            {"name": "Kavitha Iyer", "age": 22, "gender": "F", "complaint": "Burns 20% TBSA, kitchen accident", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "critical", "blood_group": "AB+"},
        ]

        # Cardiology Patients - Heart conditions
        card_patients = [
            {"name": "Margaret Roberts", "age": 62, "gender": "F", "complaint": "Atrial fibrillation - rate control", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "admitted", "blood_group": "A+"},
            {"name": "Frank Turner", "age": 70, "gender": "M", "complaint": "Congestive heart failure - fluid management", "priority": 2, "priority_label": "Urgent", "priority_color": "orange", "status": "admitted", "blood_group": "B+"},
            {"name": "Helen Phillips", "age": 55, "gender": "F", "complaint": "Post pacemaker implantation", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "stable", "blood_group": "O+"},
            {"name": "Carl Campbell", "age": 68, "gender": "M", "complaint": "Angina evaluation - stress test", "priority": 3, "priority_label": "Standard", "priority_color": "yellow", "status": "in_treatment", "blood_group": "AB+"},
            {"name": "Betty Parker", "age": 74, "gender": "F", "complaint": "Hypertensive crisis", "priority": 1, "priority_label": "Critical", "priority_color": "red", "status": "critical", "blood_group": "A-"},
        ]

        # Map patients to departments
        patient_groups = [
            ("ED", ed_patients, "sarah.johnson@hospital.com", "emily.davis@hospital.com"),
            ("ECU", ecu_patients, "anil.gupta@hospital.com", "sneha.reddy@hospital.com"),
            ("TC", tc_patients, "vikram.kapoor@hospital.com", "deepak.verma@hospital.com"),
            ("OPD", opd_patients, "amanda.roberts@hospital.com", "rachel.green@hospital.com"),
            ("ICU", icu_patients, "robert.martinez@hospital.com", "mark.thompson@hospital.com"),
            ("GW", gw_patients, "william.brown@hospital.com", "susan.miller@hospital.com"),
            ("PED", ped_patients, "patricia.garcia@hospital.com", "nancy.taylor@hospital.com"),
            ("CARD", card_patients, "thomas.anderson@hospital.com", "karen.jackson@hospital.com"),
        ]

        # First, flush beds so they exist in DB
        await session.flush()

        # Track bed-patient assignments for later
        bed_patient_assignments = []

        patient_counter = 1
        for dept_code, patients_data, doctor_email, nurse_email in patient_groups:
            dept = departments[dept_code]
            doctor = users[doctor_email]
            nurse = users[nurse_email]
            dept_beds = beds[dept_code]

            for i, p_data in enumerate(patients_data):
                # Assign bed if patient is not waiting
                bed = None
                if p_data["status"] not in ["waiting", "pending_triage"]:
                    if i < len(dept_beds):
                        bed = dept_beds[i]
                        bed.status = "occupied"

                # Generate UHI (8-digit national health ID) and EUHI (encounter ID)
                uhi_number = f"{random.randint(10000000, 99999999)}"
                admit_time = datetime.utcnow() - timedelta(hours=patient_counter % 48)
                euhi_number = f"{admit_time.strftime('%m%d%y')}-{patient_counter:04d}"

                patient = Patient(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    patient_id=f"PT-{patient_counter:05d}",
                    name=p_data["name"],
                    age=p_data["age"],
                    date_of_birth=date.today() - timedelta(days=p_data["age"]*365),
                    gender=p_data["gender"],
                    phone=f"+1-555-{2000+patient_counter:04d}",
                    blood_group=p_data.get("blood_group", "O+"),
                    complaint=p_data["complaint"],
                    status=p_data["status"],
                    priority=p_data["priority"],
                    priority_label=p_data["priority_label"],
                    priority_color=p_data["priority_color"],
                    department_id=dept.id,
                    bed_id=bed.id if bed else None,
                    assigned_doctor_id=doctor.id,
                    assigned_nurse_id=nurse.id,
                    admitted_at=admit_time,
                    uhi=uhi_number,
                    euhi=euhi_number,
                )
                session.add(patient)

                # Track for later bed assignment (after patients are flushed)
                if bed:
                    bed_patient_assignments.append((bed, patient))

                # Add vital signs for admitted/in-treatment patients
                if p_data["status"] not in ["waiting", "pending_triage"]:
                    vitals = PatientVitals(
                        id=uuid.uuid4(),
                        patient_id=patient.id,
                        heart_rate=70 + (patient_counter % 30),
                        blood_pressure_systolic=110 + (patient_counter % 40),
                        blood_pressure_diastolic=70 + (patient_counter % 20),
                        blood_pressure=f"{110 + (patient_counter % 40)}/{70 + (patient_counter % 20)}",
                        spo2=95 + (patient_counter % 5),
                        temperature=36.5 + ((patient_counter % 20) / 10),
                        respiratory_rate=14 + (patient_counter % 8),
                        pain_level=patient_counter % 10,
                        source="manual",
                        is_critical=p_data["priority"] == 1
                    )
                    session.add(vitals)

                patient_counter += 1

        print(f"[OK] {patient_counter - 1} Patients created with vitals")

        # Flush patients to DB first
        await session.flush()
        print("[OK] Patients flushed to database")

        # Now update beds with patient assignments (after patients exist in DB)
        for bed, patient in bed_patient_assignments:
            bed.current_patient_id = patient.id
        print(f"[OK] {len(bed_patient_assignments)} Bed assignments updated")

        # Commit all changes
        await session.commit()
        print("\n[SUCCESS] Seed data successfully committed to database!")
        print(f"\n Demo Login Credentials (shown on Login page):")
        print(f"  Nurse:  priya@hospital.com / nurse123")
        print(f"  Doctor: ananya@hospital.com / doctor123")
        print(f"  Admin:  rajesh@hospital.com / admin123")
        print(f"\n Additional Staff (password123 for all):")
        print(f"  Admin:  admin@hospital.com / password123")
        print(f"  Doctor: sarah.johnson@hospital.com / password123")
        print(f"  Nurse:  emily.davis@hospital.com / password123")


async def main():
    """Main function to run seeding."""
    print("=" * 50)
    print("ER Command Center - Database Seeding")
    print("=" * 50)

    print("\n1. Creating database tables...")
    await create_tables()

    print("\n2. Seeding sample data...")
    await seed_data()

    print("\n" + "=" * 50)
    print("Database seeding complete!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
