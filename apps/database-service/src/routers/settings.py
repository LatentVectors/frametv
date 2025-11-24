"""
API router for Settings endpoints.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel

from database import get_session
from models import Settings
from repositories import SettingsRepository

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    """Response model for all settings."""
    settings: Dict[str, Any]


class SettingValue(BaseModel):
    """Setting value model."""
    value: Any


@router.get("", response_model=SettingsResponse)
async def get_all_settings(
    session: Session = Depends(get_session),
):
    """Get all settings."""
    repo = SettingsRepository(session)
    settings_dict = repo.get_all_dict()
    return SettingsResponse(settings=settings_dict)


@router.get("/{key}", response_model=SettingValue)
async def get_setting(
    key: str,
    session: Session = Depends(get_session),
):
    """Get a setting by key."""
    repo = SettingsRepository(session)
    value = repo.get_value(key)
    if value is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return SettingValue(value=value)


@router.put("/{key}", response_model=Settings)
async def update_setting(
    key: str,
    setting_value: SettingValue,
    session: Session = Depends(get_session),
):
    """Update or create a setting."""
    repo = SettingsRepository(session)
    return repo.set_value(key, setting_value.value)

