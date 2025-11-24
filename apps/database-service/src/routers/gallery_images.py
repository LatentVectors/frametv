"""
API router for GalleryImage endpoints.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from pydantic import BaseModel

from database import get_session
from models import GalleryImage, ImageSlot
from repositories import GalleryImageRepository

router = APIRouter(prefix="/gallery-images", tags=["gallery-images"])


class GalleryImageWithSlots(BaseModel):
    """Gallery image with slots."""
    id: Optional[int] = None
    filename: str
    filepath: str
    template_id: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    slots: List[ImageSlot] = []


class PaginatedResponse(BaseModel):
    """Paginated response model."""
    items: List[GalleryImage]
    total: int
    page: int
    pages: int


@router.get("", response_model=PaginatedResponse)
async def list_gallery_images(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """List gallery images with pagination."""
    repo = GalleryImageRepository(session)
    skip = (page - 1) * limit
    items = repo.get_all(skip=skip, limit=limit)
    total = repo.count()
    pages = (total + limit - 1) // limit if total > 0 else 1
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/{id}", response_model=GalleryImageWithSlots)
async def get_gallery_image(
    id: int,
    session: Session = Depends(get_session),
):
    """Get a single gallery image by ID with its slots."""
    repo = GalleryImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    # Get slots for this image
    slots = repo.get_slots(id)
    
    # Construct response model
    return GalleryImageWithSlots(
        id=image.id,
        filename=image.filename,
        filepath=image.filepath,
        template_id=image.template_id,
        notes=image.notes,
        created_at=image.created_at,
        updated_at=image.updated_at,
        slots=slots,
    )


@router.post("", response_model=GalleryImage, status_code=201)
async def create_gallery_image(
    image: GalleryImage,
    session: Session = Depends(get_session),
):
    """Create a new gallery image record."""
    repo = GalleryImageRepository(session)
    return repo.create(image)


@router.put("/{id}", response_model=GalleryImage)
async def update_gallery_image(
    id: int,
    image: GalleryImage,
    session: Session = Depends(get_session),
):
    """Update a gallery image."""
    repo = GalleryImageRepository(session)
    existing = repo.get(id)
    if not existing:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    # Update fields
    for field, value in image.model_dump(exclude={"id"}).items():
        setattr(existing, field, value)
    
    return repo.update(existing)


@router.delete("/{id}", status_code=204)
async def delete_gallery_image(
    id: int,
    session: Session = Depends(get_session),
):
    """Delete a gallery image."""
    repo = GalleryImageRepository(session)
    if not repo.delete(id):
        raise HTTPException(status_code=404, detail="Gallery image not found")

