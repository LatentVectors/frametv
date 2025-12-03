"""
Settings model for storing application settings.
"""

from datetime import datetime
from typing import Optional, Any
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON as SA_JSON


class Settings(SQLModel, table=True):
    """Model for application settings."""

    __tablename__ = "settings"

    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)
    value: Any = Field(sa_column=Column(SA_JSON))  # JSON field to support various data types
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

