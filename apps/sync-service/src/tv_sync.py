"""
TV synchronization logic using samsungtvws async library.
Follows the pattern from async_art_update_from_directory.py
"""

import os
import json
import logging
from pathlib import Path
from typing import Tuple

# Optional PIL support for automatic synchronization
HAVE_PIL = False
try:
    from PIL import Image, ImageFilter, ImageChops
    import io

    HAVE_PIL = True
except ImportError:
    pass

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize TV mocking if MOCK_TV is enabled
if os.getenv("MOCK_TV", "").lower() == "true":
    from tv_mock import setup_tv_mock  # type: ignore

    setup_tv_mock()

from samsungtvws.async_art import SamsungTVAsyncArt  # noqa: E402


def get_data_dir() -> Path:
    """Get the data directory for storing sync state."""
    script_dir = Path(__file__).parent.absolute()
    project_root = script_dir.parent.parent.parent
    data_dir = project_root / "data"

    if os.getenv("MOCK_TV", "").lower() == "true":
        logger.info("Running with MOCK_TV")
        data_dir = data_dir / ".test"

    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_token_file_path() -> str:
    """Get the path to the TV token file."""
    token_file = get_data_dir() / "tv_token.txt"
    return str(token_file)


def get_uploaded_files_path() -> str:
    """Get the path to the uploaded files tracking JSON."""
    return str(get_data_dir() / "uploaded_files.json")


def load_uploaded_files() -> dict:
    """Load the uploaded files tracking data."""
    path = get_uploaded_files_path()
    if os.path.isfile(path):
        with open(path, "r") as f:
            data = json.load(f)
            return data.get("uploaded_files", {})
    return {}


def save_uploaded_files(uploaded_files: dict):
    """Save the uploaded files tracking data."""
    path = get_uploaded_files_path()
    with open(path, "w") as f:
        json.dump({"uploaded_files": uploaded_files}, f, indent=2)
    logger.info(f"Saved {len(uploaded_files)} tracked files to {path}")


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
    return ext[1:] if ext else None


def get_last_modified(file_path: Path) -> float:
    """Get the last modified timestamp for a file."""
    return os.path.getmtime(file_path)


async def get_tv_content(tv: SamsungTVAsyncArt, category="MY-C0002") -> list:
    """Get content_id list from TV (MY-C0002 = My Photos)."""
    try:
        result = [v["content_id"] for v in await tv.available(category, timeout=10)]
        return result
    except Exception as e:
        logger.warning(f"Failed to get contents from TV: {e}")
        return None


async def sync_file_list(tv: SamsungTVAsyncArt, uploaded_files: dict) -> dict:
    """Sync uploaded_files with what's actually on the TV."""
    my_photos = await get_tv_content(tv, "MY-C0002")
    if my_photos is not None:
        # Remove entries that are no longer on TV
        uploaded_files = {
            k: v for k, v in uploaded_files.items() if v["content_id"] in my_photos
        }
    return uploaded_files


async def remove_files_from_tv(tv: SamsungTVAsyncArt, content_ids: list):
    """Remove files from TV by content_id."""
    if content_ids:
        logger.info(f"Removing {len(content_ids)} files from TV: {content_ids}")
        await tv.delete_list(content_ids)


async def upload_file(tv: SamsungTVAsyncArt, file_path: Path, matte="none") -> str:
    """
    Upload a single file to TV.
    Returns content_id on success, None on failure.
    """
    try:
        # Read file data
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


