"""
FastAPI sync service for syncing images to Samsung Frame TV.
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    SyncRequest,
    SyncResponse,
    FailedImage,
)

# Initialize TV mocking if MOCK_TV is enabled (must happen before importing tv_sync)
if os.getenv("MOCK_TV", "").lower() == "true":
    from tv_mock import setup_tv_mock  # noqa: E402

    setup_tv_mock()
    logging.getLogger(__name__).info(
        "TV mocking enabled via MOCK_TV environment variable"
    )

from tv_sync import sync_images_to_tv  # noqa: E402
from tv_refresh import refresh_tv_state  # noqa: E402
from tv_sync_smart import sync_add_mode, sync_reset_mode  # noqa: E402
from database_client import DatabaseClient  # noqa: E402

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get port from environment variable or use default
PORT = int(os.getenv("SYNC_SERVICE_PORT", "8000"))

# Create FastAPI app
app = FastAPI(title="Frame TV Sync Service", version="1.0.0")

# Configure CORS to allow requests from Next.js app (typically on localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Frame TV Sync Service"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/sync", response_model=SyncResponse)
async def sync(request: SyncRequest):
    """
    Sync selected images to TV.

    Supports two modes:
    - "add": Upload only new gallery images, preserve all existing TV content
    - "reset": Remove unselected gallery images, upload new ones, preserve manual uploads

    Uses gallery_image_ids if provided, otherwise falls back to image_paths (legacy).
    """
    try:
        # Use smart sync if gallery_image_ids provided
        if request.gallery_image_ids:
            logger.info(
                f"Smart sync ({request.mode} mode) for {len(request.gallery_image_ids)} "
                f"gallery images to {request.ip_address}:{request.port}"
            )
            
            if request.mode == "reset":
                success, synced, failed_dicts, total, successful = await sync_reset_mode(
                    request.gallery_image_ids,
                    request.ip_address,
                    request.port,
                )
            else:  # default to "add"
                success, synced, failed_dicts, total, successful = await sync_add_mode(
                    request.gallery_image_ids,
                    request.ip_address,
                    request.port,
                )
        else:
            # Legacy mode using image_paths
            logger.info(
                f"Legacy sync for {len(request.image_paths)} images "
                f"to {request.ip_address}:{request.port}"
            )
            
            success, synced, failed_dicts, total, successful = await sync_images_to_tv(
                request.image_paths,
                request.ip_address,
                request.port,
            )

        # Convert failed dicts to FailedImage models
        failed = [
            FailedImage(filename=f["filename"], error=f["error"]) for f in failed_dicts
        ]

        return SyncResponse(
            success=success,
            synced=synced,
            failed=failed,
            total=total,
            successful=successful,
        )
    except Exception as e:
        logger.error(f"Error in sync endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


@app.post("/tv-content/refresh")
async def refresh_tv():
    """
    Refresh TV state - reconcile database with TV's actual state.
    """
    try:
        # Get TV settings from database
        db_client = DatabaseClient()
        try:
            settings = await db_client.get_settings()
            ip_address = settings.get("tv_ip_address")
            port = settings.get("tv_port", 8002)
            
            if not ip_address:
                raise HTTPException(
                    status_code=400,
                    detail="TV IP address not configured. Please set it in Settings."
                )
        finally:
            await db_client.close()
        
        result = await refresh_tv_state(ip_address, port)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in refresh TV state endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Refresh error: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting sync service on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
