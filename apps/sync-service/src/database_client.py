"""
Client for communicating with Database Service.
"""

import os
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

DATABASE_SERVICE_URL = os.getenv("DATABASE_SERVICE_URL", "http://localhost:8001")


class DatabaseClient:
    """Client for Database Service API."""

    def __init__(self, base_url: str = DATABASE_SERVICE_URL):
        """Initialize database client."""
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(base_url=base_url, timeout=30.0)

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

    async def get_tv_content_mappings(
        self, page: int = 1, limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get all TV content mappings."""
        response = await self.client.get(
            f"/tv-content?page={page}&limit={limit}"
        )
        response.raise_for_status()
        data = response.json()
        return data.get("items", [])

    async def get_tv_content_by_gallery_image_id(
        self, gallery_image_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get TV content mapping by gallery image ID."""
        try:
            response = await self.client.get(
                f"/tv-content/by-gallery-image/{gallery_image_id}"
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            return None

    async def get_tv_content_by_tv_id(
        self, tv_content_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get TV content mapping by TV content ID."""
        try:
            response = await self.client.get(
                f"/tv-content/by-tv-id/{tv_content_id}"
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            return None

    async def create_tv_content_mapping(self, mapping: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new TV content mapping."""
        response = await self.client.post("/tv-content", json=mapping)
        response.raise_for_status()
        return response.json()

    async def update_tv_content_mapping(
        self, id: int, mapping: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a TV content mapping."""
        response = await self.client.put(f"/tv-content/{id}", json=mapping)
        response.raise_for_status()
        return response.json()

    async def delete_tv_content_mapping(self, id: int) -> None:
        """Delete a TV content mapping by ID."""
        response = await self.client.delete(f"/tv-content/{id}")
        response.raise_for_status()

    async def delete_tv_content_by_tv_id(self, tv_content_id: str) -> None:
        """Delete TV content mapping by TV content ID."""
        response = await self.client.delete(f"/tv-content/by-tv-id/{tv_content_id}")
        response.raise_for_status()

    async def get_gallery_image(self, id: int) -> Optional[Dict[str, Any]]:
        """Get gallery image by ID."""
        try:
            response = await self.client.get(f"/gallery-images/{id}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            return None

    async def get_settings(self) -> Dict[str, Any]:
        """Get all settings."""
        response = await self.client.get("/settings")
        response.raise_for_status()
        data = response.json()
        return data.get("settings", {})

    async def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting value by key."""
        try:
            response = await self.client.get(f"/settings/{key}")
            response.raise_for_status()
            data = response.json()
            return data.get("value", default)
        except httpx.HTTPStatusError:
            return default

