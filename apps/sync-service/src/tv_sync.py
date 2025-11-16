"""
TV synchronization logic using samsungtvws library.
"""

import os
import logging
from pathlib import Path
from typing import Tuple

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize TV mocking if MOCK_TV is enabled
# This must happen before importing SamsungTVWS
if os.getenv("MOCK_TV", "").lower() == "true":
    from tv_mock import setup_tv_mock  # type: ignore

    setup_tv_mock()

from samsungtvws import SamsungTVWS  # noqa: E402


def get_token_file_path() -> str:
    """
    Get the path to the TV token file.
    Resolves relative to project root: ../../data/tv_token.txt

    In test mode (MOCK_TV=true), uses a test-specific path to avoid
    interfering with real user data.
    """
    # Use test-specific token file when mocking
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.absolute()
    # Go up three levels to project root, then to data directory
    project_root = script_dir.parent.parent.parent

    data_dir = project_root / "data"
    if os.getenv("MOCK_TV", "").lower() == "true":
        logger.info("Running with MOCK_TV")
        data_dir = data_dir / ".test"
        data_dir.mkdir(parents=True, exist_ok=True)

    token_file = data_dir / "tv_token.txt"
    if not token_file.parent.exists():
        token_file.parent.mkdir(parents=True, exist_ok=True)
    return str(token_file)


def create_tv_connection(ip_address: str, port: int = 8002) -> SamsungTVWS:
    """
    Create a SamsungTVWS connection instance.

    Args:
        ip_address: TV IP address
        port: TV port (default: 8002)

    Returns:
        SamsungTVWS instance
    """
    token_file = get_token_file_path()
    logger.info(
        f"Connecting to TV at {ip_address}:{port} with token file: {token_file}"
    )
    return SamsungTVWS(host=ip_address, port=port, token_file=token_file)


def sync_images_to_tv(
    image_paths: list[str], ip_address: str, port: int = 8002
) -> Tuple[bool, list[str], list[dict], int, int]:
    """
    Sync images to TV.

    Args:
        image_paths: List of full file paths to images
        ip_address: TV IP address
        port: TV port (default: 8002)

    Returns:
        Tuple of (success, synced_filenames, failed_images, total, successful_count)
        failed_images is a list of dicts with 'filename' and 'error' keys
    """
    synced = []
    failed = []

    try:
        tv = create_tv_connection(ip_address, port)

        # Turn on Art Mode
        try:
            tv.art().set_artmode(True)
            logger.info("Art Mode turned on")
        except Exception as e:
            logger.warning(f"Could not set Art Mode (might already be on): {e}")

        # Upload each image
        for image_path in image_paths:
            image_path_obj = Path(image_path)
            filename = image_path_obj.name

            if not image_path_obj.exists():
                error_msg = f"File not found: {image_path}"
                logger.error(error_msg)
                failed.append({"filename": filename, "error": error_msg})
                continue

            try:
                logger.info(f"Uploading {filename} with matte='none'...")

                # Read image data
                with open(image_path, "rb") as f:
                    image_data = f.read()

                # Determine file type
                file_ext = image_path_obj.suffix.lower()
                if file_ext in (".jpg", ".jpeg"):
                    file_type = "JPEG"
                elif file_ext == ".png":
                    file_type = "PNG"
                else:
                    error_msg = f"Unsupported file type: {file_ext}"
                    logger.error(error_msg)
                    failed.append({"filename": filename, "error": error_msg})
                    continue

                # Upload image with matte='none'
                tv.art().upload(image_data, file_type=file_type, matte="none")

                logger.info(f"Successfully uploaded {filename}")
                synced.append(filename)

            except Exception as e:
                error_msg = f"Failed to upload {filename}: {str(e)}"
                logger.error(error_msg)
                failed.append({"filename": filename, "error": str(e)})

        total = len(image_paths)
        successful = len(synced)
        overall_success = successful > 0

        return (overall_success, synced, failed, total, successful)

    except Exception as e:
        error_msg = f"Sync operation failed: {str(e)}"
        logger.error(error_msg)
        # Mark all images as failed
        for image_path in image_paths:
            filename = Path(image_path).name
            failed.append({"filename": filename, "error": error_msg})

        return (False, [], failed, len(image_paths), 0)
