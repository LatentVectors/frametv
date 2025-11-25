"""
GalleryImageTag junction model for many-to-many relationship between GalleryImages and Tags.
"""

from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


class GalleryImageTag(SQLModel, table=True):
    """Junction model linking gallery images to tags."""

    __tablename__ = "gallery_image_tags"
    __table_args__ = (
        UniqueConstraint("gallery_image_id", "tag_id", name="unique_gallery_image_tag"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    gallery_image_id: int = Field(foreign_key="gallery_images.id", index=True)
    tag_id: int = Field(foreign_key="tags.id", index=True)

