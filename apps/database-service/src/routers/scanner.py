"""
API router for album scanner endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel
from pathlib import Path
import os

from database import get_session
from scanner import scan_albums_directory

router = APIRouter(prefix="/source-images", tags=["source-images"])


class ScanResponse(BaseModel):
    """Response model for scan operation."""
    scanned: int
    added: int
    updated: int
    deleted: int


@router.post("/scan", response_model=ScanResponse)
async def trigger_scan(
    session: Session = Depends(get_session),
):
    """Trigger album directory scan."""
    # Get paths from environment
    data_path = Path(os.getenv("DATA_PATH", "../../data")).resolve()
    albums_path = data_path / "albums"
    
    # Ensure absolute paths
    script_dir = Path(__file__).parent.parent.parent.parent.absolute()
    if not data_path.is_absolute():
        data_path = script_dir.parent.parent / data_path
    if not albums_path.is_absolute():
        albums_path = script_dir.parent.parent / albums_path
    
    try:
        result = scan_albums_directory(albums_path, data_path, session)
        return ScanResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

