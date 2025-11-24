"""
Smart sync modes for TV synchronization with database tracking.
"""

import os
import logging
from pathlib import Path
from typing import List, Tuple, Dict
from datetime import datetime

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


def get_file_type(file_path: Path) -> str:
    """Get the file type from extension."""
    ext = file_path.suffix.lower()
    if ext in [".jpg", ".jpeg"]:
        return "jpeg"
    elif ext == ".png":
        return "png"
    elif ext == ".bmp":
        return "bmp"
    elif ext == ".tif":
        return "tif"
    return ext[1:] if ext else "jpeg"


async def upload_file(
    tv: SamsungTVAsyncArt, file_path: Path, matte: str = "none"
) -> str | None:
    """Upload a single file to TV. Returns content_id on success."""
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()

        file_type = get_file_type(file_path)
        if not file_type:
            logger.error(f"Unsupported file type: {file_path}")
            return None

        logger.info(f"Uploading {file_path.name} to TV...")
        content_id = await tv.upload(
            file_data, file_type=file_type, matte=matte, portrait_matte=matte
        )

        if content_id:
            logger.info(f"Successfully uploaded {file_path.name} as {content_id}")
            return content_id
        else:
            logger.warning(f"Upload returned no content_id for {file_path.name}")
            return None

    except Exception as e:
        logger.error(f"Failed to upload {file_path.name}: {e}")
        return None


async def sync_add_mode(
    gallery_image_ids: List[int],
    ip_address: str,
    port: int = 8002,
) -> Tuple[bool, List[str], List[Dict[str, str]], int, int]:
    """
    Add Mode: Upload only new gallery images that don't already exist on TV.
    Preserves all existing images on TV (including manually uploaded).
    
    Returns:
        Tuple of (success, synced_filenames, failed_images, total, successful_count)
    """
    db_client = DatabaseClient()
    token_file = get_token_file_path()
    synced = []
    failed = []
    
    try:
        # Get gallery images from database
        gallery_images = []
        for gallery_image_id in gallery_image_ids:
            image = await db_client.get_gallery_image(gallery_image_id)
            if image:
                gallery_images.append(image)
            else:
                failed.append({
                    "filename": f"ID:{gallery_image_id}",
                    "error": "Gallery image not found in database"
                })
        
        if not gallery_images:
            return (False, [], failed, len(gallery_image_ids), 0)
        
        # Check which images are already on TV
        images_to_upload = []
        for image in gallery_images:
            mapping = await db_client.get_tv_content_by_gallery_image_id(image["id"])
            if not mapping:
                images_to_upload.append(image)
        
        if not images_to_upload:
            logger.info("All selected images are already on TV")
            return (True, [], [], len(gallery_image_ids), 0)
        
        # Connect to TV
        tv = SamsungTVAsyncArt(host=ip_address, port=port, token_file=token_file)
        await tv.start_listening()
        
        if not tv.is_alive():
            raise Exception("Failed to connect to TV")
        
        if not await tv.in_artmode():
            await tv.close()
            raise Exception("TV is not in art mode")
        
        # Upload new images
        data_dir = get_data_dir()
        for image in images_to_upload:
            # Construct full filepath
            relative_path = image["filepath"]
            file_path = data_dir / relative_path
            
            if not file_path.exists():
                failed.append({
                    "filename": image["filename"],
                    "error": "File not found"
                })
                continue
            
            # Upload to TV
            content_id = await upload_file(tv, file_path, matte="none")
            
            if content_id:
                # Create TVContentMapping record
                try:
                    mapping = {
                        "gallery_image_id": image["id"],
                        "tv_content_id": content_id,
                        "uploaded_at": datetime.utcnow().isoformat(),
                        "last_verified_at": datetime.utcnow().isoformat(),
                        "sync_status": "synced",
                    }
                    await db_client.create_tv_content_mapping(mapping)
                    synced.append(image["filename"])
                except Exception as e:
                    logger.error(f"Failed to create mapping for {image['filename']}: {e}")
                    failed.append({
                        "filename": image["filename"],
                        "error": f"Failed to save mapping: {e}"
                    })
            else:
                failed.append({
                    "filename": image["filename"],
                    "error": "Upload failed"
                })
        
        # Apply slideshow settings before closing
        await apply_slideshow_settings(db_client, tv, ip_address, port)
        
        await tv.close()
        
        return (
            len(synced) > 0,
            synced,
            failed,
            len(gallery_image_ids),
            len(synced),
        )
        
    except Exception as e:
        logger.error(f"Add mode sync failed: {e}")
        return (False, synced, failed, len(gallery_image_ids), len(synced))
    finally:
        await db_client.close()


