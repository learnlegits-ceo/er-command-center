"""Audit log helper — write actions to the audit_logs table.

The audit row is written in its own AsyncSession with its own commit, fully
independent of the caller's transaction. This makes audit logging:

  - **Atomic in isolation** — the audit INSERT either succeeds and is committed,
    or fails loudly. It cannot be silently dropped by an unrelated transaction
    error in the caller's request.
  - **Non-blocking on failure** — if the audit INSERT fails for any reason
    (FK, NOT NULL, type, connection), the exception is caught and printed to
    stderr (which Lambda forwards to CloudWatch). The caller is never affected.
  - **Independent of the caller's commit timing** — earlier implementations
    relied on the caller's commit to flush the audit row, which made it
    vulnerable to session-state issues, savepoint semantics, and chained
    commits in the same request. Each audit write now stands on its own.

Trade-off: a separate connection per audit call (the engine uses NullPool, so
each session gets a fresh connection). Audit volume is low (one row per
action), so this is acceptable for the reliability win.
"""
from __future__ import annotations

import json
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Optional, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_maker
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


def _jsonable(value: Any) -> Any:
    """Coerce a dict's UUID/datetime values to JSON-safe primitives.

    JSONB columns accept Python primitives + dicts/lists. UUIDs and datetimes
    raise TypeError on commit, which the broad except below would swallow,
    silently dropping audit entries. This helper makes the row safe to insert.
    """
    if value is None:
        return None
    try:
        return json.loads(json.dumps(value, default=str))
    except (TypeError, ValueError):
        return None


async def log_action(
    db: AsyncSession,  # kept for API compatibility; the audit write uses its own session
    user: Optional[User],
    action: str,
    entity_type: str,
    entity_id: Optional[Any] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Insert an audit log row in its own session/transaction. Never raises.

    The `db` parameter is intentionally unused — kept for backward compatibility
    with existing call sites. The audit row is written via a fresh
    AsyncSession, so it is fully independent of the caller's transaction:
    a failed audit write cannot poison the caller's commit, and a failed
    caller commit cannot orphan or lose the audit row.
    """
    if not action or not entity_type:
        return

    # Snapshot the user's identity NOW. We pass primitives (not the User
    # instance) into the new session to avoid cross-session ORM issues.
    tenant_id = user.tenant_id if user else None
    user_id = user.id if user else None

    audit_row_kwargs = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "action": action[:100],
        "entity_type": entity_type[:50],
        "entity_id": _coerce_uuid(entity_id),
        "old_values": _jsonable(old_values),
        "new_values": _jsonable(new_values),
        "ip_address": ip_address,
        "user_agent": user_agent,
        # Set created_at explicitly so we never depend on the server_default
        # (which is stored as a string literal in the model and may not
        # evaluate as a SQL function on all migrations of the schema).
        "created_at": datetime.now(timezone.utc),
    }

    try:
        async with async_session_maker() as audit_session:
            audit_session.add(AuditLog(**audit_row_kwargs))
            await audit_session.commit()
    except Exception as exc:
        # Audit failures must not break the user request. Print the traceback
        # so CloudWatch captures the underlying error (logger.warning alone
        # is easy to miss in Lambda log groups).
        print(f"[audit] log_action failed: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        logger.warning("audit log_action failed: %s", exc)
