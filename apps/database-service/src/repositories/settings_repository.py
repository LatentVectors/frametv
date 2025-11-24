"""
Repository for Settings operations.
"""

from typing import Optional, Dict, Any
from sqlmodel import Session, select
from models import Settings
from .base import Repository


class SettingsRepository(Repository[Settings]):
    """Repository for Settings CRUD operations."""

    def __init__(self, session: Session):
        """Initialize repository."""
        super().__init__(Settings, session)

    def get_by_key(self, key: str) -> Optional[Settings]:
        """Get setting by key."""
        statement = select(Settings).where(Settings.key == key)
        return self.session.exec(statement).first()

    def get_value(self, key: str, default: Any = None) -> Any:
        """Get setting value by key."""
        setting = self.get_by_key(key)
        if setting:
            return setting.value
        return default

    def set_value(self, key: str, value: Any) -> Settings:
        """Set or update setting value."""
        setting = self.get_by_key(key)
        if setting:
            setting.value = value
            self.session.add(setting)
            self.session.commit()
            self.session.refresh(setting)
            return setting
        else:
            # Create new setting
            new_setting = Settings(key=key, value=value)
            return self.create(new_setting)

    def get_all_dict(self) -> Dict[str, Any]:
        """Get all settings as a dictionary."""
        settings = self.get_all(skip=0, limit=1000)  # Get all settings
        return {s.key: s.value for s in settings}

