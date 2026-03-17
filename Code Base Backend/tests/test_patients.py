"""Tests for patient routes."""

import uuid
import pytest
from httpx import AsyncClient


class TestPatientCRUD:
    """Patient CRUD operations."""

    async def test_create_patient(self, client: AsyncClient, nurse_headers, test_department):
        resp = await client.post(
            "/api/v1/patients",
            headers=nurse_headers,
            json={
                "name": "John Doe",
                "age": 35,
                "gender": "M",
                "complaint": "Fever and headache",
                "department_id": str(test_department.id),
                "auto_assign_bed": False,
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["name"] == "John Doe"
        assert data["patientId"]  # auto-generated ID

    async def test_create_patient_auto_assigns_doctor(
        self, client: AsyncClient, nurse_headers, test_department, doctor_user
    ):
        """Doctor should be auto-assigned based on complaint + specialization."""
        resp = await client.post(
            "/api/v1/patients",
            headers=nurse_headers,
            json={
                "name": "Cardiac Patient",
                "age": 60,
                "gender": "M",
                "complaint": "Chest pain and palpitations",
                "department_id": str(test_department.id),
                "auto_assign_bed": False,
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        # Should have an assigned doctor (the only doctor in the department)
        assert data.get("assignedDoctor") is not None or data.get("assigned_doctor_id") is not None

    async def test_get_patients_list(self, client: AsyncClient, nurse_headers, test_patient):
        resp = await client.get("/api/v1/patients?status=all", headers=nurse_headers)
        assert resp.status_code == 200
        patients = resp.json()["data"]["patients"]
        assert len(patients) >= 1

    async def test_get_patients_filtered_by_department(
        self, client: AsyncClient, nurse_headers, test_patient, test_department
    ):
        resp = await client.get(
            f"/api/v1/patients?status=all&department={test_department.name}",
            headers=nurse_headers,
        )
        assert resp.status_code == 200
        patients = resp.json()["data"]["patients"]
        assert len(patients) >= 1
        # All returned patients should be in the requested department
        for p in patients:
            assert p["department"] == test_department.name

    async def test_get_patient_by_id(self, client: AsyncClient, nurse_headers, test_patient):
        resp = await client.get(
            f"/api/v1/patients/{test_patient.id}",
            headers=nurse_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Test Patient"


class TestPatientTriage:
    """Triage and discharge flows."""

    async def test_discharge_patient(
        self, client: AsyncClient, doctor_headers, test_patient
    ):
        resp = await client.post(
            f"/api/v1/patients/{test_patient.id}/discharge",
            headers=doctor_headers,
            json={"notes": "Patient recovered", "follow_up_days": 7},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "discharged"


class TestTenantIsolation:
    """Multi-tenancy isolation."""

    async def test_patient_not_visible_across_tenants(
        self, client: AsyncClient, db_session, test_department
    ):
        """A patient in tenant A must not be visible to a user in tenant B."""
        from app.models.tenant import Tenant
        from app.models.department import Department
        from app.models.user import User
        from app.models.patient import Patient
        from tests.conftest import PASSWORD_HASH

        # Create tenant B
        tenant_b = Tenant(id=uuid.uuid4(), name="Other Hospital", code="OTHER")
        db_session.add(tenant_b)
        await db_session.flush()

        dept_b = Department(
            id=uuid.uuid4(), tenant_id=tenant_b.id, name="ED", code="ED", capacity=10
        )
        db_session.add(dept_b)
        await db_session.flush()

        user_b = User(
            id=uuid.uuid4(),
            tenant_id=tenant_b.id,
            email="nurse_b@test.com",
            password_hash=PASSWORD_HASH,
            name="Nurse B",
            role="nurse",
            department_id=dept_b.id,
            status="active",
        )
        db_session.add(user_b)

        # Create patient in tenant A (uses test_department from fixtures)
        patient_a = Patient(
            id=uuid.uuid4(),
            tenant_id=test_department.tenant_id,
            patient_id="PT-ISO-001",
            name="Tenant A Patient",
            age=30,
            gender="F",
            complaint="Test",
            department_id=test_department.id,
            status="active",
        )
        db_session.add(patient_a)
        await db_session.flush()

        # Login as tenant B user
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "nurse_b@test.com", "password": "testpass123"},
        )
        headers_b = {"Authorization": f"Bearer {login_resp.json()['data']['token']}"}

        # Tenant B should not see tenant A's patient
        resp = await client.get("/api/v1/patients?status=all", headers=headers_b)
        assert resp.status_code == 200
        patient_ids = [p["id"] for p in resp.json()["data"]["patients"]]
        assert str(patient_a.id) not in patient_ids
