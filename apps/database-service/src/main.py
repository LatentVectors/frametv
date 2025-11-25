"""
FastAPI database service for FrameTV.
Provides REST API for data persistence using SQLModel and SQLite.
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import create_db_and_tables, engine
from models import Base
from routers import (
    source_images_router,
    gallery_images_router,
    tv_content_router,
    settings_router,
    tags_router,
)
from routers.scanner import router as scanner_router
from scanner import scan_albums_directory
from repositories import SourceImageRepository
from pathlib import Path
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get port from environment variable or use default
PORT = int(os.getenv("DATABASE_SERVICE_PORT", "8001"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    logger.info("Creating database tables...")
    create_db_and_tables()
    logger.info("Database tables created")
    
    # Run migrations
    try:
        from alembic.config import Config
        from alembic import command
        
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed")
    except Exception as e:
        logger.warning(f"Migration check failed (this is OK on first run): {e}")
    
    # Run startup album scan
    try:
        from database import get_session
        
        data_path = Path(os.getenv("DATA_PATH", "../../data")).resolve()
        albums_path = data_path / "albums"
        
        # Ensure absolute paths
        script_dir = Path(__file__).parent.parent.absolute()
        if not data_path.is_absolute():
            data_path = script_dir.parent.parent / data_path
        if not albums_path.is_absolute():
            albums_path = script_dir.parent.parent / albums_path
        
        # Get session and run scan
        session_gen = get_session()
        session = next(session_gen)
        try:
            result = scan_albums_directory(albums_path, data_path, session)
            logger.info(
                f"Startup album scan: {result['scanned']} scanned, "
                f"{result['added']} added, {result['updated']} updated"
            )
        finally:
            session.close()
    except Exception as e:
        logger.warning(f"Startup album scan failed: {e}")
    
    # Run usage count reconciliation on startup
    try:
        from database import get_session
        
        session_gen = get_session()
        session = next(session_gen)
        try:
            repo = SourceImageRepository(session)
            result = repo.recalculate_all_usage_counts()
            logger.info(
                f"Usage count reconciliation: {result['total_images']} images, "
                f"{result['updated_count']} updated, "
                f"{result['negative_counts_corrected']} negative counts corrected"
            )
        finally:
            session.close()
    except Exception as e:
        logger.warning(f"Usage count reconciliation failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down database service")


# Create FastAPI app
app = FastAPI(
    title="FrameTV Database Service",
    version="1.0.0",
    description="Database service for FrameTV image and metadata management",
    lifespan=lifespan
)

# Configure CORS to allow requests from Next.js app and sync-service
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(source_images_router)
app.include_router(scanner_router)  # Scanner endpoints (POST /source-images/scan)
app.include_router(gallery_images_router)
app.include_router(tv_content_router)
app.include_router(settings_router)
app.include_router(tags_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"status": "ok", "service": "FrameTV Database Service"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "detail": str(e)}


@app.get("/openapi.json")
async def openapi():
    """OpenAPI specification endpoint."""
    return app.openapi()


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting database service on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)

