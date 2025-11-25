"""
Pydantic model for source image metadata snapshot stored in ImageSlot.
"""

from datetime import datetime
from pydantic import BaseModel

from .exif_metadata import EXIFMetadata


class MetadataSnapshot(BaseModel):
    """Type-safe Pydantic model for source image metadata snapshot stored in ImageSlot."""

    # Source image basic info
    filename: str
    filepath: str
    date_taken: datetime | None = None

    # EXIF metadata (nested Pydantic model)
    exif_metadata: EXIFMetadata | None = None

