"""
Pydantic model for EXIF metadata.
Type-safe model for EXIF data extracted from images.
"""

from pydantic import BaseModel


class EXIFMetadata(BaseModel):
    """Type-safe Pydantic model for EXIF metadata. All fields optional."""

    # Camera/Device Information
    make: str | None = None
    model: str | None = None
    software: str | None = None
    lens_make: str | None = None
    lens_model: str | None = None

    # Date/Time Information (stored as ISO 8601 strings)
    date_time_original: str | None = None  # ISO 8601 format
    date_time_digitized: str | None = None  # ISO 8601 format
    date_time: str | None = None  # ISO 8601 format
    offset_time_original: str | None = None

    # Exposure Settings
    exposure_time: float | None = None  # seconds
    f_number: float | None = None  # f-stop
    iso_speed: int | None = None
    exposure_program: int | None = None
    exposure_bias: float | None = None
    exposure_mode: int | None = None
    metering_mode: int | None = None
    flash: int | None = None
    white_balance: int | None = None

    # Lens/Focus Information
    focal_length: float | None = None  # mm
    focal_length_35mm: int | None = None
    max_aperture: float | None = None
    subject_distance: float | None = None  # meters

    # Image Properties
    orientation: int | None = None
    image_width: int | None = None  # pixels
    image_height: int | None = None  # pixels
    color_space: int | None = None
    x_resolution: float | None = None
    y_resolution: float | None = None

    # GPS Information (converted to decimal degrees)
    gps_latitude: float | None = None  # decimal degrees
    gps_longitude: float | None = None  # decimal degrees
    gps_altitude: float | None = None  # meters
    gps_timestamp: str | None = None
    gps_datestamp: str | None = None
    gps_img_direction: float | None = None  # degrees

    # Scene Information
    scene_capture_type: int | None = None
    light_source: int | None = None
    contrast: int | None = None
    saturation: int | None = None
    sharpness: int | None = None

    # Other Information
    image_description: str | None = None
    artist: str | None = None
    copyright: str | None = None
    user_comment: str | None = None

