from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.security import decode_token
from app.models.user import User

# HTTP Bearer security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials

    # Decode token
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Fetch user from database
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )

    result = await db.execute(
        select(User).where(
            User.id == user_uuid,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    return current_user


def require_roles(*allowed_roles: str):
    """Dependency factory to require specific roles."""
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# Pre-defined role dependencies
require_admin = require_roles("admin")
require_doctor = require_roles("doctor")
require_nurse_or_doctor = require_roles("nurse", "doctor")
require_doctor_or_admin = require_roles("doctor", "admin")
require_any_staff = require_roles("nurse", "doctor", "admin", "technician", "receptionist")


class TenantContext:
    """Tenant context for multi-tenancy."""

    def __init__(self, tenant_id: UUID):
        self.tenant_id = tenant_id


async def get_tenant_context(
    current_user: User = Depends(get_current_user)
) -> TenantContext:
    """Get tenant context from current user."""
    return TenantContext(tenant_id=current_user.tenant_id)


# Pagination dependency
class PaginationParams:
    """Pagination parameters dependency."""

    def __init__(
        self,
        page: int = 1,
        limit: int = 20
    ):
        self.page = max(1, page)
        self.limit = min(100, max(1, limit))

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit
