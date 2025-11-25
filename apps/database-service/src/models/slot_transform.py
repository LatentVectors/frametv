"""
Pydantic model for image slot transformations.
"""

from typing import Optional
from pydantic import BaseModel


class SlotTransform(BaseModel):
    """Type-safe model for image slot transformations."""

    x: float  # Position X coordinate
    y: float  # Position Y coordinate
    scale: float  # Scale factor (1.0 = 100%)
    rotation: float  # Rotation in degrees (0-360)
    brightness: float  # Brightness adjustment (-1.0 to 1.0)
    contrast: float  # Contrast adjustment (-1.0 to 1.0)
    saturation: float  # Saturation adjustment (-1.0 to 1.0)
    tint: float  # Tint adjustment (-1.0 to 1.0)
    
    # Crop fields - relative to original image dimensions
    crop_x: Optional[float] = None  # Crop region X coordinate
    crop_y: Optional[float] = None  # Crop region Y coordinate
    crop_width: Optional[float] = None  # Crop region width
    crop_height: Optional[float] = None  # Crop region height
    
    # Rotation for crop tool (separate from position rotation, supports arbitrary angles)
    crop_rotation: Optional[float] = None  # Rotation angle in degrees (supports decimal precision)

