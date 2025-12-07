"""
FastAPI sync service for syncing images to Samsung Frame TV.
"""

import json
import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from models import (
    DeleteRequest,
    DeleteResponse,
    FailedDelete,
    FailedImage,
    SyncRequest,
    SyncResponse,
)

# Initialize TV mocking if MOCK_TV is enabled (must happen before importing tv_sync)
if os.getenv("MOCK_TV", "").lower() == "true":
    from tv_mock import setup_tv_mock  # noqa: E402

    setup_tv_mock()
    logging.getLogger(__name__).info(
        "TV mocking enabled via MOCK_TV environment variable"
    )

from database_client import DatabaseClient  # noqa: E402
from samsungtvws.async_art import SamsungTVAsyncArt  # noqa: E402
from tv_refresh import (
    get_data_dir,
    get_token_file_path,
    get_thumbnails_dir,
    refresh_tv_state,
)  # noqa: E402
from tv_sync import sync_images_to_tv  # noqa: E402
from tv_sync_smart import (
    sync_add_mode,
    sync_reset_mode,
    sync_add_mode_stream,
    sync_reset_mode_stream,
)  # noqa: E402

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
                (
                    success,
                    synced,
                    failed_dicts,
                    total,
                    successful,
                ) = await sync_reset_mode(
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


@app.post("/sync-stream")
async def sync_stream(request: SyncRequest):
    """
    Sync selected images to TV with streaming progress updates.

    Returns Server-Sent Events (SSE) with progress updates:
    - {"type": "progress", "current": N, "total": M, "filename": "...", "stage": "..."}
    - {"type": "complete", "success": bool, "synced": [...], "failed": [...], ...}
    """

    async def event_generator():
        try:
            if request.gallery_image_ids:
                logger.info(
                    f"Streaming sync ({request.mode} mode) for {len(request.gallery_image_ids)} "
                    f"gallery images to {request.ip_address}:{request.port}"
                )

                if request.mode == "reset":
                    stream = sync_reset_mode_stream(
                        request.gallery_image_ids,
                        request.ip_address,
                        request.port,
                    )
                else:  # default to "add"
                    stream = sync_add_mode_stream(
                        request.gallery_image_ids,
                        request.ip_address,
                        request.port,
                    )

                async for event in stream:
                    yield f"data: {json.dumps(event)}\n\n"
            else:
                # Legacy mode doesn't support streaming, return immediate error
                yield f"data: {json.dumps({'type': 'complete', 'success': False, 'synced': [], 'failed': [], 'total': 0, 'successful': 0, 'error': 'Streaming sync requires gallery_image_ids'})}\n\n"
        except Exception as e:
            logger.error(f"Error in sync stream: {e}")
            yield f"data: {json.dumps({'type': 'complete', 'success': False, 'synced': [], 'failed': [], 'total': 0, 'successful': 0, 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


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
                    detail="TV IP address not configured. Please set it in Settings.",
                )
        finally:
            await db_client.close()
        logger.info(f"Refreshing TV state for {ip_address}:{port}")

        result = await refresh_tv_state(ip_address, port)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in refresh TV state endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Refresh error: {str(e)}")


@app.post("/tv-content/delete", response_model=DeleteResponse)
async def delete_tv_content(request: DeleteRequest):
    """
    Delete images from TV one at a time.

    For each successful TV deletion:
    - Deletes the database record
    - Deletes the thumbnail file

    If a deletion fails, the database record and thumbnail are preserved.
    """
    db_client = DatabaseClient()
    deleted: list[str] = []
    failed: list[FailedDelete] = []
    tv = None

    try:
        # Get TV settings from database
        settings = await db_client.get_settings()
        ip_address = settings.get("tv_ip_address")
        port = settings.get("tv_port", 8002)

        if not ip_address:
            raise HTTPException(
                status_code=400,
                detail="TV IP address not configured. Please set it in Settings.",
            )

        logger.info(
            f"Deleting {len(request.tv_content_ids)} images from TV at {ip_address}:{port}"
        )

        # Connect to TV
        token_file = get_token_file_path()
        tv = SamsungTVAsyncArt(host=ip_address, port=port, token_file=token_file)
        await tv.start_listening()

        if not tv.is_alive():
            raise HTTPException(status_code=500, detail="Failed to connect to TV")

        # Check if TV is in art mode
        if not await tv.in_artmode():
            raise HTTPException(status_code=400, detail="TV is not in art mode")

        thumbnails_dir = get_thumbnails_dir()

        # Delete images one at a time
        for tv_content_id in request.tv_content_ids:
            try:
                logger.info(f"Deleting {tv_content_id} from TV...")

                # Delete from TV (one at a time using delete_list with single item)
                await tv.delete_list([tv_content_id])
                logger.info(f"Successfully deleted {tv_content_id} from TV")

                # Delete from database
                try:
                    await db_client.delete_tv_content_by_tv_id(tv_content_id)
                    logger.info(f"Deleted database record for {tv_content_id}")
                except Exception as db_error:
                    logger.warning(
                        f"Failed to delete database record for {tv_content_id}: {db_error}"
                    )

                # Delete thumbnail
                try:
                    thumbnail_path = thumbnails_dir / f"{tv_content_id}.jpg"
                    if thumbnail_path.exists():
                        thumbnail_path.unlink()
                        logger.info(f"Deleted thumbnail for {tv_content_id}")
                except Exception as thumb_error:
                    logger.warning(
                        f"Failed to delete thumbnail for {tv_content_id}: {thumb_error}"
                    )

                deleted.append(tv_content_id)

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to delete {tv_content_id} from TV: {error_msg}")
                failed.append(
                    FailedDelete(tv_content_id=tv_content_id, error=error_msg)
                )

        logger.info(
            f"Delete operation complete: {len(deleted)} deleted, {len(failed)} failed"
        )

        return DeleteResponse(deleted=deleted, failed=failed)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete TV content endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")
    finally:
        if tv is not None:
            try:
                await tv.close()
            except Exception:
                pass
        await db_client.close()


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting sync service on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
