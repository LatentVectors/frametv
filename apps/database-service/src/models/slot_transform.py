"""
Pydantic model for image slot transformations.
"""

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

