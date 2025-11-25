"""
Album directory scanner for populating SourceImage records.
"""

import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from sqlmodel import Session
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from models import SourceImage, EXIFMetadata
from repositories import SourceImageRepository

logger = logging.getLogger(__name__)

# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}


def _convert_to_float(value: Any) -> Optional[float]:
    """Convert various EXIF value types to float."""
    try:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, tuple) and len(value) == 2:
            # Rational number as tuple (numerator, denominator)
            if value[1] != 0:
                return float(value[0]) / float(value[1])
        return float(value)
    except (ValueError, TypeError, ZeroDivisionError):
        return None


def _convert_to_int(value: Any) -> Optional[int]:
    """Convert various EXIF value types to int."""
    try:
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, tuple) and len(value) == 2:
            # Rational number as tuple (numerator, denominator)
            if value[1] != 0:
                return int(float(value[0]) / float(value[1]))
        return int(value)
    except (ValueError, TypeError, ZeroDivisionError):
        return None


def _convert_exif_date(value: Any) -> Optional[str]:
    """Convert EXIF date string to ISO 8601 format."""
    try:
        if value is None:
            return None
        dt_str = str(value)
        # Parse EXIF datetime format: "YYYY:MM:DD HH:MM:SS"
        dt = datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S")
        return dt.isoformat()
    except (ValueError, AttributeError):
        return None


def _dms_to_decimal(dms: tuple, ref: str) -> Optional[float]:
    """
    Convert GPS coordinates from degrees/minutes/seconds to decimal degrees.
    
    Args:
        dms: Tuple of (degrees, minutes, seconds) - each can be tuple (num, denom) or float
        ref: Direction reference ('N', 'S', 'E', 'W')
    
    Returns:
        Decimal degrees (negative for S and W)
    """
    try:
        if not dms or len(dms) < 3:
            return None
        
        # Extract values, handling both tuple (rational) and float formats
        def get_value(v):
            if isinstance(v, tuple) and len(v) == 2:
                return float(v[0]) / float(v[1]) if v[1] != 0 else 0
            return float(v)
        
        degrees = get_value(dms[0])
        minutes = get_value(dms[1])
        seconds = get_value(dms[2])
        
        decimal = degrees + minutes / 60 + seconds / 3600
        
        if ref in ('S', 'W'):
            decimal = -decimal
        
        return decimal
    except (ValueError, TypeError, ZeroDivisionError, IndexError):
        return None


