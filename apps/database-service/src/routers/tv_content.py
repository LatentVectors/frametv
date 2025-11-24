"""
API router for TVContentMapping endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from pydantic import BaseModel

from database import get_session
from models import TVContentMapping
from repositories import TVContentRepository

router = APIRouter(prefix="/tv-content", tags=["tv-content"])


class PaginatedResponse(BaseModel):
    """Paginated response model."""
    items: List[TVContentMapping]
    total: int
    page: int
    pages: int


class RefreshRequest(BaseModel):
    """Request model for TV state refresh."""
    tv_content_ids: List[str]


class RefreshResponse(BaseModel):
    """Response model for TV state refresh."""
    removed: int
    added: int
    updated: int


@router.get("", response_model=PaginatedResponse)
async def list_tv_content(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session),
):
    """List all TV content mappings with pagination."""
    repo = TVContentRepository(session)
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


@router.get("/{id}", response_model=TVContentMapping)
async def get_tv_content(
    id: int,
    session: Session = Depends(get_session),
):
    """Get a single TV content mapping by ID."""
    repo = TVContentRepository(session)
    mapping = repo.get(id)
    if not mapping:
        raise HTTPException(status_code=404, detail="TV content mapping not found")
    return mapping


@router.get("/by-tv-id/{tv_content_id}", response_model=TVContentMapping)
async def get_tv_content_by_tv_id(
    tv_content_id: str,
    session: Session = Depends(get_session),
):
    """Get TV content mapping by TV content ID."""
    repo = TVContentRepository(session)
    mapping = repo.get_by_tv_content_id(tv_content_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="TV content mapping not found")
    return mapping


@router.get("/by-gallery-image/{gallery_image_id}", response_model=Optional[TVContentMapping])
async def get_tv_content_by_gallery_image(
    gallery_image_id: int,
    session: Session = Depends(get_session),
):
    """Get TV content mapping by gallery image ID."""
    repo = TVContentRepository(session)
    return repo.get_by_gallery_image_id(gallery_image_id)


@router.post("", response_model=TVContentMapping, status_code=201)
async def create_tv_content(
    mapping: TVContentMapping,
    session: Session = Depends(get_session),
):
    """Create a new TV content mapping."""
    repo = TVContentRepository(session)
    # Check if tv_content_id already exists
    existing = repo.get_by_tv_content_id(mapping.tv_content_id)
    if existing:
        raise HTTPException(status_code=400, detail="TV content ID already exists")
    return repo.create(mapping)


@router.put("/{id}", response_model=TVContentMapping)
async def update_tv_content(
    id: int,
    mapping: TVContentMapping,
    session: Session = Depends(get_session),
):
    """Update a TV content mapping."""
    repo = TVContentRepository(session)
    existing = repo.get(id)
    if not existing:
        raise HTTPException(status_code=404, detail="TV content mapping not found")
    
    # Update fields
    for field, value in mapping.model_dump(exclude={"id"}).items():
        setattr(existing, field, value)
    
    return repo.update(existing)


@router.delete("/{id}", status_code=204)
async def delete_tv_content(
    id: int,
    session: Session = Depends(get_session),
):
    """Delete a TV content mapping."""
    repo = TVContentRepository(session)
    if not repo.delete(id):
        raise HTTPException(status_code=404, detail="TV content mapping not found")


@router.delete("/by-tv-id/{tv_content_id}", status_code=204)
async def delete_tv_content_by_tv_id(
    tv_content_id: str,
    session: Session = Depends(get_session),
):
    """Delete TV content mapping by TV content ID."""
    repo = TVContentRepository(session)
    if not repo.delete_by_tv_content_id(tv_content_id):
        raise HTTPException(status_code=404, detail="TV content mapping not found")

