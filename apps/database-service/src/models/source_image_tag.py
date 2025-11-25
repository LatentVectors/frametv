"""
SourceImageTag junction model for many-to-many relationship between SourceImages and Tags.
"""

from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


class SourceImageTag(SQLModel, table=True):
    """Junction model linking source images to tags."""

    __tablename__ = "source_image_tags"
    __table_args__ = (
        UniqueConstraint("source_image_id", "tag_id", name="unique_source_image_tag"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    source_image_id: int = Field(foreign_key="source_images.id", index=True)
    tag_id: int = Field(foreign_key="tags.id", index=True)

