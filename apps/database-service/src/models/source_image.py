"""
SourceImage model for tracking source images from albums directory.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON as SA_JSON

from .exif_metadata import EXIFMetadata


class SourceImage(SQLModel, table=True):
    """Model for source images from albums directory."""

    __tablename__ = "source_images"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True)
    filepath: str = Field(index=True)  # Relative to data directory
    date_taken: Optional[datetime] = None  # Extracted from EXIF
    is_deleted: bool = Field(default=False, index=True)
    usage_count: int = Field(default=0, index=True)  # Track how many ImageSlots reference this image
    exif_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(SA_JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    @property
    def is_used(self) -> bool:
        """Computed property: True if this image is used in any GalleryImage."""
        return self.usage_count > 0

    def get_exif_metadata(self) -> Optional[EXIFMetadata]:
        """Get exif_metadata as EXIFMetadata object."""
        if self.exif_metadata is None:
            return None
        return EXIFMetadata(**self.exif_metadata)

    def set_exif_metadata(self, metadata: Optional[EXIFMetadata]) -> None:
        """Set exif_metadata from EXIFMetadata object."""
        if metadata is None:
            self.exif_metadata = None
        else:
            self.exif_metadata = metadata.model_dump(exclude_none=True)

