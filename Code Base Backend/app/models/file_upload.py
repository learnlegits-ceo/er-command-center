from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.db.database import Base
from .base import SoftDeleteMixin


class FileUpload(Base, SoftDeleteMixin):
    """File upload record."""
    __tablename__ = "file_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    file_type = Column(String(20), nullable=False)  # avatar, patient_photo, document, vitals_image, other
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_url = Column(Text)
    mime_type = Column(String(100))
    file_size = Column(Integer)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(String, server_default="now()")
