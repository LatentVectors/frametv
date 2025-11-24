"""
Database connection and session management.
"""

import os
from pathlib import Path
from sqlmodel import create_engine, SQLModel, Session
from typing import Generator

# Import all models to register them with SQLModel
from models import (  # noqa: F401
    SourceImage,
    GalleryImage,
    ImageSlot,
    TVContentMapping,
    Settings,
)

# Get database URL from environment or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///../../data/frametv.db"
)

# Convert relative path to absolute if needed
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        # Get absolute path relative to this file's parent directory (src -> apps/database-service)
        script_dir = Path(__file__).parent.absolute()
        service_root = script_dir.parent
        db_path = service_root / db_path.lstrip("/")
        # Resolve the path to handle .. segments
        db_path = db_path.resolve()
        # Ensure directory exists
        db_path.parent.mkdir(parents=True, exist_ok=True)
        DATABASE_URL = f"sqlite:///{db_path}"

# Create engine
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def create_db_and_tables():
    """Create all database tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get database session."""
    with Session(engine) as session:
        yield session

