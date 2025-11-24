"""
Repository for TVContentMapping operations.
"""

from typing import List, Optional
from sqlmodel import Session, select
from models import TVContentMapping
from .base import Repository


class TVContentRepository(Repository[TVContentMapping]):
    """Repository for TVContentMapping CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository."""
        super().__init__(TVContentMapping, session)

    def get_by_tv_content_id(self, tv_content_id: str) -> Optional[TVContentMapping]:
        """Get mapping by TV content ID."""
        statement = select(TVContentMapping).where(
            TVContentMapping.tv_content_id == tv_content_id
        )
        return self.session.exec(statement).first()

    def get_by_gallery_image_id(self, gallery_image_id: int) -> Optional[TVContentMapping]:
        """Get mapping by gallery image ID."""
        statement = select(TVContentMapping).where(
            TVContentMapping.gallery_image_id == gallery_image_id
        )
        return self.session.exec(statement).first()

    def get_all_by_gallery_image_ids(
        self, gallery_image_ids: List[int]
    ) -> List[TVContentMapping]:
        """Get all mappings for given gallery image IDs."""
        statement = select(TVContentMapping).where(
            TVContentMapping.gallery_image_id.in_(gallery_image_ids)  # type: ignore
        )
        return list(self.session.exec(statement).all())

    def get_all_app_managed(self) -> List[TVContentMapping]:
        """Get all app-managed mappings (gallery_image_id is not null)."""
        statement = select(TVContentMapping).where(
            TVContentMapping.gallery_image_id.isnot(None)  # type: ignore
        )
        return list(self.session.exec(statement).all())

    def get_all_manual(self) -> List[TVContentMapping]:
        """Get all manually uploaded mappings (gallery_image_id is null)."""
        statement = select(TVContentMapping).where(
            TVContentMapping.gallery_image_id.is_(None)  # type: ignore
        )
        return list(self.session.exec(statement).all())

    def delete_by_tv_content_id(self, tv_content_id: str) -> bool:
        """Delete mapping by TV content ID."""
        mapping = self.get_by_tv_content_id(tv_content_id)
        if mapping:
            self.session.delete(mapping)
            self.session.commit()
            return True
        return False

