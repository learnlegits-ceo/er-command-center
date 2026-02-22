"""
Doctor/Staff Assignment Service
Handles automatic and manual assignment of medical staff to patients
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.patient import Patient
from app.models.department import Department


# Specialty mapping for triage recommendations
SPECIALTY_MAPPING = {
    "Emergency Medicine": ["ED", "Emergency"],
    "Cardiology": ["CARD", "Cardiology"],
    "Orthopedics": ["ORTHO", "Orthopedics"],
    "Neurology": ["NEURO", "Neurology"],
    "Pulmonology": ["PULM", "Pulmonology"],
    "Gastroenterology": ["GI", "Gastroenterology"],
    "Pediatrics": ["PED", "Pediatrics"],
    "General Medicine": ["OPD", "GW", "General"],
    "Surgery": ["SURG", "Surgery"],
    "ICU": ["ICU", "Intensive Care"]
}


class AssignmentService:
    """Service for assigning doctors and nurses to patients."""

    async def auto_assign_doctor(
        self,
        db: AsyncSession,
        patient: Patient,
        recommended_specialty: Optional[str] = None,
        triage_level: int = 3
    ) -> Optional[User]:
        """
        Automatically assign the best available doctor to a patient.

        Selection criteria:
        1. Doctor must be active
        2. Prefer doctors matching recommended specialty
        3. Prefer doctors with fewer current patients (load balancing)
        4. For critical cases (L1-L2), prioritize doctors in ED/ICU
        """
        try:
            # Get all active doctors
            query = (
                select(User)
                .options(selectinload(User.department))
                .where(
                    User.role == "doctor",
                    User.status == "active",
                    User.deleted_at.is_(None),
                    User.tenant_id == patient.tenant_id
                )
            )

            result = await db.execute(query)
            doctors = result.scalars().all()

            if not doctors:
                print("[ASSIGNMENT] No available doctors found")
                return None

            # Score each doctor
            scored_doctors = []
            for doctor in doctors:
                score = await self._calculate_doctor_score(
                    db, doctor, recommended_specialty, triage_level
                )
                scored_doctors.append((doctor, score))

            # Sort by score (higher is better)
            scored_doctors.sort(key=lambda x: x[1], reverse=True)

            # Return the best match
            best_doctor = scored_doctors[0][0]
            print(f"[ASSIGNMENT] Auto-assigned Dr. {best_doctor.name} (score: {scored_doctors[0][1]})")

            return best_doctor

        except Exception as e:
            print(f"[ASSIGNMENT] Error in auto_assign_doctor: {e}")
            return None

    async def _calculate_doctor_score(
        self,
        db: AsyncSession,
        doctor: User,
        recommended_specialty: Optional[str],
        triage_level: int
    ) -> float:
        """Calculate a score for doctor assignment (higher = better match)."""
        score = 50.0  # Base score

        # Specialty matching (+30 points)
        if recommended_specialty and doctor.specialization:
            specialty_lower = recommended_specialty.lower()
            doctor_spec_lower = doctor.specialization.lower()

            # Exact match
            if specialty_lower in doctor_spec_lower or doctor_spec_lower in specialty_lower:
                score += 30
            # Partial match through mapping
            elif recommended_specialty in SPECIALTY_MAPPING:
                for code in SPECIALTY_MAPPING[recommended_specialty]:
                    if code.lower() in doctor_spec_lower:
                        score += 25
                        break

        # Department matching for critical cases (+20 points)
        if triage_level <= 2 and doctor.department:
            dept_code = doctor.department.code if doctor.department else ""
            if dept_code in ["ED", "ICU", "CARD"]:
                score += 20

        # Load balancing - fewer patients = higher score (+20 points max)
        try:
            patient_count_result = await db.execute(
                select(func.count(Patient.id)).where(
                    Patient.assigned_doctor_id == doctor.id,
                    Patient.status.in_(["active", "in_treatment", "admitted", "pending_triage"])
                )
            )
            patient_count = patient_count_result.scalar() or 0

            # Max 10 patients per doctor before penalty
            if patient_count < 10:
                score += (10 - patient_count) * 2  # Up to +20 points
            else:
                score -= (patient_count - 10) * 5  # Penalty for overloaded doctors
        except:
            pass

        return score

    async def auto_assign_nurse(
        self,
        db: AsyncSession,
        patient: Patient,
        department_id: Optional[UUID] = None
    ) -> Optional[User]:
        """
        Automatically assign an available nurse to a patient.

        Selection criteria:
        1. Nurse must be active
        2. Prefer nurses in the same department
        3. Prefer nurses with fewer current patients
        """
        try:
            query = (
                select(User)
                .options(selectinload(User.department))
                .where(
                    User.role == "nurse",
                    User.status == "active",
                    User.deleted_at.is_(None),
                    User.tenant_id == patient.tenant_id
                )
            )

            # Prefer same department
            if department_id:
                query = query.where(User.department_id == department_id)

            result = await db.execute(query)
            nurses = list(result.scalars().all())

            # If no nurses in department, get any available nurse
            if not nurses and department_id:
                query = (
                    select(User)
                    .where(
                        User.role == "nurse",
                        User.status == "active",
                        User.deleted_at.is_(None),
                        User.tenant_id == patient.tenant_id
                    )
                )
                result = await db.execute(query)
                nurses = list(result.scalars().all())

            if not nurses:
                print("[ASSIGNMENT] No available nurses found")
                return None

            # Score nurses by workload
            scored_nurses = []
            for nurse in nurses:
                try:
                    patient_count_result = await db.execute(
                        select(func.count(Patient.id)).where(
                            Patient.assigned_nurse_id == nurse.id,
                            Patient.status.in_(["active", "in_treatment", "admitted", "pending_triage"])
                        )
                    )
                    patient_count = patient_count_result.scalar() or 0
                    score = 100 - (patient_count * 5)  # Lower patient count = higher score
                    scored_nurses.append((nurse, score))
                except:
                    scored_nurses.append((nurse, 50))

            # Sort by score
            scored_nurses.sort(key=lambda x: x[1], reverse=True)

            best_nurse = scored_nurses[0][0]
            print(f"[ASSIGNMENT] Auto-assigned Nurse {best_nurse.name}")

            return best_nurse

        except Exception as e:
            print(f"[ASSIGNMENT] Error in auto_assign_nurse: {e}")
            return None

    async def get_available_doctors(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        specialty: Optional[str] = None,
        department_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """Get list of available doctors with their current workload."""
        query = (
            select(User)
            .options(selectinload(User.department))
            .where(
                User.role == "doctor",
                User.status == "active",
                User.deleted_at.is_(None),
                User.tenant_id == tenant_id
            )
        )

        if specialty:
            query = query.where(User.specialization.ilike(f"%{specialty}%"))

        if department_id:
            query = query.where(User.department_id == department_id)

        result = await db.execute(query)
        doctors = result.scalars().all()

        doctor_list = []
        for doctor in doctors:
            # Get patient count
            patient_count_result = await db.execute(
                select(func.count(Patient.id)).where(
                    Patient.assigned_doctor_id == doctor.id,
                    Patient.status.in_(["active", "in_treatment", "admitted", "pending_triage"])
                )
            )
            patient_count = patient_count_result.scalar() or 0

            doctor_list.append({
                "id": str(doctor.id),
                "name": doctor.name,
                "specialization": doctor.specialization,
                "department": doctor.department.name if doctor.department else None,
                "current_patients": patient_count,
                "status": doctor.status
            })

        return doctor_list

    async def get_available_nurses(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        department_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """Get list of available nurses with their current workload."""
        query = (
            select(User)
            .options(selectinload(User.department))
            .where(
                User.role == "nurse",
                User.status == "active",
                User.deleted_at.is_(None),
                User.tenant_id == tenant_id
            )
        )

        if department_id:
            query = query.where(User.department_id == department_id)

        result = await db.execute(query)
        nurses = result.scalars().all()

        nurse_list = []
        for nurse in nurses:
            # Get patient count
            patient_count_result = await db.execute(
                select(func.count(Patient.id)).where(
                    Patient.assigned_nurse_id == nurse.id,
                    Patient.status.in_(["active", "in_treatment", "admitted", "pending_triage"])
                )
            )
            patient_count = patient_count_result.scalar() or 0

            nurse_list.append({
                "id": str(nurse.id),
                "name": nurse.name,
                "department": nurse.department.name if nurse.department else None,
                "current_patients": patient_count,
                "status": nurse.status
            })

        return nurse_list

    async def reassign_patient(
        self,
        db: AsyncSession,
        patient: Patient,
        new_doctor_id: Optional[UUID] = None,
        new_nurse_id: Optional[UUID] = None,
        reason: Optional[str] = None
    ) -> bool:
        """Manually reassign a patient to different staff."""
        try:
            if new_doctor_id:
                # Verify doctor exists and is active
                doctor_result = await db.execute(
                    select(User).where(
                        User.id == new_doctor_id,
                        User.role == "doctor",
                        User.status == "active"
                    )
                )
                doctor = doctor_result.scalar_one_or_none()
                if doctor:
                    patient.assigned_doctor_id = new_doctor_id
                    print(f"[ASSIGNMENT] Reassigned patient to Dr. {doctor.name}")
                else:
                    print(f"[ASSIGNMENT] Doctor {new_doctor_id} not found or not active")
                    return False

            if new_nurse_id:
                # Verify nurse exists and is active
                nurse_result = await db.execute(
                    select(User).where(
                        User.id == new_nurse_id,
                        User.role == "nurse",
                        User.status == "active"
                    )
                )
                nurse = nurse_result.scalar_one_or_none()
                if nurse:
                    patient.assigned_nurse_id = new_nurse_id
                    print(f"[ASSIGNMENT] Reassigned patient to Nurse {nurse.name}")
                else:
                    print(f"[ASSIGNMENT] Nurse {new_nurse_id} not found or not active")
                    return False

            return True

        except Exception as e:
            print(f"[ASSIGNMENT] Error in reassign_patient: {e}")
            return False


# Global assignment service instance
assignment_service = AssignmentService()
