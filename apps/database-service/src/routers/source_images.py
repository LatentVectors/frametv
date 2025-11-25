"""
API router for SourceImage endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from pydantic import BaseModel

from database import get_session
from models import SourceImage, Tag
from repositories import SourceImageRepository, TagRepository, SourceImageTagRepository

router = APIRouter(prefix="/source-images", tags=["source-images"])


class SourceImageResponse(BaseModel):
    """Source image response model with computed is_used field."""
    id: Optional[int] = None
    filename: str
    filepath: str
    date_taken: Optional[str] = None
    is_deleted: bool
    usage_count: int
    is_used: bool
    created_at: str
    updated_at: str


class PaginatedResponse(BaseModel):
    """Paginated response model."""
    items: List[SourceImageResponse]
    total: int
    page: int
    pages: int


class RecalculateUsageResponse(BaseModel):
    """Response model for usage count recalculation."""
    success: bool
    total_images: int
    updated_count: int
    negative_counts_corrected: int


@router.get("", response_model=PaginatedResponse)
async def list_source_images(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    used: Optional[bool] = Query(None, description="Filter by usage status (true=used, false=unused, null=all)"),
    tags: Optional[str] = Query(None, description="Comma-separated list of tag names to filter by"),
    album: Optional[str] = Query(None, description="Filter by album name (matches filepath starting with albums/{album}/)"),
    sort_by: Optional[str] = Query("date_taken", description="Field to sort by: date_taken (default), filename, created_at"),
    sort_order: Optional[str] = Query("desc", description="Sort direction: desc (default), asc"),
    session: Session = Depends(get_session),
):
    """List source images with pagination and optional filtering."""
    repo = SourceImageRepository(session)
    skip = (page - 1) * limit
    
    # Build filepath prefix for album filtering
    filepath_prefix = f"albums/{album}/" if album else None
    
    # Validate sort_by and sort_order
    valid_sort_fields = ["date_taken", "filename", "created_at"]
    if sort_by not in valid_sort_fields:
        sort_by = "date_taken"
    if sort_order not in ["asc", "desc"]:
        sort_order = "desc"
    
    # Handle tag filtering
    source_image_ids = None
    if tags:
        tag_names = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_names:
            tag_repo = TagRepository(session)
            tag_objs = []
            for name in tag_names:
                tag = tag_repo.get_by_name(name)
                if tag:
                    tag_objs.append(tag)
            
            if tag_objs:
                tag_ids = [t.id for t in tag_objs]
                source_tag_repo = SourceImageTagRepository(session)
                source_image_ids = source_tag_repo.get_source_image_ids_with_all_tags(tag_ids)
                
                # If no images match the tags, return empty
                if not source_image_ids:
                    return PaginatedResponse(
                        items=[],
                        total=0,
                        page=page,
                        pages=1,
                    )
    
    items = repo.get_all_not_deleted_filtered(
        skip=skip, 
        limit=limit, 
        used=used, 
        source_image_ids=source_image_ids,
        filepath_prefix=filepath_prefix,
        order_by=sort_by,
        order_direction=sort_order,
    )
    total = repo.count_not_deleted_filtered(
        used=used, 
        source_image_ids=source_image_ids,
        filepath_prefix=filepath_prefix,
    )
    pages = (total + limit - 1) // limit if total > 0 else 1
    
    # Convert to response model with is_used computed
    response_items = [
        SourceImageResponse(
            id=item.id,
            filename=item.filename,
            filepath=item.filepath,
            date_taken=item.date_taken.isoformat() if item.date_taken else None,
            is_deleted=item.is_deleted,
            usage_count=item.usage_count,
            is_used=item.is_used,
            created_at=item.created_at.isoformat(),
            updated_at=item.updated_at.isoformat(),
        )
        for item in items
    ]
    
    return PaginatedResponse(
        items=response_items,
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/{id}", response_model=SourceImageResponse)
async def get_source_image(
    id: int,
    session: Session = Depends(get_session),
):
    """Get a single source image by ID."""
    repo = SourceImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Source image not found")
    
    return SourceImageResponse(
        id=image.id,
        filename=image.filename,
        filepath=image.filepath,
        date_taken=image.date_taken.isoformat() if image.date_taken else None,
        is_deleted=image.is_deleted,
        usage_count=image.usage_count,
        is_used=image.is_used,
        created_at=image.created_at.isoformat(),
        updated_at=image.updated_at.isoformat(),
    )


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
    
    # Update fields (excluding usage_count which is managed internally)
    for field, value in image.model_dump(exclude={"id", "usage_count"}).items():
        setattr(existing, field, value)
    
    return repo.update(existing)


@router.post("/recalculate-usage", response_model=RecalculateUsageResponse)
async def recalculate_usage_counts(
    session: Session = Depends(get_session),
):
    """Recalculate all usage counts from actual ImageSlot references."""
    repo = SourceImageRepository(session)
    result = repo.recalculate_all_usage_counts()
    
    return RecalculateUsageResponse(
        success=True,
        total_images=result["total_images"],
        updated_count=result["updated_count"],
        negative_counts_corrected=result["negative_counts_corrected"],
    )


# Tag endpoints for source images
@router.get("/{id}/tags", response_model=List[Tag])
async def get_source_image_tags(
    id: int,
    session: Session = Depends(get_session),
):
    """Get all tags for a source image."""
    repo = SourceImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Source image not found")
    
    tag_repo = SourceImageTagRepository(session)
    return tag_repo.get_tags_for_source_image(id)


class AddTagRequest(BaseModel):
    """Request model for adding a tag."""
    tag_name: str
    tag_color: Optional[str] = None


@router.post("/{id}/tags", response_model=Tag, status_code=201)
async def add_tag_to_source_image(
    id: int,
    request: AddTagRequest,
    session: Session = Depends(get_session),
):
    """Add a tag to a source image. Creates tag if it doesn't exist."""
    repo = SourceImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Source image not found")
    
    # Get or create tag
    tag_repo = TagRepository(session)
    tag = tag_repo.get_or_create(request.tag_name, request.tag_color)
    
    # Add tag to source image
    source_tag_repo = SourceImageTagRepository(session)
    source_tag_repo.add_tag_to_source_image(id, tag.id)
    
    return tag


@router.delete("/{id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_source_image(
    id: int,
    tag_id: int,
    session: Session = Depends(get_session),
):
    """Remove a tag from a source image."""
    repo = SourceImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Source image not found")
    
    source_tag_repo = SourceImageTagRepository(session)
    if not source_tag_repo.remove_tag_from_source_image(id, tag_id):
        raise HTTPException(status_code=404, detail="Tag not found on this source image")

