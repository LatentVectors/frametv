"""
ImageSlot model for tracking slots within gallery images.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column, JSON
from sqlalchemy import JSON as SA_JSON

from .slot_transform import SlotTransform


class ImageSlot(SQLModel, table=True):
    """Model for image slots within gallery compositions."""

    __tablename__ = "image_slots"

    id: Optional[int] = Field(default=None, primary_key=True)
    gallery_image_id: int = Field(foreign_key="gallery_images.id", index=True)
    slot_number: int  # Slot position (0, 1, 2, etc.)
    source_image_id: Optional[int] = Field(default=None, foreign_key="source_images.id", index=True)
    transform_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(SA_JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    def get_transform(self) -> Optional[SlotTransform]:
        """Get transform_data as SlotTransform object."""
        if self.transform_data is None:
            return None
        return SlotTransform(**self.transform_data)

    def set_transform(self, transform: Optional[SlotTransform]) -> None:
        """Set transform_data from SlotTransform object."""
        if transform is None:
            self.transform_data = None
        else:
            self.transform_data = transform.model_dump()

