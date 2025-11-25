"""
Repository for SourceImage operations.
"""

import logging
from typing import List, Optional
from sqlmodel import Session, select, text
from models import SourceImage, ImageSlot
from .base import Repository

logger = logging.getLogger(__name__)


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

    def get_all_not_deleted_filtered(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        used: Optional[bool] = None,
        source_image_ids: Optional[List[int]] = None,
        filepath_prefix: Optional[str] = None,
        order_by: str = "date_taken",
        order_direction: str = "desc",
    ) -> List[SourceImage]:
        """Get all non-deleted source images with optional filtering and sorting."""
        statement = select(SourceImage).where(SourceImage.is_deleted == False)
        
        if used is not None:
            if used:
                statement = statement.where(SourceImage.usage_count > 0)
            else:
                statement = statement.where(SourceImage.usage_count == 0)
        
        if source_image_ids is not None:
            statement = statement.where(SourceImage.id.in_(source_image_ids))
        
        if filepath_prefix is not None:
            statement = statement.where(SourceImage.filepath.startswith(filepath_prefix))
        
        # Apply ordering
        order_column = getattr(SourceImage, order_by, SourceImage.date_taken)
        if order_direction == "asc":
            statement = statement.order_by(order_column.asc())
        else:
            statement = statement.order_by(order_column.desc())
        
        statement = statement.offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def count_not_deleted_filtered(
        self, 
        used: Optional[bool] = None,
        source_image_ids: Optional[List[int]] = None,
        filepath_prefix: Optional[str] = None,
    ) -> int:
        """Count all non-deleted source images with optional filtering."""
        statement = select(SourceImage).where(SourceImage.is_deleted == False)
        
        if used is not None:
            if used:
                statement = statement.where(SourceImage.usage_count > 0)
            else:
                statement = statement.where(SourceImage.usage_count == 0)
        
        if source_image_ids is not None:
            statement = statement.where(SourceImage.id.in_(source_image_ids))
        
        if filepath_prefix is not None:
            statement = statement.where(SourceImage.filepath.startswith(filepath_prefix))
        
        return len(list(self.session.exec(statement).all()))

    def mark_deleted(self, filepath: str) -> bool:
        """Mark source image as deleted."""
        image = self.get_by_filepath(filepath)
        if image:
            image.is_deleted = True
            self.session.add(image)
            self.session.commit()
            return True
        return False

    def increment_usage(self, source_image_id: int) -> bool:
        """Increment usage_count by 1 for a source image."""
        image = self.get(source_image_id)
        if image:
            image.usage_count += 1
            self.session.add(image)
            self.session.commit()
            return True
        return False

    def decrement_usage(self, source_image_id: int) -> bool:
        """
        Decrement usage_count by 1 for a source image.
        If count would go negative, logs error and sets to 0.
        """
        image = self.get(source_image_id)
        if image:
            if image.usage_count <= 0:
                logger.error(
                    f"Attempted to decrement usage_count below 0 for source_image_id={source_image_id}. "
                    f"Current count: {image.usage_count}. Setting to 0."
                )
                image.usage_count = 0
            else:
                image.usage_count -= 1
            self.session.add(image)
            self.session.commit()
            return True
        return False

    def batch_increment_usage(self, source_image_ids: List[int]) -> int:
        """
        Increment usage_count by 1 for multiple source images.
        Returns count of successfully updated images.
        """
        if not source_image_ids:
            return 0
        
        count = 0
        for source_image_id in source_image_ids:
            if self.increment_usage(source_image_id):
                count += 1
        return count

    def batch_decrement_usage(self, source_image_ids: List[int]) -> int:
        """
        Decrement usage_count by 1 for multiple source images.
        Returns count of successfully updated images.
        """
        if not source_image_ids:
            return 0
        
        count = 0
        for source_image_id in source_image_ids:
            if self.decrement_usage(source_image_id):
                count += 1
        return count

    def recalculate_all_usage_counts(self) -> dict:
        """
        Recalculate all usage_counts from actual ImageSlot references.
        Returns summary of changes made.
        """
        # First, set all usage counts to 0
        all_images = list(self.session.exec(select(SourceImage)).all())
        for image in all_images:
            image.usage_count = 0
            self.session.add(image)
        
        # Query actual usage counts from ImageSlots
        statement = text("""
            SELECT source_image_id, COUNT(*) as count 
            FROM image_slots 
            WHERE source_image_id IS NOT NULL 
            GROUP BY source_image_id
        """)
        result = self.session.exec(statement)
        
        updated_count = 0
        negative_count_found = 0
        
        for row in result:
            source_image_id = row[0]
            actual_count = row[1]
            
            image = self.get(source_image_id)
            if image:
                if image.usage_count < 0:
                    negative_count_found += 1
                    logger.error(
                        f"Negative usage_count found for source_image_id={source_image_id}. "
                        f"Correcting to {actual_count}."
                    )
                image.usage_count = actual_count
                self.session.add(image)
                updated_count += 1
        
        self.session.commit()
        
        return {
            "total_images": len(all_images),
            "updated_count": updated_count,
            "negative_counts_corrected": negative_count_found
        }

