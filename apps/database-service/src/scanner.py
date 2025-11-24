"""
Album directory scanner for populating SourceImage records.
"""

import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict
from sqlmodel import Session
from PIL import Image
from PIL.ExifTags import TAGS

from models import SourceImage
from repositories import SourceImageRepository

logger = logging.getLogger(__name__)

# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}


def extract_exif_date(filepath: Path) -> datetime | None:
    """Extract date_taken from EXIF data."""
    try:
        with Image.open(filepath) as img:
            exif = img._getexif()
            if exif is not None:
                # Look for DateTime or DateTimeOriginal
                for tag_id, value in exif.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag in ("DateTime", "DateTimeOriginal", "DateTimeDigitized"):
                        try:
                            # Parse EXIF datetime format: "YYYY:MM:DD HH:MM:SS"
                            dt_str = str(value)
                            return datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S")
                        except (ValueError, AttributeError):
                            continue
    except Exception as e:
        logger.debug(f"Failed to extract EXIF from {filepath}: {e}")

    return None


def scan_albums_directory(
    albums_path: Path,
    data_path: Path,
    session: Session,
) -> Dict[str, int]:
    """
    Scan albums directory and sync with SourceImage table.

    Returns:
        Dict with counts: {"scanned": int, "added": int, "updated": int, "deleted": int}
    """
    repo = SourceImageRepository(session)

    scanned = 0
    added = 0
    updated = 0
    deleted = 0

    # Get all existing source images
    existing_images: Dict[str, SourceImage] = {}
    for image in repo.get_all(skip=0, limit=10000):  # Get all
        existing_images[image.filepath] = image

    # Walk albums directory
    if not albums_path.exists():
        logger.warning(f"Albums directory does not exist: {albums_path}")
        return {"scanned": 0, "added": 0, "updated": 0, "deleted": 0}

    # Track which filepaths we've seen
    seen_filepaths = set()

    for root, dirs, files in os.walk(albums_path):
        for filename in files:
            filepath = Path(root) / filename

            # Check if it's an image
            if filepath.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            scanned += 1

            # Get relative path from data directory
            try:
                relative_path = filepath.relative_to(data_path)
                filepath_str = str(relative_path).replace("\\", "/")
            except ValueError:
                # File is not under data_path, skip it
                logger.warning(
                    f"File {filepath} is not under data directory {data_path}"
                )
                continue

            seen_filepaths.add(filepath_str)

            # Extract EXIF date
            date_taken = extract_exif_date(filepath)

            # Check if record exists
            if filepath_str in existing_images:
                # Update existing record
                existing = existing_images[filepath_str]
                if existing.is_deleted:
                    existing.is_deleted = False
                    added += 1  # Count as added if it was deleted
                else:
                    updated += 1

                # Update metadata if changed
                if existing.date_taken != date_taken:
                    existing.date_taken = date_taken

                existing.updated_at = datetime.utcnow()
                repo.update(existing)
            else:
                # Create new record
                new_image = SourceImage(
                    filename=filename,
                    filepath=filepath_str,
                    date_taken=date_taken,
                    is_deleted=False,
                )
                repo.create(new_image)
                added += 1

    # Mark missing files as deleted (but don't delete if referenced)
    for filepath_str, image in existing_images.items():
        if filepath_str not in seen_filepaths and not image.is_deleted:
            # Check if referenced in ImageSlot (would need to query, but for now just mark deleted)
            image.is_deleted = True
            image.updated_at = datetime.utcnow()
            repo.update(image)
            deleted += 1

    logger.info(
        f"Album scan complete: {scanned} scanned, {added} added, "
        f"{updated} updated, {deleted} marked deleted"
    )

    return {
        "scanned": scanned,
        "added": added,
        "updated": updated,
        "deleted": deleted,
    }
