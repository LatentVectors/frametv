"""
Repository for GalleryImage operations.
"""

from typing import List, Optional
from sqlmodel import Session, select
from models import GalleryImage, ImageSlot
from .base import Repository


class GalleryImageRepository(Repository[GalleryImage]):
    """Repository for GalleryImage CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository."""
        super().__init__(GalleryImage, session)

    def get_by_filepath(self, filepath: str) -> Optional[GalleryImage]:
        """Get gallery image by filepath."""
        statement = select(GalleryImage).where(GalleryImage.filepath == filepath)
        return self.session.exec(statement).first()

    def get_with_slots(self, id: int) -> Optional[GalleryImage]:
        """Get gallery image with its slots."""
        image = self.get(id)
        if image:
            # Load slots
            statement = select(ImageSlot).where(ImageSlot.gallery_image_id == id)
            slots = list(self.session.exec(statement).all())
            # Attach slots to image (not a real relationship, but useful)
            image.slots = slots  # type: ignore
        return image

    def get_slots(self, gallery_image_id: int) -> List[ImageSlot]:
        """Get all slots for a gallery image."""
        statement = select(ImageSlot).where(ImageSlot.gallery_image_id == gallery_image_id)
        return list(self.session.exec(statement).all())

