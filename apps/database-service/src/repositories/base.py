"""
Base repository pattern for CRUD operations.
"""

from typing import Generic, TypeVar, Type, Optional, List
from sqlmodel import Session, select

ModelType = TypeVar("ModelType")


class Repository(Generic[ModelType]):
    """Generic repository for CRUD operations."""

    def __init__(self, model: Type[ModelType], session: Session):
        """Initialize repository with model and session."""
        self.model = model
        self.session = session

    def create(self, obj: ModelType) -> ModelType:
        """Create a new record."""
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        return obj

    def get(self, id: int) -> Optional[ModelType]:
        """Get a record by ID."""
        return self.session.get(self.model, id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get all records with pagination."""
        statement = select(self.model).offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def count(self) -> int:
        """Count all records."""
        statement = select(self.model)
        return len(list(self.session.exec(statement).all()))

    def update(self, obj: ModelType) -> ModelType:
        """Update a record."""
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        return obj

    def delete(self, id: int) -> bool:
        """Delete a record by ID."""
        obj = self.get(id)
        if obj:
            self.session.delete(obj)
            self.session.commit()
            return True
        return False

