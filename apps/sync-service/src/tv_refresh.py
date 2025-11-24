"""
TV state refresh logic - reconciles database with TV's actual state.
"""

import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

from samsungtvws.async_art import SamsungTVAsyncArt
from database_client import DatabaseClient

logger = logging.getLogger(__name__)


def get_data_dir() -> Path:
    """Get the data directory."""
    script_dir = Path(__file__).parent.absolute()
    project_root = script_dir.parent.parent.parent
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_token_file_path() -> str:
    """Get the path to the TV token file."""
    token_file = get_data_dir() / "tv_token.txt"
    return str(token_file)


def get_thumbnails_dir() -> Path:
    """Get thumbnails directory."""
    thumbnails_dir = get_data_dir() / "tv-thumbnails"
    thumbnails_dir.mkdir(parents=True, exist_ok=True)
    return thumbnails_dir


async def refresh_tv_state(
    ip_address: str,
    port: int = 8002,
    category: str = "MY-C0002",
) -> Dict[str, int]:
    """
    Refresh TV state - reconcile database with TV's actual state.
    
    Returns:
        Dict with counts: {
            "removed": int,
            "added": int,
            "updated": int,
            "total_on_tv": int,
            "synced_via_app": int,
            "manual_uploads": int,
        }
    """
    db_client = DatabaseClient()
    token_file = get_token_file_path()
    thumbnails_dir = get_thumbnails_dir()
    
    try:
        # Connect to TV
        tv = SamsungTVAsyncArt(host=ip_address, port=port, token_file=token_file)
        await tv.start_listening()
        
        if not tv.is_alive():
            raise Exception("Failed to connect to TV")
        
        logger.info("Connected to TV successfully")
        
        # Check if TV is in art mode
        if not await tv.in_artmode():
            logger.warning("TV is not in art mode")
            await tv.close()
            raise Exception("TV is not in art mode")
        
        # Get current content IDs from TV
        logger.info(f"Querying TV for content in category {category}...")
        tv_content_list = await tv.available(category, timeout=10)
        tv_content_ids = [item.get("content_id") for item in tv_content_list if item.get("content_id")]
        logger.info(f"Found {len(tv_content_ids)} images on TV")
        
        # Get all mappings from database
        db_mappings = await db_client.get_tv_content_mappings(page=1, limit=10000)
        db_tv_content_ids = {m["tv_content_id"]: m for m in db_mappings}
        
        # Identify removed images (in DB but not on TV)
        removed = 0
        for tv_content_id, mapping in db_tv_content_ids.items():
            if tv_content_id not in tv_content_ids:
                logger.info(f"Removing mapping for {tv_content_id} (no longer on TV)")
                try:
                    await db_client.delete_tv_content_by_tv_id(tv_content_id)
                    removed += 1
                except Exception as e:
                    logger.error(f"Failed to delete mapping for {tv_content_id}: {e}")
        
        # Identify manually uploaded images (on TV but not in DB)
        added = 0
        for tv_content_id in tv_content_ids:
            if tv_content_id not in db_tv_content_ids:
                logger.info(f"Adding manual upload: {tv_content_id}")
                try:
                    mapping = {
                        "gallery_image_id": None,  # Manual upload
                        "tv_content_id": tv_content_id,
                        "uploaded_at": datetime.utcnow().isoformat(),
                        "last_verified_at": datetime.utcnow().isoformat(),
                        "sync_status": "manual",
                    }
                    await db_client.create_tv_content_mapping(mapping)
                    added += 1
                except Exception as e:
                    logger.error(f"Failed to create mapping for {tv_content_id}: {e}")
        
        # Update verified timestamps for existing mappings
        updated = 0
        for tv_content_id in tv_content_ids:
            if tv_content_id in db_tv_content_ids:
                mapping = db_tv_content_ids[tv_content_id]
                try:
                    update_data = {
                        "last_verified_at": datetime.utcnow().isoformat(),
                    }
                    await db_client.update_tv_content_mapping(mapping["id"], update_data)
                    updated += 1
                except Exception as e:
                    logger.error(f"Failed to update mapping for {tv_content_id}: {e}")
        
        # Download thumbnails
        logger.info("Downloading thumbnails...")
        try:
            # Clear thumbnails directory
            for file in thumbnails_dir.glob("*"):
                if file.is_file():
                    file.unlink()
            
            # Get API version to determine which method to use
            api_version = await tv.get_api_version()
            api_version_int = int(api_version.replace(".", "")) if api_version else 0
            
            thumbnails = {}
            if api_version_int >= 4000:
                # Use get_thumbnail_list for newer API
                thumbnails = await tv.get_thumbnail_list(tv_content_ids)
            else:
                # Use get_thumbnail for older API
                if len(tv_content_ids) > 10:
                    logger.info("This may take a few minutes...")
                thumbnails = await tv.get_thumbnail(tv_content_ids, True)
            
            # Save thumbnails
            for filename, thumbnail_data in thumbnails.items():
                thumbnail_path = thumbnails_dir / filename
                with open(thumbnail_path, "wb") as f:
                    if isinstance(thumbnail_data, bytes):
                        f.write(thumbnail_data)
                    else:
                        f.write(thumbnail_data)
            
            logger.info(f"Downloaded {len(thumbnails)} thumbnails")
        except Exception as e:
            logger.error(f"Failed to download thumbnails: {e}")
        
        # Close TV connection
        await tv.close()
        
        # Count statistics
        all_mappings = await db_client.get_tv_content_mappings(page=1, limit=10000)
        synced_via_app = sum(1 for m in all_mappings if m.get("gallery_image_id") is not None)
        manual_uploads = sum(1 for m in all_mappings if m.get("gallery_image_id") is None)
        
        result = {
            "removed": removed,
            "added": added,
            "updated": updated,
            "total_on_tv": len(tv_content_ids),
            "synced_via_app": synced_via_app,
            "manual_uploads": manual_uploads,
        }
        
        logger.info(
            f"TV state refresh complete: {result['total_on_tv']} on TV "
            f"({result['synced_via_app']} synced via app, "
            f"{result['manual_uploads']} manual), "
            f"{removed} removed, {added} added, {updated} updated"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"TV state refresh failed: {e}")
        raise
    finally:
        await db_client.close()

