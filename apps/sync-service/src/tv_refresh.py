"""
TV state refresh logic - reconciles database with TV's actual state.
"""

import logging
import os
from pathlib import Path
from typing import Dict, List

from database_client import DatabaseClient
from samsungtvws.async_art import SamsungTVAsyncArt

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
        logger.info(f"Connecting to TV at {ip_address}:{port}")
        tv = SamsungTVAsyncArt(host=ip_address, port=port, token_file=token_file)
        logger.info("Starting listening to TV")
        await tv.start_listening()
        logger.info("Listening to TV started")

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
        logger.info(f"TV content list: {tv_content_list}")
        
        # Build a mapping of content_id to full metadata
        tv_content_metadata = {}
        for item in tv_content_list:
            content_id = item.get("content_id")
            if content_id:
                tv_content_metadata[content_id] = {
                    "category_id": item.get("category_id"),
                    "width": item.get("width"),
                    "height": item.get("height"),
                    "matte_id": item.get("matte_id"),
                    "portrait_matte_id": item.get("portrait_matte_id"),
                    "image_date": item.get("image_date"),
                    "content_type": item.get("content_type"),
                }
        
        tv_content_ids = list(tv_content_metadata.keys())
        logger.info(f"Found {len(tv_content_ids)} images on TV")

        # Get all mappings from database
        db_mappings = await db_client.get_tv_content_mappings(page=1, limit=1000)
        logger.info(f"Found {len(db_mappings)} mappings in database")
        db_tv_content_ids = {m["tv_content_id"]: m for m in db_mappings}
        logger.info(f"Found {len(db_tv_content_ids)} mappings in database")

        # Identify removed images (in DB but not on TV)
        removed = 0
        for tv_content_id, mapping in db_tv_content_ids.items():
            logger.info(f"Checking mapping for {tv_content_id}: {mapping}")
            if tv_content_id not in tv_content_ids:
                logger.info(f"Removing mapping for {tv_content_id} (no longer on TV)")
                try:
                    logger.info(f"Deleting mapping for {tv_content_id}")
                    await db_client.delete_tv_content_by_tv_id(tv_content_id)
                    logger.info(f"Deleted mapping for {tv_content_id}")
                    removed += 1
                except Exception as e:
                    logger.error(f"Failed to delete mapping for {tv_content_id}: {e}")

        # Identify manually uploaded images (on TV but not in DB)
        added = 0
        for tv_content_id in tv_content_ids:
            logger.info(f"Checking manual upload for {tv_content_id}")
            if tv_content_id not in db_tv_content_ids:
                logger.info(f"Adding manual upload for {tv_content_id}")
                try:
                    logger.info(f"Creating mapping for {tv_content_id}")
                    # Get TV metadata for this content
                    metadata = tv_content_metadata.get(tv_content_id, {})
                    mapping = {
                        "tv_content_id": tv_content_id,
                        "sync_status": "manual",
                        # Include TV metadata
                        "category_id": metadata.get("category_id"),
                        "width": metadata.get("width"),
                        "height": metadata.get("height"),
                        "matte_id": metadata.get("matte_id"),
                        "portrait_matte_id": metadata.get("portrait_matte_id"),
                        "image_date": metadata.get("image_date"),
                        "content_type": metadata.get("content_type"),
                    }
                    await db_client.create_tv_content_mapping(mapping)
                    logger.info(f"Created mapping for {tv_content_id}")
                    added += 1
                except Exception as e:
                    logger.error(f"Failed to create mapping for {tv_content_id}: {e}")

        # Update metadata for existing mappings
        updated = 0
        for tv_content_id in tv_content_ids:
            logger.info(f"Checking mapping for {tv_content_id}")
            if tv_content_id in db_tv_content_ids:
                logger.info(f"Updating mapping for {tv_content_id}")
                mapping = db_tv_content_ids[tv_content_id]
                try:
                    # Get TV metadata for this content
                    metadata = tv_content_metadata.get(tv_content_id, {})
                    update_data = {
                        # Update TV metadata
                        "category_id": metadata.get("category_id"),
                        "width": metadata.get("width"),
                        "height": metadata.get("height"),
                        "matte_id": metadata.get("matte_id"),
                        "portrait_matte_id": metadata.get("portrait_matte_id"),
                        "image_date": metadata.get("image_date"),
                        "content_type": metadata.get("content_type"),
                    }
                    await db_client.update_tv_content_mapping(
                        mapping["id"], update_data
                    )
                    logger.info(f"Updated mapping for {tv_content_id}")
                    updated += 1
                except Exception as e:
                    logger.error(f"Failed to update mapping for {tv_content_id}: {e}")

        # Download thumbnails
        logger.info("Downloading thumbnails...")
        try:
            logger.info("Clearing thumbnails directory")
            # Clear thumbnails directory
            for file in thumbnails_dir.glob("*"):
                if file.is_file():
                    logger.info(f"Deleting thumbnail: {file}")
                    file.unlink()
                    logger.info(f"Deleted thumbnail: {file}")

            # Get API version to determine which method to use
            api_version = await tv.get_api_version()
            api_version_int = int(api_version.replace(".", "")) if api_version else 0

            thumbnails = {}
            if api_version_int >= 4000:
                # Use get_thumbnail_list for newer API
                thumbnails = await tv.get_thumbnail_list(tv_content_ids)
                logger.info(f"Got {len(thumbnails)} thumbnails")
            else:
                # Use get_thumbnail for older API
                logger.info(f"Getting thumbnails for {len(tv_content_ids)} content IDs")
                if len(tv_content_ids) > 10:
                    logger.info("This may take a few minutes...")
                thumbnails = await tv.get_thumbnail(tv_content_ids, True)

            # Save thumbnails
            for filename, thumbnail_data in thumbnails.items():
                thumbnail_path = thumbnails_dir / filename
                logger.info(f"Saving thumbnail to {thumbnail_path}")
                with open(thumbnail_path, "wb") as f:
                    logger.info(f"Writing thumbnail to {thumbnail_path}")
                    if isinstance(thumbnail_data, bytes):
                        f.write(thumbnail_data)
                    else:
                        logger.info(f"Writing thumbnail to {thumbnail_path}")
                        f.write(thumbnail_data)
                    logger.info(f"Written thumbnail to {thumbnail_path}")

            logger.info(f"Downloaded {len(thumbnails)} thumbnails")
        except Exception as e:
            logger.error(f"Failed to download thumbnails: {e}")

        # Close TV connection
        await tv.close()
        logger.info("TV connection closed")

        # Count statistics
        logger.info("Counting statistics")
        all_mappings = await db_client.get_tv_content_mappings(page=1, limit=1000)
        logger.info(f"Found {len(all_mappings)} mappings in database")
        synced_via_app = sum(
            1 for m in all_mappings if m.get("gallery_image_id") is not None
        )
        logger.info(f"Found {synced_via_app} synced via app")
        manual_uploads = sum(
            1 for m in all_mappings if m.get("gallery_image_id") is None
        )
        logger.info(f"Found {manual_uploads} manual uploads")

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
