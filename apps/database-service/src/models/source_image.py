"""
SourceImage model for tracking source images from albums directory.
"""

from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class SourceImage(SQLModel, table=True):
    """Model for source images from albums directory."""

    __tablename__ = "source_images"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True)
    filepath: str = Field(index=True)  # Relative to data directory
    date_taken: Optional[datetime] = None  # Extracted from EXIF
    is_deleted: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

