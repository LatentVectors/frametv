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
    
    # TV metadata fields
    category_id: Optional[str] = Field(default=None)  # e.g., "MY-C0002"
    width: Optional[int] = Field(default=None)  # Image width in pixels
    height: Optional[int] = Field(default=None)  # Image height in pixels
    matte_id: Optional[str] = Field(default=None)  # Matte setting
    portrait_matte_id: Optional[str] = Field(default=None)  # Portrait matte setting
    image_date: Optional[str] = Field(default=None)  # Date from TV (e.g., "2025:11:18 20:46:08")
    content_type: Optional[str] = Field(default=None)  # e.g., "mobile"

