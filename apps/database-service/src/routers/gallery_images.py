"""
API router for GalleryImage endpoints.
"""

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session
from models import GalleryImage, ImageSlot, Tag, SourceImage, MetadataSnapshot
from repositories import (
    GalleryImageRepository, 
    SourceImageRepository,
    TagRepository,
    GalleryImageTagRepository,
)

logger = logging.getLogger(__name__)


def _get_data_path() -> Path:
    """Get the absolute data directory path."""
    data_path = Path(os.getenv("DATA_PATH", "../../data")).resolve()
    script_dir = Path(__file__).parent.parent.parent.parent.absolute()
    if not data_path.is_absolute():
        data_path = script_dir.parent.parent / data_path
    return data_path


def _delete_file_from_disk(filepath: str) -> bool:
    """Delete a file from disk. Returns True if file was deleted or didn't exist."""
    try:
        data_path = _get_data_path()
        full_path = data_path / filepath
        if full_path.exists():
            full_path.unlink()
            logger.info(f"Deleted file from disk: {full_path}")
            return True
        else:
            logger.warning(f"File not found on disk: {full_path}")
            return True  # File doesn't exist, consider it "deleted"
    except Exception as e:
        logger.error(f"Failed to delete file {filepath}: {e}")
        return False

router = APIRouter(prefix="/gallery-images", tags=["gallery-images"])


class ImageSlotCreate(BaseModel):
    """Image slot creation model."""
    slot_number: int
    source_image_id: Optional[int] = None
    transform_data: Optional[Dict[str, Any]] = None


class GalleryImageCreate(BaseModel):
    """Gallery image creation request with slots."""
    filename: str
    filepath: str
    template_id: str
    notes: Optional[str] = None
    slots: List[ImageSlotCreate] = []


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


def _create_metadata_snapshot(source_image: SourceImage) -> MetadataSnapshot:
    """Create a MetadataSnapshot from a SourceImage."""
    exif_metadata = source_image.get_exif_metadata()
    return MetadataSnapshot(
        filename=source_image.filename,
        filepath=source_image.filepath,
        date_taken=source_image.date_taken,
        exif_metadata=exif_metadata,
    )


@router.get("", response_model=PaginatedResponse)
async def list_gallery_images(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    tags: Optional[str] = Query(None, description="Comma-separated list of tag names to filter by"),
    session: Session = Depends(get_session),
):
    """List gallery images with pagination and optional tag filtering."""
    repo = GalleryImageRepository(session)
    skip = (page - 1) * limit
    
    # Handle tag filtering
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
                gallery_tag_repo = GalleryImageTagRepository(session)
                gallery_image_ids = gallery_tag_repo.get_gallery_image_ids_with_all_tags(tag_ids)
                
                # If no images match the tags, return empty
                if not gallery_image_ids:
                    return PaginatedResponse(
                        items=[],
                        total=0,
                        page=page,
                        pages=1,
                    )
                
                # Filter by matching IDs
                statement = (
                    select(GalleryImage)
                    .where(GalleryImage.id.in_(gallery_image_ids))
                    .offset(skip)
                    .limit(limit)
                )
                items = list(session.exec(statement).all())
                total = len(gallery_image_ids)
                pages = (total + limit - 1) // limit if total > 0 else 1
                
                return PaginatedResponse(
                    items=items,
                    total=total,
                    page=page,
                    pages=pages,
                )
    
    # No tag filter - return all
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


