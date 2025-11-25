"""
API router for Tag endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from pydantic import BaseModel

from database import get_session
from models import Tag
from repositories import TagRepository

router = APIRouter(prefix="/tags", tags=["tags"])


class TagCreate(BaseModel):
    """Tag creation request model."""
    name: str
    color: Optional[str] = None


class TagUpdate(BaseModel):
    """Tag update request model."""
    name: Optional[str] = None
    color: Optional[str] = None


@router.get("", response_model=List[Tag])
async def list_tags(
    search: Optional[str] = Query(None, description="Search tags by name prefix"),
    session: Session = Depends(get_session),
):
    """List all tags, optionally filtered by name search."""
    repo = TagRepository(session)
    
    if search:
        return repo.search_by_name(search)
    
    return repo.get_all_sorted()


@router.get("/{id}", response_model=Tag)
async def get_tag(
    id: int,
    session: Session = Depends(get_session),
):
    """Get a single tag by ID."""
    repo = TagRepository(session)
    tag = repo.get(id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.post("", response_model=Tag, status_code=201)
async def create_tag(
    request: TagCreate,
    session: Session = Depends(get_session),
):
    """Create a new tag or return existing if name already exists."""
    repo = TagRepository(session)
    
    # Check if tag with same name exists
    existing = repo.get_by_name(request.name)
    if existing:
        return existing
    
    tag = Tag(name=request.name, color=request.color)
    return repo.create(tag)


@router.put("/{id}", response_model=Tag)
async def update_tag(
    id: int,
    request: TagUpdate,
    session: Session = Depends(get_session),
):
    """Update a tag."""
    repo = TagRepository(session)
    tag = repo.get(id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    if request.name is not None:
        # Check if new name conflicts with existing tag
        existing = repo.get_by_name(request.name)
        if existing and existing.id != id:
            raise HTTPException(status_code=400, detail="Tag with this name already exists")
        tag.name = request.name
    
    if request.color is not None:
        tag.color = request.color
    
    return repo.update(tag)

