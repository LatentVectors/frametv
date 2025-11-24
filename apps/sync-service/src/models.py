"""
Pydantic models for sync service API requests and responses.
"""

from typing import List, Dict
from pydantic import BaseModel


class SyncRequest(BaseModel):
    """Request model for syncing images to TV."""

    image_paths: List[str]  # Full file paths to images (legacy)
    ip_address: str
    port: int = 8002
    mode: str = "add"  # "add" or "reset"
    gallery_image_ids: List[int] = []  # Gallery image IDs to sync


class FailedImage(BaseModel):
    """Model for failed image sync information."""

    filename: str
    error: str


class SyncResponse(BaseModel):
    """Response model for sync operation."""

    success: bool
    synced: List[str]  # Successfully synced filenames
    failed: List[FailedImage]  # Failed images with error messages
    total: int
    successful: int
