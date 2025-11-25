"""
Repository for GalleryImageTag operations.
"""

from typing import List, Optional
from sqlmodel import Session, select
from models import GalleryImageTag, Tag
from .base import Repository


class GalleryImageTagRepository(Repository[GalleryImageTag]):
    """Repository for GalleryImageTag CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository."""
        super().__init__(GalleryImageTag, session)

    def get_tags_for_gallery_image(self, gallery_image_id: int) -> List[Tag]:
        """Get all tags for a gallery image."""
        statement = (
            select(Tag)
            .join(GalleryImageTag)
            .where(GalleryImageTag.gallery_image_id == gallery_image_id)
        )
        return list(self.session.exec(statement).all())

    def get_gallery_image_ids_with_tag(self, tag_id: int) -> List[int]:
        """Get all gallery image IDs that have a specific tag."""
        statement = (
            select(GalleryImageTag.gallery_image_id)
            .where(GalleryImageTag.tag_id == tag_id)
        )
        return list(self.session.exec(statement).all())

    def get_gallery_image_ids_with_all_tags(self, tag_ids: List[int]) -> List[int]:
        """Get gallery image IDs that have ALL specified tags (AND logic)."""
        if not tag_ids:
            return []
        
        # Get gallery images that have each tag
        # Start with images that have the first tag
        statement = (
            select(GalleryImageTag.gallery_image_id)
            .where(GalleryImageTag.tag_id == tag_ids[0])
        )
        result_ids = set(self.session.exec(statement).all())
        
        # Intersect with images that have each subsequent tag
        for tag_id in tag_ids[1:]:
            statement = (
                select(GalleryImageTag.gallery_image_id)
                .where(GalleryImageTag.tag_id == tag_id)
            )
            tag_ids_set = set(self.session.exec(statement).all())
            result_ids &= tag_ids_set
        
        return list(result_ids)

    def add_tag_to_gallery_image(self, gallery_image_id: int, tag_id: int) -> GalleryImageTag:
        """Add a tag to a gallery image. Returns existing if already exists."""
        # Check if already exists
        statement = (
            select(GalleryImageTag)
            .where(GalleryImageTag.gallery_image_id == gallery_image_id)
            .where(GalleryImageTag.tag_id == tag_id)
        )
        existing = self.session.exec(statement).first()
        if existing:
            return existing
        
        # Create new association
        association = GalleryImageTag(
            gallery_image_id=gallery_image_id,
            tag_id=tag_id
        )
        return self.create(association)

    def remove_tag_from_gallery_image(self, gallery_image_id: int, tag_id: int) -> bool:
        """Remove a tag from a gallery image. Returns True if removed, False if not found."""
        statement = (
            select(GalleryImageTag)
            .where(GalleryImageTag.gallery_image_id == gallery_image_id)
            .where(GalleryImageTag.tag_id == tag_id)
        )
        association = self.session.exec(statement).first()
        if association:
            self.session.delete(association)
            self.session.commit()
            return True
        return False

    def remove_all_tags_from_gallery_image(self, gallery_image_id: int) -> int:
        """Remove all tags from a gallery image. Returns count of removed tags."""
        statement = (
            select(GalleryImageTag)
            .where(GalleryImageTag.gallery_image_id == gallery_image_id)
        )
        associations = list(self.session.exec(statement).all())
        count = len(associations)
        for assoc in associations:
            self.session.delete(assoc)
        self.session.commit()
        return count

