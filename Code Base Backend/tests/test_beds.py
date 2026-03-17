"""Tests for bed management routes."""

import pytest
from httpx import AsyncClient


class TestBedOperations:
    """Bed CRUD and assignment."""

    async def test_get_beds(self, client: AsyncClient, nurse_headers, test_bed):
        resp = await client.get("/api/v1/beds", headers=nurse_headers)
        assert resp.status_code == 200
        beds = resp.json()["data"]["beds"]
        assert len(beds) >= 1

    async def test_assign_bed(
        self, client: AsyncClient, nurse_headers, test_bed, test_patient
    ):
        resp = await client.post(
            f"/api/v1/beds/{test_bed.id}/assign",
            headers=nurse_headers,
            json={"patient_id": str(test_patient.id)},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["bedNumber"] == test_bed.bed_number

    async def test_assign_occupied_bed_fails(
        self, client: AsyncClient, nurse_headers, test_bed, test_patient, db_session
    ):
        """Assigning an already-occupied bed should fail."""
        # First, occupy the bed
        test_bed.status = "occupied"
        await db_session.flush()

        resp = await client.post(
            f"/api/v1/beds/{test_bed.id}/assign",
            headers=nurse_headers,
            json={"patient_id": str(test_patient.id)},
        )
        assert resp.status_code == 400

    async def test_release_bed(
        self, client: AsyncClient, nurse_headers, test_bed, test_patient, db_session
    ):
        """Releasing a bed should set it back to available."""
        # Occupy the bed first
        test_bed.status = "occupied"
        test_bed.current_patient_id = test_patient.id
        test_patient.bed_id = test_bed.id
        await db_session.flush()

        resp = await client.post(
            f"/api/v1/beds/{test_bed.id}/release",
            headers=nurse_headers,
        )
        assert resp.status_code == 200
