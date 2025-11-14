"""
Pydantic models for sync service API requests and responses.
"""
from typing import List, Dict
from pydantic import BaseModel


class ConnectRequest(BaseModel):
    """Request model for initiating TV connection."""
    ip_address: str
    port: int = 8002


class ConnectResponse(BaseModel):
    """Response model for TV connection initiation."""
    success: bool
    requires_pin: bool
    message: str


class AuthorizeRequest(BaseModel):
    """Request model for completing TV authorization with PIN."""
    ip_address: str
    port: int = 8002
    pin: str


class AuthorizeResponse(BaseModel):
    """Response model for TV authorization completion."""
    success: bool
    token_saved: bool
    message: str


class SyncRequest(BaseModel):
    """Request model for syncing images to TV."""
    image_paths: List[str]  # Full file paths to images
    timer: str  # Slideshow timer (e.g., '15m', '1h')
    ip_address: str
    port: int = 8002


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