async def sync_reset_mode(
    gallery_image_ids: List[int],
    ip_address: str,
    port: int = 8002,
) -> Tuple[bool, List[str], List[Dict[str, str]], int, int]:
    """
    Reset Mode: Delete gallery images from TV that are no longer in selection,
    upload new gallery images that aren't on TV, keep overlapping ones.
    Preserves manually uploaded images (gallery_image_id is null).
    
    Returns:
        Tuple of (success, synced_filenames, failed_images, total, successful_count)
    """
    db_client = DatabaseClient()
    token_file = get_token_file_path()
    synced = []
    failed = []
    
    try:
        # Get gallery images from database
        gallery_images = []
        for gallery_image_id in gallery_image_ids:
            image = await db_client.get_gallery_image(gallery_image_id)
            if image:
                gallery_images.append(image)
            else:
                failed.append({
                    "filename": f"ID:{gallery_image_id}",
                    "error": "Gallery image not found in database"
                })
        
        # Get all app-managed mappings (gallery_image_id is not null)
        all_mappings = await db_client.get_tv_content_mappings(page=1, limit=10000)
        app_managed_mappings = [
            m for m in all_mappings if m.get("gallery_image_id") is not None
        ]
        
        # Identify mappings to delete (not in selection)
        selected_gallery_ids = {img["id"] for img in gallery_images}
        mappings_to_delete = [
            m for m in app_managed_mappings
            if m["gallery_image_id"] not in selected_gallery_ids
        ]
        
        # Identify images to upload (not on TV)
        existing_gallery_ids = {m["gallery_image_id"] for m in app_managed_mappings}
        images_to_upload = [
            img for img in gallery_images
            if img["id"] not in existing_gallery_ids
        ]
        
        # Connect to TV
        tv = SamsungTVAsyncArt(host=ip_address, port=port, token_file=token_file)
        await tv.start_listening()
        
        if not tv.is_alive():
            raise Exception("Failed to connect to TV")
        
        if not await tv.in_artmode():
            await tv.close()
            raise Exception("TV is not in art mode")
        
        # Delete unwanted images
        if mappings_to_delete:
            logger.info(f"Deleting {len(mappings_to_delete)} images from TV")
            content_ids_to_delete = [m["tv_content_id"] for m in mappings_to_delete]
            try:
                await tv.delete_list(content_ids_to_delete)
                # Delete mappings from database
                for mapping in mappings_to_delete:
                    try:
                        await db_client.delete_tv_content_mapping(mapping["id"])
                    except Exception as e:
                        logger.error(f"Failed to delete mapping {mapping['id']}: {e}")
            except Exception as e:
                logger.error(f"Failed to delete images from TV: {e}")
        
        # Upload new images
        data_dir = get_data_dir()
        for image in images_to_upload:
            relative_path = image["filepath"]
            file_path = data_dir / relative_path
            
            if not file_path.exists():
                failed.append({
                    "filename": image["filename"],
                    "error": "File not found"
                })
                continue
            
            # Upload to TV
            content_id = await upload_file(tv, file_path, matte="none")
            
            if content_id:
                # Create TVContentMapping record
                try:
                    mapping = {
                        "gallery_image_id": image["id"],
                        "tv_content_id": content_id,
                        "uploaded_at": datetime.utcnow().isoformat(),
                        "last_verified_at": datetime.utcnow().isoformat(),
                        "sync_status": "synced",
                    }
                    await db_client.create_tv_content_mapping(mapping)
                    synced.append(image["filename"])
                except Exception as e:
                    logger.error(f"Failed to create mapping for {image['filename']}: {e}")
                    failed.append({
                        "filename": image["filename"],
                        "error": f"Failed to save mapping: {e}"
                    })
            else:
                failed.append({
                    "filename": image["filename"],
                    "error": "Upload failed"
                })
        
        # Apply slideshow settings before closing
        await apply_slideshow_settings(db_client, tv, ip_address, port)
        
        await tv.close()
        
        return (
            len(synced) > 0 or len(mappings_to_delete) > 0,
            synced,
            failed,
            len(gallery_image_ids),
            len(synced),
        )
        
    except Exception as e:
        logger.error(f"Reset mode sync failed: {e}")
        return (False, synced, failed, len(gallery_image_ids), len(synced))
    finally:
        await db_client.close()


async def apply_slideshow_settings(
    db_client: DatabaseClient,
    tv: SamsungTVAsyncArt,
    ip_address: str,
    port: int,
) -> None:
    """Apply slideshow settings after sync."""
    try:
        settings = await db_client.get_settings()
        slideshow_enabled = settings.get("slideshow_enabled", False)
        slideshow_duration = settings.get("slideshow_duration", 10)
        slideshow_type = settings.get("slideshow_type", "slideshow")
        
        if slideshow_enabled:
            # type: True for "shuffleslideshow", False for "slideshow"
            slideshow_bool = slideshow_type == "shuffleslideshow"
            await tv.set_slideshow_status(
                slideshow_duration, slideshow_bool, category=2
            )
            logger.info(
                f"Applied slideshow: duration={slideshow_duration}min, "
                f"type={slideshow_type}"
            )
        else:
            # Turn off slideshow
            await tv.set_slideshow_status(0, False, category=2)
            logger.info("Slideshow disabled")
    except Exception as e:
        logger.warning(f"Failed to apply slideshow settings: {e}")

