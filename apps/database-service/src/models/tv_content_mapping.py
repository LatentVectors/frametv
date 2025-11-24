"""
TVContentMapping model for bidirectional mapping between gallery images and TV content IDs.
"""

from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class TVContentMapping(SQLModel, table=True):
    """Model for mapping gallery images to TV content IDs."""

    __tablename__ = "tv_content_mappings"

    id: Optional[int] = Field(default=None, primary_key=True)
    gallery_image_id: Optional[int] = Field(default=None, foreign_key="gallery_images.id", index=True)
    tv_content_id: str = Field(unique=True, index=True)  # TV-assigned content ID
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    last_verified_at: Optional[datetime] = None
    sync_status: str = Field(default="pending", index=True)  # "synced", "pending", "failed", "manual"

