"""
Repository for SourceImageTag operations.
"""

from typing import List, Optional
from sqlmodel import Session, select
from models import SourceImageTag, Tag
from .base import Repository


class SourceImageTagRepository(Repository[SourceImageTag]):
    """Repository for SourceImageTag CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository."""
        super().__init__(SourceImageTag, session)

    def get_tags_for_source_image(self, source_image_id: int) -> List[Tag]:
        """Get all tags for a source image."""
        statement = (
            select(Tag)
            .join(SourceImageTag)
            .where(SourceImageTag.source_image_id == source_image_id)
        )
        return list(self.session.exec(statement).all())

    def get_source_image_ids_with_tag(self, tag_id: int) -> List[int]:
        """Get all source image IDs that have a specific tag."""
        statement = (
            select(SourceImageTag.source_image_id)
            .where(SourceImageTag.tag_id == tag_id)
        )
        return list(self.session.exec(statement).all())

    def get_source_image_ids_with_all_tags(self, tag_ids: List[int]) -> List[int]:
        """Get source image IDs that have ALL specified tags (AND logic)."""
        if not tag_ids:
            return []
        
        # Get source images that have each tag
        # Start with images that have the first tag
        statement = (
            select(SourceImageTag.source_image_id)
            .where(SourceImageTag.tag_id == tag_ids[0])
        )
        result_ids = set(self.session.exec(statement).all())
        
        # Intersect with images that have each subsequent tag
        for tag_id in tag_ids[1:]:
            statement = (
                select(SourceImageTag.source_image_id)
                .where(SourceImageTag.tag_id == tag_id)
            )
            tag_ids_set = set(self.session.exec(statement).all())
            result_ids &= tag_ids_set
        
        return list(result_ids)

    def add_tag_to_source_image(self, source_image_id: int, tag_id: int) -> SourceImageTag:
        """Add a tag to a source image. Returns existing if already exists."""
        # Check if already exists
        statement = (
            select(SourceImageTag)
            .where(SourceImageTag.source_image_id == source_image_id)
            .where(SourceImageTag.tag_id == tag_id)
        )
        existing = self.session.exec(statement).first()
        if existing:
            return existing
        
        # Create new association
        association = SourceImageTag(
            source_image_id=source_image_id,
            tag_id=tag_id
        )
        return self.create(association)

    def remove_tag_from_source_image(self, source_image_id: int, tag_id: int) -> bool:
        """Remove a tag from a source image. Returns True if removed, False if not found."""
        statement = (
            select(SourceImageTag)
            .where(SourceImageTag.source_image_id == source_image_id)
            .where(SourceImageTag.tag_id == tag_id)
        )
        association = self.session.exec(statement).first()
        if association:
            self.session.delete(association)
            self.session.commit()
            return True
        return False

    def remove_all_tags_from_source_image(self, source_image_id: int) -> int:
        """Remove all tags from a source image. Returns count of removed tags."""
        statement = (
            select(SourceImageTag)
            .where(SourceImageTag.source_image_id == source_image_id)
        )
        associations = list(self.session.exec(statement).all())
        count = len(associations)
        for assoc in associations:
            self.session.delete(assoc)
        self.session.commit()
        return count