@router.post("", response_model=GalleryImageWithSlots, status_code=201)
async def create_gallery_image(
    request: GalleryImageCreate,
    session: Session = Depends(get_session),
):
    """Create a new gallery image with slots."""
    
    try:
        logger.info(f"Creating gallery image: filename={request.filename}, template_id={request.template_id}, slots={len(request.slots)}")
        
        repo = GalleryImageRepository(session)
        source_repo = SourceImageRepository(session)
        
        # Create the gallery image
        gallery_image = GalleryImage(
            filename=request.filename,
            filepath=request.filepath,
            template_id=request.template_id,
            notes=request.notes,
        )
        created_image = repo.create(gallery_image)
        logger.info(f"Created gallery image with id={created_image.id}")
        
        # Track source image IDs for usage count updates
        source_image_ids_to_increment = []
        
        # Create slots
        created_slots = []
        for slot_data in request.slots:
            logger.info(f"Creating slot: slot_number={slot_data.slot_number}, source_image_id={slot_data.source_image_id}")
            slot = ImageSlot(
                gallery_image_id=created_image.id,
                slot_number=slot_data.slot_number,
                source_image_id=slot_data.source_image_id,
                transform_data=slot_data.transform_data,
            )
            
            # Populate metadata snapshot if source_image_id is set
            if slot_data.source_image_id:
                source_image = source_repo.get(slot_data.source_image_id)
                if source_image:
                    snapshot = _create_metadata_snapshot(source_image)
                    slot.set_metadata_snapshot(snapshot)
                    source_image_ids_to_increment.append(slot_data.source_image_id)
            
            session.add(slot)
            created_slots.append(slot)
        
        session.commit()
        logger.info("Committed gallery image and slots to database")
        
        # Refresh slots to get IDs
        for slot in created_slots:
            session.refresh(slot)
        
        # Increment usage counts
        source_repo.batch_increment_usage(source_image_ids_to_increment)
        
        return GalleryImageWithSlots(
            id=created_image.id,
            filename=created_image.filename,
            filepath=created_image.filepath,
            template_id=created_image.template_id,
            notes=created_image.notes,
            created_at=created_image.created_at,
            updated_at=created_image.updated_at,
            slots=created_slots,
        )
    except Exception as e:
        logger.exception(f"Error creating gallery image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=GalleryImageWithSlots)
async def update_gallery_image(
    id: int,
    request: GalleryImageCreate,
    session: Session = Depends(get_session),
):
    """Update a gallery image and its slots."""
    repo = GalleryImageRepository(session)
    source_repo = SourceImageRepository(session)
    
    existing = repo.get(id)
    if not existing:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    # Get old slots for comparison
    old_slots = repo.get_slots(id)
    old_source_ids = {slot.source_image_id for slot in old_slots if slot.source_image_id}
    
    # Update gallery image fields
    existing.filename = request.filename
    existing.filepath = request.filepath
    existing.template_id = request.template_id
    existing.notes = request.notes
    existing.updated_at = datetime.utcnow()
    
    session.add(existing)
    
    # Delete old slots
    for slot in old_slots:
        session.delete(slot)
    
    # Track new source image IDs
    new_source_ids = set()
    
    # Create new slots
    created_slots = []
    for slot_data in request.slots:
        slot = ImageSlot(
            gallery_image_id=id,
            slot_number=slot_data.slot_number,
            source_image_id=slot_data.source_image_id,
            transform_data=slot_data.transform_data,
        )
        
        # Populate metadata snapshot if source_image_id is set
        if slot_data.source_image_id:
            source_image = source_repo.get(slot_data.source_image_id)
            if source_image:
                snapshot = _create_metadata_snapshot(source_image)
                slot.set_metadata_snapshot(snapshot)
                new_source_ids.add(slot_data.source_image_id)
        
        session.add(slot)
        created_slots.append(slot)
    
    session.commit()
    
    # Refresh slots to get IDs
    for slot in created_slots:
        session.refresh(slot)
    
    # Update usage counts: decrement for removed, increment for added
    ids_to_decrement = list(old_source_ids - new_source_ids)
    ids_to_increment = list(new_source_ids - old_source_ids)
    
    source_repo.batch_decrement_usage(ids_to_decrement)
    source_repo.batch_increment_usage(ids_to_increment)
    
    session.refresh(existing)
    
    return GalleryImageWithSlots(
        id=existing.id,
        filename=existing.filename,
        filepath=existing.filepath,
        template_id=existing.template_id,
        notes=existing.notes,
        created_at=existing.created_at,
        updated_at=existing.updated_at,
        slots=created_slots,
    )


@router.delete("/{id}", status_code=204)
async def delete_gallery_image(
    id: int,
    session: Session = Depends(get_session),
):
    """Delete a gallery image, its file from disk, and decrement usage counts."""
    repo = GalleryImageRepository(session)
    source_repo = SourceImageRepository(session)
    
    existing = repo.get(id)
    if not existing:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    # Delete the file from disk first
    _delete_file_from_disk(existing.filepath)
    
    # Get slots to track source image IDs
    slots = repo.get_slots(id)
    source_image_ids = [slot.source_image_id for slot in slots if slot.source_image_id]
    
    # Delete the gallery image (will cascade to slots if configured, or manually delete)
    for slot in slots:
        session.delete(slot)
    session.delete(existing)
    session.commit()
    
    # Decrement usage counts
    source_repo.batch_decrement_usage(source_image_ids)


class DeleteMultipleRequest(BaseModel):
    """Request model for deleting multiple gallery images."""
    ids: List[int]


class DeleteMultipleResponse(BaseModel):
    """Response model for batch delete operation."""
    deleted: int
    failed: int
    errors: List[str] = []


@router.post("/delete-multiple", response_model=DeleteMultipleResponse)
async def delete_multiple_gallery_images(
    request: DeleteMultipleRequest,
    session: Session = Depends(get_session),
):
    """Delete multiple gallery images, their files from disk, and decrement usage counts."""
    repo = GalleryImageRepository(session)
    source_repo = SourceImageRepository(session)
    
    deleted = 0
    failed = 0
    errors: List[str] = []
    all_source_image_ids: List[int] = []
    
    for image_id in request.ids:
        try:
            existing = repo.get(image_id)
            if not existing:
                failed += 1
                errors.append(f"Image {image_id} not found")
                continue
            
            # Delete the file from disk
            _delete_file_from_disk(existing.filepath)
            
            # Get slots to track source image IDs
            slots = repo.get_slots(image_id)
            source_image_ids = [slot.source_image_id for slot in slots if slot.source_image_id]
            all_source_image_ids.extend(source_image_ids)
            
            # Delete slots and gallery image
            for slot in slots:
                session.delete(slot)
            session.delete(existing)
            deleted += 1
            
        except Exception as e:
            failed += 1
            errors.append(f"Failed to delete image {image_id}: {str(e)}")
            logger.exception(f"Error deleting gallery image {image_id}")
    
    # Commit all deletions
    session.commit()
    
    # Decrement usage counts for all affected source images
    source_repo.batch_decrement_usage(all_source_image_ids)
    
    return DeleteMultipleResponse(deleted=deleted, failed=failed, errors=errors)


# Tag endpoints for gallery images
@router.get("/{id}/tags", response_model=List[Tag])
async def get_gallery_image_tags(
    id: int,
    session: Session = Depends(get_session),
):
    """Get all tags for a gallery image."""
    repo = GalleryImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    tag_repo = GalleryImageTagRepository(session)
    return tag_repo.get_tags_for_gallery_image(id)


class AddTagRequest(BaseModel):
    """Request model for adding a tag."""
    tag_name: str
    tag_color: Optional[str] = None


@router.post("/{id}/tags", response_model=Tag, status_code=201)
async def add_tag_to_gallery_image(
    id: int,
    request: AddTagRequest,
    session: Session = Depends(get_session),
):
    """Add a tag to a gallery image. Creates tag if it doesn't exist."""
    repo = GalleryImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    # Get or create tag
    tag_repo = TagRepository(session)
    tag = tag_repo.get_or_create(request.tag_name, request.tag_color)
    
    # Add tag to gallery image
    gallery_tag_repo = GalleryImageTagRepository(session)
    gallery_tag_repo.add_tag_to_gallery_image(id, tag.id)
    
    return tag


@router.delete("/{id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_gallery_image(
    id: int,
    tag_id: int,
    session: Session = Depends(get_session),
):
    """Remove a tag from a gallery image."""
    repo = GalleryImageRepository(session)
    image = repo.get(id)
    if not image:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    gallery_tag_repo = GalleryImageTagRepository(session)
    if not gallery_tag_repo.remove_tag_from_gallery_image(id, tag_id):
        raise HTTPException(status_code=404, detail="Tag not found on this gallery image")