async def sync_images_to_tv(
    image_paths: list[str], ip_address: str, port: int = 8002
) -> Tuple[bool, list[str], list[dict], int, int]:
    """
    Sync images to TV using the async approach.
    - Tracks uploaded files with content_ids
    - Removes files from TV that are no longer in the list
    - Adds new files to TV
    - Updates modified files (removes old, uploads new)

    Args:
        image_paths: List of full file paths to images
        ip_address: TV IP address
        port: TV port (default: 8002)

    Returns:
        Tuple of (success, synced_filenames, failed_images, total, successful_count)
    """
    synced = []
    failed = []

    try:
        token_file = get_token_file_path()
        logger.info(f"Connecting to TV at {ip_address}:{port}")

        tv = SamsungTVAsyncArt(host=ip_address, port=port, token_file=token_file)

        # Start connection
        await tv.start_listening()
        if not tv.is_alive():
            raise Exception("Failed to connect to TV")

        logger.info("Connected to TV successfully")

        # Check if TV is in art mode - critical check from example
        if not await tv.in_artmode():
            logger.warning("TV is not in art mode, cannot sync")
            await tv.close()
            return (
                False,
                [],
                [{"filename": "N/A", "error": "TV is not in art mode"}],
                len(image_paths),
                0,
            )

        # Load tracking data
        uploaded_files = load_uploaded_files()
        logger.info(f"Loaded {len(uploaded_files)} previously tracked files")

        # Sync with TV to remove stale entries
        uploaded_files = await sync_file_list(tv, uploaded_files)

        # Convert image_paths to Path objects and create lookup dict
        current_files = {}
        for img_path in image_paths:
            path_obj = Path(img_path)
            if path_obj.exists():
                current_files[path_obj.name] = path_obj
            else:
                logger.warning(f"File not found: {img_path}")
                failed.append({"filename": path_obj.name, "error": "File not found"})

        # 1. Remove files from TV that are no longer in the list
        files_to_remove = [
            v["content_id"] for k, v in uploaded_files.items() if k not in current_files
        ]
        if files_to_remove:
            logger.info(f"Removing {len(files_to_remove)} files no longer in list")
            await remove_files_from_tv(tv, files_to_remove)
            # Sync again after deletion to update tracking (per example)
            uploaded_files = await sync_file_list(tv, uploaded_files)

        # 2. Add new files
        new_files = [
            filename
            for filename in current_files.keys()
            if filename not in uploaded_files
        ]
        if new_files:
            logger.info(f"Adding {len(new_files)} new files to TV")
            for filename in new_files:
                file_path = current_files[filename]
                content_id = await upload_file(tv, file_path, matte="none")
                if content_id:
                    uploaded_files[filename] = {
                        "content_id": content_id,
                        "modified": get_last_modified(file_path),
                    }
                    synced.append(filename)
                else:
                    failed.append({"filename": filename, "error": "Upload failed"})

        # 3. Update modified files
        modified_files = [
            filename
            for filename in current_files.keys()
            if filename in uploaded_files
            and uploaded_files[filename].get("modified")
            != get_last_modified(current_files[filename])
        ]
        if modified_files:
            logger.info(f"Updating {len(modified_files)} modified files")
            for filename in modified_files:
                # Remove old version from TV
                old_content_id = uploaded_files[filename]["content_id"]
                await remove_files_from_tv(tv, [old_content_id])

                # Upload new version
                file_path = current_files[filename]
                content_id = await upload_file(tv, file_path, matte="none")
                if content_id:
                    uploaded_files[filename] = {
                        "content_id": content_id,
                        "modified": get_last_modified(file_path),
                    }
                    synced.append(filename)
                else:
                    # Remove from tracking if upload failed
                    del uploaded_files[filename]
                    failed.append({"filename": filename, "error": "Update failed"})

            # Sync again after updates to refresh tracking
            uploaded_files = await sync_file_list(tv, uploaded_files)

        # Save tracking data
        save_uploaded_files(uploaded_files)

        # Close connection
        await tv.close()

        total = len(image_paths)
        successful = len(synced)
        overall_success = successful > 0 or (total == len(uploaded_files))

        logger.info(f"Sync complete: {successful} uploaded, {len(failed)} failed")

        return (overall_success, synced, failed, total, successful)

    except Exception as e:
        error_msg = f"Sync operation failed: {str(e)}"
        logger.error(error_msg)

        # Mark all as failed
        for image_path in image_paths:
            filename = Path(image_path).name
            if filename not in synced:
                failed.append({"filename": filename, "error": error_msg})

        return (False, synced, failed, len(image_paths), len(synced))
