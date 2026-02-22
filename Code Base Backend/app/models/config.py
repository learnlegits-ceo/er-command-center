from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.db.database import Base
from .base import TimestampMixin


class GroqConfiguration(Base, TimestampMixin):
    """Per-tenant Groq API configuration."""
    __tablename__ = "groq_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True)
    api_key_encrypted = Column(Text, nullable=False)
    default_model = Column(String(100), default="llama-3.3-70b-versatile")
    triage_model = Column(String(100), default="llama-3.3-70b-versatile")
    ocr_model = Column(String(100), default="llama-3.2-90b-vision-preview")
    max_tokens = Column(Integer, default=1024)
    temperature = Column(Numeric(3, 2), default=0.3)
    triage_prompt_template = Column(Text)
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(String)


class MCPConfiguration(Base, TimestampMixin):
    """MCP tool configuration (medication lookup)."""
    __tablename__ = "mcp_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    tool_name = Column(String(100), nullable=False)
    tool_type = Column(String(50), nullable=False)  # medication_lookup, drug_interaction, dosage_calculator, other
    endpoint_url = Column(Text)
    api_key_encrypted = Column(Text)
    config_params = Column(JSONB)
    is_active = Column(Boolean, default=True)


class FHIRSyncLog(Base):
    """FHIR integration sync log."""
    __tablename__ = "fhir_sync_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100))
    local_entity_type = Column(String(50))
    local_entity_id = Column(UUID(as_uuid=True))
    sync_direction = Column(String(20))  # inbound, outbound
    status = Column(String(20))  # success, failed, partial
    request_payload = Column(JSONB)
    response_payload = Column(JSONB)
    error_message = Column(Text)
    synced_at = Column(String, server_default="now()")


class DashboardStatsCache(Base):
    """Dashboard statistics cache."""
    __tablename__ = "dashboard_stats_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    stat_type = Column(String(50), nullable=False)
    stat_date = Column(Date, nullable=False)
    stats_data = Column(JSONB, nullable=False)
    generated_at = Column(String, server_default="now()")
    expires_at = Column(String)
