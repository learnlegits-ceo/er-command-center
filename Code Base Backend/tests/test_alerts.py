"""Tests for alert routes."""

import uuid
import pytest
from httpx import AsyncClient


class TestAlertOperations:
    """Alert CRUD and lifecycle."""

    async def _create_alert(self, db_session, tenant_id, patient_id=None):
        """Helper to create a test alert directly in DB."""
        from app.models.alert import Alert

        alert = Alert(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            title="Test Alert",
            message="Test alert message",
            priority="high",
            category="Test",
            status="unread",
            for_roles=["nurse", "doctor"],
            patient_id=patient_id,
        )
        db_session.add(alert)
        await db_session.flush()
        return alert

    async def test_get_alerts(
        self, client: AsyncClient, nurse_headers, db_session, test_tenant
    ):
        alert = await self._create_alert(db_session, test_tenant.id)
        resp = await client.get("/api/v1/alerts", headers=nurse_headers)
        assert resp.status_code == 200
        alerts = resp.json()["data"]["alerts"]
        assert len(alerts) >= 1

    async def test_acknowledge_alert(
        self, client: AsyncClient, nurse_headers, db_session, test_tenant
    ):
        alert = await self._create_alert(db_session, test_tenant.id)
        resp = await client.post(
            f"/api/v1/alerts/{alert.id}/acknowledge",
            headers=nurse_headers,
            json={"notes": "Acknowledged"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "acknowledged"

    async def test_resolve_alert(
        self, client: AsyncClient, doctor_headers, db_session, test_tenant
    ):
        alert = await self._create_alert(db_session, test_tenant.id)
        resp = await client.post(
            f"/api/v1/alerts/{alert.id}/resolve",
            headers=doctor_headers,
            json={"notes": "Issue resolved"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "resolved"
