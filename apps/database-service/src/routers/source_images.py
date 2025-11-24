"""
API router for SourceImage endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from pydantic import BaseModel

from database import get_session
from models import SourceImage
from repositories import SourceImageRepository

router = APIRouter(prefix="/source-images", tags=["source-images"])


class PaginatedResponse(BaseModel):
    """Paginated response model."""
    items: List[SourceImage]
    total: int
    page: int
    pages: int


@router.get("", response_model=PaginatedResponse)
async def list_source_images(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """List source images with pagination."""
    repo = SourceImageRepository(session)
    skip = (page - 1) * limit
    items = repo.get_all_not_deleted(skip=skip, limit=limit)
    total = repo.count()
    pages = (total + limit - 1) // limit if total > 0 else 1
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/{id}", response_model=SourceImage)
async def get_source_image(
    id: int,
    session: Session = Depends(get_session),
):
    """Get a single source image by ID."""
    repo = SourceImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Source image not found")
    return image


@router.post("", response_model=SourceImage, status_code=201)
async def create_source_image(
    image: SourceImage,
    session: Session = Depends(get_session),
):
    """Create a new source image record."""
    repo = SourceImageRepository(session)
    # Check if filepath already exists
    existing = repo.get_by_filepath(image.filepath)
    if existing:
        # Update existing record
        existing.filename = image.filename
        existing.date_taken = image.date_taken
        existing.is_deleted = False
        return repo.update(existing)
    return repo.create(image)


@router.put("/{id}", response_model=SourceImage)
async def update_source_image(
    id: int,
    image: SourceImage,
    session: Session = Depends(get_session),
):
    """Update a source image."""
    repo = SourceImageRepository(session)
    existing = repo.get(id)
    if not existing:
        raise HTTPException(status_code=404, detail="Source image not found")
    
    # Update fields
    for field, value in image.model_dump(exclude={"id"}).items():
        setattr(existing, field, value)
    
    return repo.update(existing)

