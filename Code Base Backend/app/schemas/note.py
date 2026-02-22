from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class NoteCreate(BaseModel):
    """Create note request."""
    type: str  # nurse, doctor, admin, system, discharge
    content: str
    is_confidential: bool = False


class NoteCreatedBy(BaseModel):
    """Note creator info."""
    id: UUID
    name: str
    role: str

    class Config:
        from_attributes = True


class NoteResponse(BaseModel):
    """Note response schema."""
    id: UUID
    type: str
    content: str
    is_confidential: bool = False
    created_at: Optional[datetime] = None
    created_by: Optional[NoteCreatedBy] = None

    class Config:
        from_attributes = True
