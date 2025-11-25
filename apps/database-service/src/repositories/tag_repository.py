"""
Repository for Tag operations.
"""

from typing import List, Optional
from sqlmodel import Session, select
from models import Tag
from .base import Repository


class TagRepository(Repository[Tag]):
    """Repository for Tag CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository."""
        super().__init__(Tag, session)

    def get_by_name(self, name: str) -> Optional[Tag]:
        """Get tag by name."""
        statement = select(Tag).where(Tag.name == name)
        return self.session.exec(statement).first()

    def get_or_create(self, name: str, color: Optional[str] = None) -> Tag:
        """Get existing tag by name or create a new one."""
        existing = self.get_by_name(name)
        if existing:
            return existing
        
        new_tag = Tag(name=name, color=color)
        return self.create(new_tag)

    def search_by_name(self, query: str, limit: int = 20) -> List[Tag]:
        """Search tags by name prefix (for autocomplete)."""
        statement = (
            select(Tag)
            .where(Tag.name.ilike(f"{query}%"))
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_all_sorted(self) -> List[Tag]:
        """Get all tags sorted by name."""
        statement = select(Tag).order_by(Tag.name)
        return list(self.session.exec(statement).all())

