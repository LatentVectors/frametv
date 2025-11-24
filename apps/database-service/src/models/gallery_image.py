"""
GalleryImage model for tracking saved gallery compositions.
"""

from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class GalleryImage(SQLModel, table=True):
    """Model for gallery images (saved compositions)."""

    __tablename__ = "gallery_images"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True)
    filepath: str = Field(index=True)  # Relative to data directory
    template_id: str  # Reference to template/layout identifier
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

