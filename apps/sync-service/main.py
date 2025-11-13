"""
FastAPI sync service for syncing images to Samsung Frame TV.
"""
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    ConnectRequest,
    ConnectResponse,
    AuthorizeRequest,
    AuthorizeResponse,
    SyncRequest,
    SyncResponse,
    FailedImage,
)
from tv_sync import initiate_connection, authorize_with_pin, sync_images_to_tv

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


@app.post("/connect", response_model=ConnectResponse)
async def connect(request: ConnectRequest):
    """
    Initiate TV connection and check if PIN is required.
    
    This endpoint attempts to connect to the TV and determines
    if a PIN is needed for authorization.
    """
    try:
        logger.info(f"Connect request for {request.ip_address}:{request.port}")
        success, requires_pin, message = initiate_connection(
            request.ip_address, request.port
        )
        
        return ConnectResponse(
            success=success,
            requires_pin=requires_pin,
            message=message,
        )
    except Exception as e:
        logger.error(f"Error in connect endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Connection error: {str(e)}"
        )


@app.post("/authorize", response_model=AuthorizeResponse)
async def authorize(request: AuthorizeRequest):
    """
    Complete TV authorization with PIN and save token.
    
    This endpoint completes the authorization process by providing
    the PIN displayed on the TV. The token is saved for future use.
    """
    try:
        logger.info(f"Authorize request for {request.ip_address}:{request.port}")
        success, token_saved, message = authorize_with_pin(
            request.ip_address,
            request.port,
            request.pin,
        )
        
        return AuthorizeResponse(
            success=success,
            token_saved=token_saved,
            message=message,
        )
    except Exception as e:
        logger.error(f"Error in authorize endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Authorization error: {str(e)}"
        )


@app.post("/sync", response_model=SyncResponse)
async def sync(request: SyncRequest):
    """
    Sync selected images to TV with specified slideshow timer.
    
    This endpoint:
    1. Connects to the TV using saved token
    2. Turns on Art Mode
    3. Uploads each image with matte='none'
    4. Sets the slideshow timer
    """
    try:
        logger.info(
            f"Sync request for {len(request.image_paths)} images "
            f"to {request.ip_address}:{request.port} with timer {request.timer}"
        )
        
        success, synced, failed_dicts, total, successful = sync_images_to_tv(
            request.image_paths,
            request.timer,
            request.ip_address,
            request.port,
        )
        
        # Convert failed dicts to FailedImage models
        failed = [
            FailedImage(filename=f["filename"], error=f["error"])
            for f in failed_dicts
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
        raise HTTPException(
            status_code=500,
            detail=f"Sync error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting sync service on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)

