"""Tests for platform admin routes — hospital/plan/team management."""

import pytest
import uuid
from httpx import AsyncClient


class TestPlatformDashboard:
    """GET /api/v1/platform/dashboard"""

    async def test_dashboard_as_platform_admin(self, client: AsyncClient, platform_headers):
        resp = await client.get("/api/v1/platform/dashboard", headers=platform_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "total_hospitals" in data
        assert "total_users" in data
        assert "total_beds" in data
        assert "hospitals_by_plan" in data
        assert "recent_signups" in data

    async def test_dashboard_forbidden_for_hospital_admin(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/platform/dashboard", headers=admin_headers)
        assert resp.status_code == 403

    async def test_dashboard_forbidden_for_nurse(self, client: AsyncClient, nurse_headers):
        resp = await client.get("/api/v1/platform/dashboard", headers=nurse_headers)
        assert resp.status_code == 403

    async def test_dashboard_unauthorized_no_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/platform/dashboard")
        assert resp.status_code in (401, 403)


class TestHospitalManagement:
    """CRUD /api/v1/platform/hospitals"""

    async def test_create_hospital(self, client: AsyncClient, platform_headers, test_plan):
        resp = await client.post(
            "/api/v1/platform/hospitals",
            headers=platform_headers,
            json={
                "name": "New Hospital",
                "code": "NH001",
                "address": "123 Test St",
                "phone": "+91-9876543210",
                "email": "admin@newhospital.com",
                "plan_id": str(test_plan.id),
                "initial_admin": {
                    "name": "Hospital Admin",
                    "email": "admin@newhospital.com",
                    "password": "Admin@12345",
                },
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["tenant_name"] == "New Hospital"
        assert data["tenant_code"] == "NH001"
        assert data["departments_created"] > 0
        assert data["beds_created"] > 0

    async def test_create_hospital_duplicate_code(self, client: AsyncClient, platform_headers, test_plan, test_tenant):
        resp = await client.post(
            "/api/v1/platform/hospitals",
            headers=platform_headers,
            json={
                "name": "Duplicate",
                "code": "TEST",  # already exists from test_tenant fixture
                "plan_id": str(test_plan.id),
                "initial_admin": {
                    "name": "Admin",
                    "email": "dup@test.com",
                    "password": "Admin@12345",
                },
            },
        )
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"]

    async def test_create_hospital_invalid_plan(self, client: AsyncClient, platform_headers):
        resp = await client.post(
            "/api/v1/platform/hospitals",
            headers=platform_headers,
            json={
                "name": "Bad Plan Hospital",
                "code": "BP001",
                "plan_id": str(uuid.uuid4()),
                "initial_admin": {
                    "name": "Admin",
                    "email": "badplan@test.com",
                    "password": "Admin@12345",
                },
            },
        )
        assert resp.status_code == 400

    async def test_list_hospitals(self, client: AsyncClient, platform_headers, test_tenant):
        resp = await client.get("/api/v1/platform/hospitals", headers=platform_headers)
        assert resp.status_code == 200
        hospitals = resp.json()["data"]
        assert isinstance(hospitals, list)

    async def test_get_hospital_detail(self, client: AsyncClient, platform_headers, test_tenant):
        resp = await client.get(f"/api/v1/platform/hospitals/{test_tenant.id}", headers=platform_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == "Test Hospital"

    async def test_get_hospital_not_found(self, client: AsyncClient, platform_headers):
        resp = await client.get(f"/api/v1/platform/hospitals/{uuid.uuid4()}", headers=platform_headers)
        assert resp.status_code == 404

    async def test_suspend_hospital(self, client: AsyncClient, platform_headers, test_tenant):
        resp = await client.patch(
            f"/api/v1/platform/hospitals/{test_tenant.id}/status",
            headers=platform_headers,
            json={"status": "suspended"},
        )
        assert resp.status_code == 200

    async def test_reactivate_hospital(self, client: AsyncClient, platform_headers, test_tenant):
        resp = await client.patch(
            f"/api/v1/platform/hospitals/{test_tenant.id}/status",
            headers=platform_headers,
            json={"status": "active"},
        )
        assert resp.status_code == 200

    async def test_delete_hospital(self, client: AsyncClient, platform_headers, test_tenant):
        resp = await client.delete(f"/api/v1/platform/hospitals/{test_tenant.id}", headers=platform_headers)
        assert resp.status_code == 200

    async def test_hospital_crud_forbidden_for_regular_admin(self, client: AsyncClient, admin_headers, test_plan):
        resp = await client.post(
            "/api/v1/platform/hospitals",
            headers=admin_headers,
            json={
                "name": "X", "code": "X001",
                "plan_id": str(test_plan.id),
                "initial_admin": {"name": "A", "email": "a@t.com", "password": "Admin@12345"},
            },
        )
        assert resp.status_code == 403


class TestPlanManagement:
    """CRUD /api/v1/platform/plans"""

    async def test_list_plans(self, client: AsyncClient, platform_headers, test_plan):
        resp = await client.get("/api/v1/platform/plans", headers=platform_headers)
        assert resp.status_code == 200
        plans = resp.json()["data"]
        assert isinstance(plans, list)
        assert any(p["code"] == "test-starter" for p in plans)

    async def test_create_plan(self, client: AsyncClient, platform_headers):
        resp = await client.post(
            "/api/v1/platform/plans",
            headers=platform_headers,
            json={
                "name": "New Plan",
                "code": "new-plan",
                "base_price": 5000,
                "max_users": 10,
                "max_beds": 20,
                "max_departments": 3,
                "included_users": 5,
                "included_beds": 10,
                "price_per_extra_user": 100,
                "price_per_extra_bed": 200,
            },
        )
        assert resp.status_code == 201

    async def test_create_plan_duplicate_code(self, client: AsyncClient, platform_headers, test_plan):
        resp = await client.post(
            "/api/v1/platform/plans",
            headers=platform_headers,
            json={
                "name": "Duplicate Plan",
                "code": "test-starter",  # exists
                "base_price": 1000,
            },
        )
        assert resp.status_code == 400

    async def test_update_plan(self, client: AsyncClient, platform_headers, test_plan):
        resp = await client.put(
            f"/api/v1/platform/plans/{test_plan.id}",
            headers=platform_headers,
            json={"description": "Updated description"},
        )
        assert resp.status_code == 200

    async def test_deactivate_plan(self, client: AsyncClient, platform_headers, test_plan):
        resp = await client.delete(f"/api/v1/platform/plans/{test_plan.id}", headers=platform_headers)
        assert resp.status_code == 200


class TestPlatformTeam:
    """CRUD /api/v1/platform/team"""

    async def test_list_team(self, client: AsyncClient, platform_headers, platform_admin_user):
        resp = await client.get("/api/v1/platform/team", headers=platform_headers)
        assert resp.status_code == 200
        team = resp.json()["data"]
        assert any(m["email"] == "platform@test.com" for m in team)

    async def test_invite_team_member(self, client: AsyncClient, platform_headers):
        resp = await client.post(
            "/api/v1/platform/team",
            headers=platform_headers,
            params={"name": "New Admin", "email": "newadmin@test.com", "password": "NewAdmin@123"},
        )
        assert resp.status_code == 201

    async def test_invite_duplicate_email(self, client: AsyncClient, platform_headers, platform_admin_user):
        resp = await client.post(
            "/api/v1/platform/team",
            headers=platform_headers,
            params={"name": "Dup", "email": "platform@test.com", "password": "Dup@12345"},
        )
        assert resp.status_code == 400

    async def test_cannot_remove_self(self, client: AsyncClient, platform_headers, platform_admin_user):
        resp = await client.delete(
            f"/api/v1/platform/team/{platform_admin_user.id}",
            headers=platform_headers,
        )
        assert resp.status_code == 400
