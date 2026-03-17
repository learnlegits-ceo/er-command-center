"""Tests for vitals routes and critical detection."""

import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock

from app.api.routes.vitals import check_critical_vitals


class TestRecordVitals:
    """POST /api/v1/vitals/{patient_id}"""

    async def test_record_vitals(self, client: AsyncClient, nurse_headers, test_patient):
        resp = await client.post(
            f"/api/v1/vitals/{test_patient.id}",
            headers=nurse_headers,
            json={"hr": 80, "bp": "120/80", "spo2": 98, "temp": 98.6},
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["vitals"]["hr"] == 80

    async def test_critical_vitals_generates_alert(
        self, client: AsyncClient, nurse_headers, test_patient
    ):
        """Recording critical SpO2 should generate an alert."""
        resp = await client.post(
            f"/api/v1/vitals/{test_patient.id}",
            headers=nurse_headers,
            json={"hr": 80, "bp": "120/80", "spo2": 85, "temp": 98.6},
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        # Should flag as critical
        alerts = data.get("alerts", [])
        assert any(a.get("type") == "spo2" for a in alerts)


class TestCheckCriticalVitalsUnit:
    """Pure unit tests for check_critical_vitals()."""

    def _make_vitals(self, **kwargs):
        """Create a mock PatientVitals with given fields."""
        v = MagicMock()
        v.heart_rate = kwargs.get("heart_rate")
        v.spo2 = kwargs.get("spo2")
        v.blood_pressure_systolic = kwargs.get("bp_sys")
        v.blood_pressure_diastolic = kwargs.get("bp_dia")
        v.temperature = kwargs.get("temperature")
        return v

    def test_normal_vitals_no_alerts(self):
        v = self._make_vitals(heart_rate=80, spo2=98, bp_sys=120, bp_dia=80, temperature=98.6)
        alerts = check_critical_vitals(v)
        assert len(alerts) == 0

    def test_critical_spo2(self):
        v = self._make_vitals(heart_rate=80, spo2=85, bp_sys=120, bp_dia=80, temperature=98.6)
        alerts = check_critical_vitals(v)
        spo2_alerts = [a for a in alerts if a["type"] == "spo2"]
        assert len(spo2_alerts) == 1
        assert spo2_alerts[0]["severity"] == "critical"

    def test_critical_heart_rate(self):
        v = self._make_vitals(heart_rate=160, spo2=98, bp_sys=120, bp_dia=80, temperature=98.6)
        alerts = check_critical_vitals(v)
        hr_alerts = [a for a in alerts if a["type"] == "hr"]
        assert len(hr_alerts) == 1
        assert hr_alerts[0]["severity"] == "critical"

    def test_critical_temperature(self):
        v = self._make_vitals(heart_rate=80, spo2=98, bp_sys=120, bp_dia=80, temperature=106)
        alerts = check_critical_vitals(v)
        temp_alerts = [a for a in alerts if a["type"] == "temp"]
        assert len(temp_alerts) == 1
        assert temp_alerts[0]["severity"] == "critical"
