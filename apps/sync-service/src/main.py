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

    This endpoint:
    1. Connects to the TV using saved token
    2. Turns on Art Mode
    3. Uploads each image with matte='none'
    """
    try:
        logger.info(
            f"Sync request for {len(request.image_paths)} images "
            f"to {request.ip_address}:{request.port}"
        )

        success, synced, failed_dicts, total, successful = sync_images_to_tv(
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


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting sync service on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
