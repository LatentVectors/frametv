"""
API routers.
"""

from .source_images import router as source_images_router
from .gallery_images import router as gallery_images_router
from .tv_content import router as tv_content_router
from .settings import router as settings_router
from .tags import router as tags_router

__all__ = [
    "source_images_router",
    "gallery_images_router",
    "tv_content_router",
    "settings_router",
    "tags_router",
]
