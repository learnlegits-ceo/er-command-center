"""Audit log helper — write actions to the audit_logs table.

Routes call `log_action()` after the action's primary write succeeds; this adds
a single AuditLog row to the session and never raises (failures are swallowed
and logged so audit issues can't break user-facing flows). The route's own
commit then persists the audit row along with the business change.
"""
from __future__ import annotations

import logging
from typing import Optional, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)


def _coerce_uuid(value: Any) -> Optional[UUID]:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, AttributeError):
        return None


async def log_action(
    db: AsyncSession,
    user: Optional[User],
    action: str,
    entity_type: str,
    entity_id: Optional[Any] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Add an audit log row to the session. Never raises — swallows failures.

    Notes:
        - This does NOT commit. The caller's commit persists the row alongside
          the actual write, keeping the action and its audit trail atomic.
        - The action string is free-form (e.g. "create", "update", "delete",
          "assign_bed"). Keep it short and verb-leading so the admin filter is
          useful.
    """
    try:
        if not action or not entity_type:
            return
        db.add(AuditLog(
            tenant_id=user.tenant_id if user else None,
            user_id=user.id if user else None,
            action=action[:100],
            entity_type=entity_type[:50],
            entity_id=_coerce_uuid(entity_id),
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
        ))
    except Exception as exc:
        # Audit failures must not break the user request
        logger.warning("audit log_action failed: %s", exc)
