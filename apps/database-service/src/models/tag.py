"""
Tag model for organizing images.
"""

from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Tag(SQLModel, table=True):
    """Model for tags used to organize images."""

    __tablename__ = "tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    color: Optional[str] = None  # Optional color for UI display (e.g., "#ff5733")
    created_at: datetime = Field(default_factory=datetime.utcnow)

