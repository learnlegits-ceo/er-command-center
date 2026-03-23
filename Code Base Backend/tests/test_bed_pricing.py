"""Tests for bed pricing CRUD — hospital admin sets cost per bed type."""

import pytest
import uuid
from httpx import AsyncClient


VALID_BED_TYPES = ["icu", "general", "isolation", "pediatric", "maternity", "emergency", "daycare", "observation"]


class TestGetBedPricing:
    """GET /api/v1/admin/bed-pricing"""

    async def test_list_all_bed_types(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/admin/bed-pricing", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 8  # all 8 bed types listed
        types = {item["bed_type"] for item in data}
        assert types == set(VALID_BED_TYPES)

    async def test_all_not_set_initially(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/admin/bed-pricing", headers=admin_headers)
        data = resp.json()["data"]
        for item in data:
            assert item["status"] == "not_set"
            assert item["cost_per_day"] == 0

    async def test_forbidden_for_nurse(self, client: AsyncClient, nurse_headers):
        resp = await client.get("/api/v1/admin/bed-pricing", headers=nurse_headers)
        assert resp.status_code == 403

    async def test_forbidden_for_doctor(self, client: AsyncClient, doctor_headers):
        resp = await client.get("/api/v1/admin/bed-pricing", headers=doctor_headers)
        assert resp.status_code == 403


class TestSetBedPricing:
    """POST /api/v1/admin/bed-pricing (upsert)"""

    async def test_set_price_for_icu(self, client: AsyncClient, admin_headers):
        resp = await client.post(
            "/api/v1/admin/bed-pricing",
            headers=admin_headers,
            json={"bed_type": "icu", "cost_per_day": 5000},
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["id"]

    async def test_upsert_updates_existing(self, client: AsyncClient, admin_headers):
        # Set first time
        await client.post(
            "/api/v1/admin/bed-pricing",
            headers=admin_headers,
            json={"bed_type": "general", "cost_per_day": 1000},
        )
        # Upsert with new price
        resp = await client.post(
            "/api/v1/admin/bed-pricing",
            headers=admin_headers,
            json={"bed_type": "general", "cost_per_day": 1500},
        )
        assert resp.status_code == 201
        assert "updated" in resp.json()["message"].lower()

    async def test_invalid_bed_type(self, client: AsyncClient, admin_headers):
        resp = await client.post(
            "/api/v1/admin/bed-pricing",
            headers=admin_headers,
            json={"bed_type": "invalid_type", "cost_per_day": 1000},
        )
        assert resp.status_code == 400
        assert "Invalid bed type" in resp.json()["detail"]

    async def test_after_set_shows_configured(self, client: AsyncClient, admin_headers):
        await client.post(
            "/api/v1/admin/bed-pricing",
            headers=admin_headers,
            json={"bed_type": "daycare", "cost_per_day": 2000},
        )
        resp = await client.get("/api/v1/admin/bed-pricing", headers=admin_headers)
        daycare = next(item for item in resp.json()["data"] if item["bed_type"] == "daycare")
        assert daycare["status"] == "configured"
        assert daycare["cost_per_day"] == 2000


class TestUpdateBedPricing:
    """PUT /api/v1/admin/bed-pricing/{id}"""

    async def test_update_price(self, client: AsyncClient, admin_headers):
        # Create first
        create_resp = await client.post(
            "/api/v1/admin/bed-pricing",
            headers=admin_headers,
            json={"bed_type": "emergency", "cost_per_day": 3000},
        )
        pricing_id = create_resp.json()["data"]["id"]

        # Update
        resp = await client.put(
            f"/api/v1/admin/bed-pricing/{pricing_id}",
            headers=admin_headers,
            json={"cost_per_day": 3500},
        )
        assert resp.status_code == 200

    async def test_update_nonexistent(self, client: AsyncClient, admin_headers):
        resp = await client.put(
            f"/api/v1/admin/bed-pricing/{uuid.uuid4()}",
            headers=admin_headers,
            json={"cost_per_day": 999},
        )
        assert resp.status_code == 404


class TestDeleteBedPricing:
    """DELETE /api/v1/admin/bed-pricing/{id}"""

    async def test_delete_pricing(self, client: AsyncClient, admin_headers):
        create_resp = await client.post(
            "/api/v1/admin/bed-pricing",
            headers=admin_headers,
            json={"bed_type": "observation", "cost_per_day": 1200},
        )
        pricing_id = create_resp.json()["data"]["id"]

        resp = await client.delete(f"/api/v1/admin/bed-pricing/{pricing_id}", headers=admin_headers)
        assert resp.status_code == 200

    async def test_delete_nonexistent(self, client: AsyncClient, admin_headers):
        resp = await client.delete(f"/api/v1/admin/bed-pricing/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code == 404


class TestUsageStats:
    """GET /api/v1/admin/usage"""

    async def test_get_usage(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/admin/usage", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "active_users" in data
        assert "total_beds" in data
        assert "occupied_beds" in data
        assert "plan_limit" in data

    async def test_usage_forbidden_for_nurse(self, client: AsyncClient, nurse_headers):
        resp = await client.get("/api/v1/admin/usage", headers=nurse_headers)
        assert resp.status_code == 403

    async def test_usage_history_empty(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/admin/usage/history", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json()["data"], list)
