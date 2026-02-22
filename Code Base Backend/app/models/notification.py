from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.db.database import Base


class Notification(Base):
    """Notification (SMS/Push via AWS SQS)."""
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Notification details
    type = Column(String(30), nullable=False)  # push, email, sms, in_app
    channel = Column(String(30))
    title = Column(String(255), nullable=False)
    body = Column(Text)
    data = Column(JSONB)

    # Target
    recipient = Column(String(255))

    # SQS Integration
    sqs_message_id = Column(String(100))
    sqs_queue_url = Column(Text)

    # Status
    priority = Column(String(20), default="normal")
    status = Column(String(20), default="pending")  # pending, queued, sent, delivered, read, failed

    # Timestamps
    queued_at = Column(String)
    sent_at = Column(String)
    delivered_at = Column(String)
    read_at = Column(String)
    failed_at = Column(String)
    failure_reason = Column(Text)

    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    scheduled_for = Column(String)

    created_at = Column(String, server_default="now()")


class SQSMessage(Base):
    """AWS SQS message tracking."""
    __tablename__ = "sqs_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    queue_name = Column(String(100), nullable=False)
    message_id = Column(String(100))
    message_type = Column(String(50), nullable=False)
    payload = Column(JSONB, nullable=False)
    status = Column(String(20), default="pending")  # pending, sent, processing, completed, failed, dead_letter
    sent_at = Column(String)
    processed_at = Column(String)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(String, server_default="now()")