def extract_full_exif_metadata(filepath: Path) -> EXIFMetadata:
    """
    Extract all available EXIF metadata from an image file.
    
    Args:
        filepath: Path to the image file
    
    Returns:
        EXIFMetadata Pydantic model (may be empty if no EXIF data)
    """
    metadata = EXIFMetadata()
    
    try:
        with Image.open(filepath) as img:
            exif = img._getexif()
            if exif is None:
                logger.debug(f"No EXIF data in {filepath}")
                return metadata
            
            # Map tag IDs to names
            exif_data: Dict[str, Any] = {}
            gps_data: Dict[str, Any] = {}
            
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                
                if tag == "GPSInfo":
                    # Process GPS data separately
                    if isinstance(value, dict):
                        for gps_tag_id, gps_value in value.items():
                            gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                            gps_data[gps_tag] = gps_value
                else:
                    exif_data[tag] = value
            
            # Camera/Device Information
            try:
                if "Make" in exif_data:
                    metadata.make = str(exif_data["Make"]).strip('\x00')
            except Exception:
                pass
            
            try:
                if "Model" in exif_data:
                    metadata.model = str(exif_data["Model"]).strip('\x00')
            except Exception:
                pass
            
            try:
                if "Software" in exif_data:
                    metadata.software = str(exif_data["Software"]).strip('\x00')
            except Exception:
                pass
            
            try:
                if "LensMake" in exif_data:
                    metadata.lens_make = str(exif_data["LensMake"]).strip('\x00')
            except Exception:
                pass
            
            try:
                if "LensModel" in exif_data:
                    metadata.lens_model = str(exif_data["LensModel"]).strip('\x00')
            except Exception:
                pass
            
            # Date/Time Information
            try:
                if "DateTimeOriginal" in exif_data:
                    metadata.date_time_original = _convert_exif_date(exif_data["DateTimeOriginal"])
            except Exception:
                pass
            
            try:
                if "DateTimeDigitized" in exif_data:
                    metadata.date_time_digitized = _convert_exif_date(exif_data["DateTimeDigitized"])
            except Exception:
                pass
            
            try:
                if "DateTime" in exif_data:
                    metadata.date_time = _convert_exif_date(exif_data["DateTime"])
            except Exception:
                pass
            
            try:
                if "OffsetTimeOriginal" in exif_data:
                    metadata.offset_time_original = str(exif_data["OffsetTimeOriginal"])
            except Exception:
                pass
            
            # Exposure Settings
            try:
                if "ExposureTime" in exif_data:
                    metadata.exposure_time = _convert_to_float(exif_data["ExposureTime"])
            except Exception:
                pass
            
            try:
                if "FNumber" in exif_data:
                    metadata.f_number = _convert_to_float(exif_data["FNumber"])
            except Exception:
                pass
            
            try:
                if "ISOSpeedRatings" in exif_data:
                    val = exif_data["ISOSpeedRatings"]
                    if isinstance(val, tuple):
                        metadata.iso_speed = _convert_to_int(val[0])
                    else:
                        metadata.iso_speed = _convert_to_int(val)
            except Exception:
                pass
            
            try:
                if "ExposureProgram" in exif_data:
                    metadata.exposure_program = _convert_to_int(exif_data["ExposureProgram"])
            except Exception:
                pass
            
            try:
                if "ExposureBiasValue" in exif_data:
                    metadata.exposure_bias = _convert_to_float(exif_data["ExposureBiasValue"])
            except Exception:
                pass
            
            try:
                if "ExposureMode" in exif_data:
                    metadata.exposure_mode = _convert_to_int(exif_data["ExposureMode"])
            except Exception:
                pass
            
            try:
                if "MeteringMode" in exif_data:
                    metadata.metering_mode = _convert_to_int(exif_data["MeteringMode"])
            except Exception:
                pass
            
            try:
                if "Flash" in exif_data:
                    metadata.flash = _convert_to_int(exif_data["Flash"])
            except Exception:
                pass
            
            try:
                if "WhiteBalance" in exif_data:
                    metadata.white_balance = _convert_to_int(exif_data["WhiteBalance"])
            except Exception:
                pass
            
            # Lens/Focus Information
            try:
                if "FocalLength" in exif_data:
                    metadata.focal_length = _convert_to_float(exif_data["FocalLength"])
            except Exception:
                pass
            
            try:
                if "FocalLengthIn35mmFilm" in exif_data:
                    metadata.focal_length_35mm = _convert_to_int(exif_data["FocalLengthIn35mmFilm"])
            except Exception:
                pass
            
            try:
                if "MaxApertureValue" in exif_data:
                    metadata.max_aperture = _convert_to_float(exif_data["MaxApertureValue"])
            except Exception:
                pass
            
            try:
                if "SubjectDistance" in exif_data:
                    metadata.subject_distance = _convert_to_float(exif_data["SubjectDistance"])
            except Exception:
                pass
            
            # Image Properties
            try:
                if "Orientation" in exif_data:
                    metadata.orientation = _convert_to_int(exif_data["Orientation"])
            except Exception:
                pass
            
            try:
                if "ExifImageWidth" in exif_data:
                    metadata.image_width = _convert_to_int(exif_data["ExifImageWidth"])
            except Exception:
                pass
            
            try:
                if "ExifImageHeight" in exif_data:
                    metadata.image_height = _convert_to_int(exif_data["ExifImageHeight"])
            except Exception:
                pass
            
            try:
                if "ColorSpace" in exif_data:
                    metadata.color_space = _convert_to_int(exif_data["ColorSpace"])
            except Exception:
                pass
            
            try:
                if "XResolution" in exif_data:
                    metadata.x_resolution = _convert_to_float(exif_data["XResolution"])
            except Exception:
                pass
            
            try:
                if "YResolution" in exif_data:
                    metadata.y_resolution = _convert_to_float(exif_data["YResolution"])
            except Exception:
                pass
            
            # GPS Information
            try:
                if "GPSLatitude" in gps_data and "GPSLatitudeRef" in gps_data:
                    metadata.gps_latitude = _dms_to_decimal(
                        gps_data["GPSLatitude"], 
                        gps_data["GPSLatitudeRef"]
                    )
            except Exception:
                pass
            
            try:
                if "GPSLongitude" in gps_data and "GPSLongitudeRef" in gps_data:
                    metadata.gps_longitude = _dms_to_decimal(
                        gps_data["GPSLongitude"], 
                        gps_data["GPSLongitudeRef"]
                    )
            except Exception:
                pass
            
            try:
                if "GPSAltitude" in gps_data:
                    alt = _convert_to_float(gps_data["GPSAltitude"])
                    if alt is not None and "GPSAltitudeRef" in gps_data:
                        # GPSAltitudeRef: 0 = above sea level, 1 = below sea level
                        if gps_data["GPSAltitudeRef"] == 1:
                            alt = -alt
                    metadata.gps_altitude = alt
            except Exception:
                pass
            
            try:
                if "GPSTimeStamp" in gps_data:
                    ts = gps_data["GPSTimeStamp"]
                    if isinstance(ts, tuple) and len(ts) >= 3:
                        h = _convert_to_int(ts[0]) or 0
                        m = _convert_to_int(ts[1]) or 0
                        s = _convert_to_float(ts[2]) or 0
                        metadata.gps_timestamp = f"{h:02d}:{m:02d}:{s:05.2f}"
            except Exception:
                pass
            
            try:
                if "GPSDateStamp" in gps_data:
                    metadata.gps_datestamp = str(gps_data["GPSDateStamp"])
            except Exception:
                pass
            
            try:
                if "GPSImgDirection" in gps_data:
                    metadata.gps_img_direction = _convert_to_float(gps_data["GPSImgDirection"])
            except Exception:
                pass
            
            # Scene Information
            try:
                if "SceneCaptureType" in exif_data:
                    metadata.scene_capture_type = _convert_to_int(exif_data["SceneCaptureType"])
            except Exception:
                pass
            
            try:
                if "LightSource" in exif_data:
                    metadata.light_source = _convert_to_int(exif_data["LightSource"])
            except Exception:
                pass
            
            try:
                if "Contrast" in exif_data:
                    metadata.contrast = _convert_to_int(exif_data["Contrast"])
            except Exception:
                pass
            
            try:
                if "Saturation" in exif_data:
                    metadata.saturation = _convert_to_int(exif_data["Saturation"])
            except Exception:
                pass
            
            try:
                if "Sharpness" in exif_data:
                    metadata.sharpness = _convert_to_int(exif_data["Sharpness"])
            except Exception:
                pass
            
            # Other Information
            try:
                if "ImageDescription" in exif_data:
                    metadata.image_description = str(exif_data["ImageDescription"]).strip('\x00')
            except Exception:
                pass
            
            try:
                if "Artist" in exif_data:
                    metadata.artist = str(exif_data["Artist"]).strip('\x00')
            except Exception:
                pass
            
            try:
                if "Copyright" in exif_data:
                    metadata.copyright = str(exif_data["Copyright"]).strip('\x00')
            except Exception:
                pass
            
            try:
                if "UserComment" in exif_data:
                    comment = exif_data["UserComment"]
                    if isinstance(comment, bytes):
                        # Try to decode as UTF-8, fallback to latin-1
                        try:
                            metadata.user_comment = comment.decode('utf-8').strip('\x00')
                        except UnicodeDecodeError:
                            metadata.user_comment = comment.decode('latin-1').strip('\x00')
                    else:
                        metadata.user_comment = str(comment).strip('\x00')
            except Exception:
                pass
    
    except Exception as e:
        logger.debug(f"Failed to extract EXIF from {filepath}: {e}")
    
    return metadata


def extract_exif_date(filepath: Path) -> datetime | None:
    """
    Extract date_taken from EXIF data.
    Uses extract_full_exif_metadata internally for consistency.
    """
    metadata = extract_full_exif_metadata(filepath)
    
    # Try DateTimeOriginal first, then DateTimeDigitized, then DateTime
    for date_field in [metadata.date_time_original, metadata.date_time_digitized, metadata.date_time]:
        if date_field:
            try:
                return datetime.fromisoformat(date_field)
            except (ValueError, AttributeError):
                continue
    
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

            # Extract full EXIF metadata
            exif_metadata = extract_full_exif_metadata(filepath)
            
            # Extract date_taken from EXIF metadata
            date_taken = None
            for date_field in [exif_metadata.date_time_original, exif_metadata.date_time_digitized, exif_metadata.date_time]:
                if date_field:
                    try:
                        date_taken = datetime.fromisoformat(date_field)
                        break
                    except (ValueError, AttributeError):
                        continue

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
                
                # Update EXIF metadata
                existing.set_exif_metadata(exif_metadata)

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
                new_image.set_exif_metadata(exif_metadata)
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
