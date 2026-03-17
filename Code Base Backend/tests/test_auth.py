"""Tests for authentication routes."""

import pytest
from datetime import datetime, timedelta
from jose import jwt
from httpx import AsyncClient

from app.core.config import settings


class TestLogin:
    """POST /api/v1/auth/login"""

    async def test_login_success(self, client: AsyncClient, nurse_user):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "nurse@test.com", "password": "testpass123"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["token"]
        assert data["refreshToken"]
        assert data["user"]["name"] == "Test Nurse"
        assert data["user"]["role"] == "nurse"

    async def test_login_wrong_password(self, client: AsyncClient, nurse_user):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "nurse@test.com", "password": "wrongpassword"},
        )
        assert resp.status_code == 401

    async def test_login_nonexistent_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@test.com", "password": "testpass123"},
        )
        assert resp.status_code == 401

    async def test_login_inactive_user(self, client: AsyncClient, db_session, test_tenant, test_department):
        """Suspended users should get 403."""
        from app.models.user import User
        from tests.conftest import PASSWORD_HASH
        import uuid

        user = User(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            email="suspended@test.com",
            password_hash=PASSWORD_HASH,
            name="Suspended User",
            role="nurse",
            department_id=test_department.id,
            status="suspended",
        )
        db_session.add(user)
        await db_session.flush()

        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "suspended@test.com", "password": "testpass123"},
        )
        assert resp.status_code == 403


class TestAuthenticatedEndpoints:
    """Tests requiring a logged-in user."""

    async def test_get_me(self, client: AsyncClient, nurse_headers, nurse_user):
        resp = await client.get("/api/v1/auth/me", headers=nurse_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == "Test Nurse"
        assert data["role"] == "nurse"

    async def test_logout_invalidates_session(self, client: AsyncClient, nurse_headers):
        # Logout
        resp = await client.post("/api/v1/auth/logout", headers=nurse_headers)
        assert resp.status_code == 200

        # Same token should now be rejected
        resp = await client.get("/api/v1/auth/me", headers=nurse_headers)
        assert resp.status_code == 401

    async def test_refresh_token(self, client: AsyncClient, nurse_user):
        # Login to get refresh token
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "nurse@test.com", "password": "testpass123"},
        )
        refresh_token = login_resp.json()["data"]["refreshToken"]

        resp = await client.post(
            "/api/v1/auth/refresh-token",
            json={"refreshToken": refresh_token},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["token"]


class TestTokenSecurity:
    """Token validation edge cases."""

    async def test_expired_token_rejected(self, client: AsyncClient, nurse_user):
        """A token with exp in the past should be rejected."""
        payload = {
            "sub": str(nurse_user.id),
            "tenant_id": str(nurse_user.tenant_id),
            "role": nurse_user.role,
            "type": "access",
            "exp": datetime.utcnow() - timedelta(hours=1),
            "iat": datetime.utcnow() - timedelta(hours=2),
        }
        expired_token = jwt.encode(
            payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401

    async def test_role_enforcement(self, client: AsyncClient, nurse_headers):
        """Nurse should not be able to access admin-only endpoints."""
        resp = await client.post(
            "/api/v1/admin/staff",
            headers=nurse_headers,
            json={
                "email": "new@test.com",
                "password": "newpass123",
                "name": "New Staff",
                "role": "nurse",
            },
        )
        assert resp.status_code == 403
