"""
Repository for SourceImage operations.
"""

from typing import List, Optional
from sqlmodel import Session, select
from models import SourceImage
from .base import Repository


class SourceImageRepository(Repository[SourceImage]):
    """Repository for SourceImage CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository."""
        super().__init__(SourceImage, session)

    def get_by_filepath(self, filepath: str) -> Optional[SourceImage]:
        """Get source image by filepath."""
        statement = select(SourceImage).where(SourceImage.filepath == filepath)
        return self.session.exec(statement).first()

    def get_all_not_deleted(self, skip: int = 0, limit: int = 100) -> List[SourceImage]:
        """Get all non-deleted source images."""
        statement = (
            select(SourceImage)
            .where(SourceImage.is_deleted == False)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def mark_deleted(self, filepath: str) -> bool:
        """Mark source image as deleted."""
        image = self.get_by_filepath(filepath)
        if image:
            image.is_deleted = True
            self.session.add(image)
            self.session.commit()
            return True
        return False

