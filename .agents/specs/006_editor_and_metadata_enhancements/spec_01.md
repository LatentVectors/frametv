# Sprint 006: Image Editing Enhancements and Metadata Management

## Overview

This sprint focuses on enhancing image editing capabilities in the gallery editor, implementing comprehensive metadata tracking, adding tag-based filtering, and improving the user experience for image manipulation. Key improvements include advanced editing tools (crop, rotate, filter presets), metadata preservation for filtering and search, visual indicators for used images, and a tag system for organizing compositions.

**Terminology:** Use the term "GalleryImage" for saved images (compositions).

## User Stories

1. **As a user**, I want to see which source images have already been used in saved compositions, so that I can quickly identify unused images for new compositions.

2. **As a user**, I want to filter source images by usage status (all/used/unused) in the sidebar, so that I can focus on finding new images or reusing existing ones.

3. **As a user**, I want to add tags to gallery images and source images, so that I can organize and filter themed compositions (e.g., "fall leaves") that span multiple days or years.

4. **As a user**, I want to filter gallery images and source images by tags, so that I can quickly find compositions matching specific themes or criteria.

5. **As a user**, I want to apply filter presets (black & white, sepia, monochrome) to individual slots, so that I can quickly adjust images with excessive color without manually adjusting multiple sliders.

6. **As a user**, I want to double-click a slot to open a larger editing view, so that I can more easily zoom, pan, crop, and rotate images for precise alignment.

7. **As a user**, I want to crop images to match the slot aspect ratio, so that images fit perfectly within their slots without distortion.

8. **As a user**, I want to rotate images by arbitrary angles (with decimal precision), so that I can correct images that aren't perfectly straight.

9. **As a user**, I want metadata from source images preserved in saved compositions, so that I can filter and search compositions by camera settings, dates, or locations even after source files are deleted.

10. **As a user**, I want the tint slider to follow Photoshop's standard convention, so that color adjustments behave predictably and match industry standards.

## Core Requirements

### 1. Metadata Tracking and Preservation

**Requirement:** Track metadata for images used in GalleryImages so that filtering and searching compositions by source image metadata remains possible even after source files are deleted or cleaned up.

**Implementation:**

- Add a `metadata_snapshot` JSON field to the `ImageSlot` model that stores a copy of relevant SourceImage metadata at the time the image is used in a composition
- When a SourceImage is assigned to a slot (via `ImageSlot.source_image_id`), capture and store in `metadata_snapshot`:
  - Source image filename
  - Original filepath
  - Date taken (from EXIF)
  - All available EXIF data including:
    - Camera model
    - ISO
    - Aperture
    - Focal length
    - GPS coordinates
    - Any other standard EXIF fields available
- This allows GalleryImages to retain source image metadata even if SourceImage records are deleted or files are removed from disk
- The `metadata_snapshot` should be populated automatically when a SourceImage is assigned to a slot
- Metadata snapshot enables filtering and searching GalleryImages by the metadata of images contained within them

**Database Changes:**

- Add `metadata_snapshot: dict[str, Any] | None = Field(default=None, sa_column=Column(SA_JSON))` field to `ImageSlot` model (JSON column)
- Create Pydantic model `MetadataSnapshot` for type-safe access (see Technical Details section)
- Update `ImageSlot` creation/update logic to populate `metadata_snapshot` when `source_image_id` is set
- Add `get_metadata_snapshot()` and `set_metadata_snapshot()` methods to ImageSlot for serialization/deserialization (similar to `get_transform()`/`set_transform()` pattern)

### 2. Tint Slider Fix

**Requirement:** Fix the tint slider to match Photoshop's standard convention for color temperature/tint adjustments.

**Implementation:**

- Research confirms Photoshop standard: positive values = magenta shift, negative values = green shift
- Verify current implementation in `temperatureTint.ts` matches this convention
- Fix the `TintIcon` SVG component in `ImageEditPanel.tsx` and `ImageEditMenu.tsx` if the icon visualization is inverted
- Ensure the tint filter logic correctly applies:
  - Positive tint values → shift toward magenta
  - Negative tint values → shift toward green
- Verify value range matches standard (-150 to +150 or equivalent)

**Files to Update:**

- `apps/web/lib/filters/temperatureTint.ts` - Verify filter logic
- `apps/web/components/ImageEditPanel.tsx` - Fix TintIcon if needed
- `apps/web/components/ImageEditMenu.tsx` - Fix TintIcon if needed

### 3. Drag and Drop Slot Replacement Fix

**Requirement:** Dragging and dropping images onto slots should replace the existing image assignment for that slot.

**Implementation:**

- Fix the drop handler in `CanvasEditor.tsx` to always replace the image assignment for the target slot
- Update `handleDrop` and `handleSidebarImageDrop` functions to:
  - Find or create the ImageAssignment for the target slotId
  - Replace any existing assignment rather than appending or creating duplicates
  - Ensure the drop operation properly updates `imageAssignments` state with the new assignment

**Files to Update:**

- `apps/web/components/CanvasEditor.tsx` - Fix drop handlers

### 4. Visual Indicators for Used Images in Sidebar

**Requirement:** Show visual indicators in the ImageSidebar for which SourceImages have already been used in saved GalleryImages, with filtering capability.

**Implementation:**

- Add a filter toggle in the ImageSidebar header with options:
  - "All Images" (default)
  - "Used Images"
  - "Unused Images"
- Query the database to check if any ImageSlot references each SourceImage (`source_image_id` matches)
- Display visual indicator on thumbnails for used images:
  - Subtle border color change (e.g., blue border) or
  - Small checkmark badge overlay
- Show indicators immediately when images load in the sidebar
- Filter functionality should update the displayed image list based on selection

**Files to Update:**

- `apps/web/components/ImageSidebar/index.tsx` - Add filter toggle in SidebarHeader
- `apps/web/components/ImageSidebar/ImageThumbnail.tsx` - Add visual indicator rendering (border/badge)
- `apps/web/components/ImageSidebar/ImageGrid.tsx` - Pass usage status to thumbnails
- `apps/database-service/src/routers/source_images.py` - Add `used` query parameter to filter endpoint, include `is_used` computed property in response

### 4.1. SourceImage Usage Count Tracking

**Requirement:** Efficiently track which SourceImages are used in GalleryImages without expensive queries on every request. Use a denormalized `usage_count` field for fast filtering and visual indicators.

**Implementation:**

- Add `usage_count: int = Field(default=0, index=True)` to SourceImage model
- Compute `is_used` as a property: `is_used = usage_count > 0` (not stored, computed on read)
- **Usage Count Management:**
  - **On GalleryImage create:** For each ImageSlot with a `source_image_id`, increment that SourceImage's `usage_count` by 1
  - **On GalleryImage delete:** GalleryImages are permanently deleted (hard delete - no soft delete mechanism). For each ImageSlot in the deleted GalleryImage, decrement the corresponding SourceImage's `usage_count` by 1
  - **On GalleryImage update (slot changes):** Compare old and new slot source_image_ids; decrement for removed slots, increment for added slots
- **Negative Count Detection:** If `usage_count` goes negative (should never happen), log an error, set to 0, and flag for investigation. This indicates a data inconsistency bug.
- **Reconciliation:** Provide reconciliation endpoint and automatic startup check:
  - Recalculate all usage counts from actual ImageSlot references
  - Query: `SELECT source_image_id, COUNT(*) as count FROM image_slots WHERE source_image_id IS NOT NULL GROUP BY source_image_id`
  - Set all SourceImage `usage_count = 0`, then update from query results
  - Expose reconciliation endpoint in Settings UI and run automatically on database-service startup

**Database Changes:**

- Add `usage_count: int = Field(default=0, index=True)` to SourceImage model
- Create database migration to add the column and initialize values from existing ImageSlots

**Service Layer:**

- Create `SourceImageUsageService` or add methods to `SourceImageRepository`:
  - `increment_usage(source_image_id: int)` - increments usage_count by 1
  - `decrement_usage(source_image_id: int)` - decrements usage_count by 1, with floor of 0 (flag error if goes negative)
  - `batch_increment_usage(source_image_ids: list[int])` - efficient batch update
  - `batch_decrement_usage(source_image_ids: list[int])` - efficient batch update
  - `recalculate_all_usage_counts()` - reconciliation method that queries actual ImageSlot references and updates all counts

**Integration Points:**

- `POST /gallery-images` (create): After saving GalleryImage and its ImageSlots, batch increment usage_count for all source_image_ids in slots (within same transaction)
- `DELETE /gallery-images/{id}` (delete): Before deleting GalleryImage, get all source_image_ids from its ImageSlots, then batch decrement usage_count after delete completes (within same transaction)
- `PUT /gallery-images/{id}` (update): Compare old and new slot source_image_ids; decrement for removed slots, increment for added slots (within same transaction)
- `GET /source-images` (list): Include `is_used` computed property (`usage_count > 0`) in response

**Note on Delete Types:**

- **Hard Delete:** Permanent removal from database (GalleryImage deletion). Usage counts are decremented immediately.
- **Soft Delete:** Record marked as deleted but remains in database (SourceImage uses `is_deleted` flag). Soft-deleted SourceImages should not affect usage counts since they're not available for selection, but their existing usage counts remain unchanged.

**Reconciliation:**

- `POST /source-images/recalculate-usage` - Admin endpoint accessible from Settings UI
- Automatic reconciliation on database-service startup (after database connection established)
- Log reconciliation results (counts updated, any negative counts found and corrected)

**Files to Create/Update:**

- `apps/database-service/src/models/source_image.py` - Add usage_count field
- `apps/database-service/src/repositories/source_image_repository.py` - Add usage count management methods
- `apps/database-service/src/routers/source_images.py` - Add reconciliation endpoint
- `apps/database-service/src/main.py` or startup script - Add automatic reconciliation on startup
- `apps/web/app/settings/page.tsx` - Add "Recalculate Usage Counts" button
- `apps/web/lib/api/database.ts` - Add recalculateUsageCounts API method

### 5. Tag System

**Requirement:** Add tagging support to both GalleryImages and SourceImages for filtering and organizing themed compositions.

**Implementation:**

- Create new database tables:
  - `tags` table:
    - `id` (int, primary key)
    - `name` (str, unique, indexed)
    - `color` (str, optional - for UI display)
    - `created_at` (datetime)
  - `gallery_image_tags` junction table:
    - `id` (int, primary key)
    - `gallery_image_id` (int, foreign key to gallery_images)
    - `tag_id` (int, foreign key to tags)
    - Unique constraint on (gallery_image_id, tag_id)
  - `source_image_tags` junction table:
    - `id` (int, primary key)
    - `source_image_id` (int, foreign key to source_images)
    - `tag_id` (int, foreign key to tags)
    - Unique constraint on (source_image_id, tag_id)
- Add tag input/management UI:
  - In gallery page: tag input field for GalleryImages (supports multiple tags, autocomplete from existing tags)
  - In ImageSidebar: tag input field for SourceImages
  - Tag filtering controls in both locations
- Filter functionality:
  - Gallery page: filter GalleryImages by selected tags
  - ImageSidebar in editor: filter SourceImages by selected tags
- For this sprint: support adding and removing tags only (tag deletion and merging deferred to future sprint)

**Database Changes:**

- Create new models: `Tag`, `GalleryImageTag`, `SourceImageTag`
- Add repository methods for tag operations
- Add API endpoints for tag CRUD and filtering

**Files to Create:**

- `apps/database-service/src/models/tag.py` - Tag model
- `apps/database-service/src/models/gallery_image_tag.py` - GalleryImageTag junction model
- `apps/database-service/src/models/source_image_tag.py` - SourceImageTag junction model
- `apps/database-service/src/repositories/tag_repository.py` - Tag repository
- `apps/database-service/src/repositories/gallery_image_tag_repository.py` - GalleryImageTag repository
- `apps/database-service/src/repositories/source_image_tag_repository.py` - SourceImageTag repository
- `apps/database-service/src/routers/tags.py` - Tag API endpoints

**Files to Update:**

- `apps/database-service/src/routers/gallery_images.py` - Add tag endpoints
- `apps/database-service/src/routers/source_images.py` - Add tag endpoints
- `apps/web/app/gallery/page.tsx` - Add tag input UI and tag filter controls
- `apps/web/components/ImageSidebar/index.tsx` - Add tag input UI in SidebarHeader
- `apps/web/components/ImageSidebar/ImageThumbnail.tsx` - Display tags on thumbnails (optional)
- `apps/web/lib/api/database.ts` - Add tag API client methods
- `apps/web/types/database-api.ts` - Add Tag, GalleryImageTag, SourceImageTag interfaces

### 6. Image Filter Presets

**Requirement:** Add quick-apply filter presets (Black & White, Sepia, Monochrome) for images with excessive color.

**Implementation:**

- Add filter preset buttons in `ImageEditPanel`:
  - "Black & White" preset: sets saturation to -100
  - "Sepia" preset: applies combination of temperature (+30), saturation (-50), and slight brightness adjustment
  - "Monochrome" preset: opens color picker; when color selected, applies as tint overlay preserving original image luminance (maintains underlying value structure, changes hue to selected color)
- Presets modify existing adjustment sliders rather than being separate filter types
- Filters are applied per-slot (each slot can have independent filter settings)
- For monochrome: implement as tint overlay that preserves luminance values while shifting hue to selected color

**Files to Update:**

- `apps/web/components/ImageEditPanel.tsx` - Add preset buttons (Black & White, Sepia, Monochrome) and color picker for monochrome
- `apps/web/types/index.ts` - Add `monochromeColor?: string` to ImageAssignment interface if needed
- `apps/web/components/ImageLayer.tsx` - Apply monochrome filter as tint overlay preserving luminance

### 7. Double-Click Slot Editor Modal

**Requirement:** Double-clicking a slot opens a modal/dialog with larger view and full editing controls.

**Implementation:**

- Create a new `SlotEditorModal` component that:
  - Opens when a slot is double-clicked
  - Grays out/overlays the rest of the screen (similar to sidebar image full-screen view)
  - Displays the slot's image at 2x-3x size
  - Supports zoom (mouse wheel/pinch gestures) and pan (drag)
  - Includes all ImageEditPanel controls inside the modal
  - Includes crop and rotate tools (see requirement 8)
  - Has "Done" button to close and apply changes
  - Changes sync back to the main editor immediately

**Files to Create:**

- `apps/web/components/SlotEditorModal.tsx` - Modal component with zoom, pan, and all editing controls

**Files to Update:**

- `apps/web/components/CanvasEditor.tsx` - Add double-click handler on slot to open SlotEditorModal, pass imageAssignment and onUpdate callback
- `apps/web/components/ImageLayer.tsx` - Add onDoubleClick prop and handler to trigger modal opening

### 8. Crop and Rotate Functionality

**Requirement:** Add crop and rotate tools for fixing alignment and selecting specific image areas.

**Implementation:**

- **Crop Tool:**
  - Available in the SlotEditorModal (from requirement 7)
  - **Visual Overlay:**
    - Display a draggable rectangle overlay on top of the image
    - **Inside the rectangle:** Show the image clearly/normally (this is the area that will be kept)
    - **Outside the rectangle:** Show the image grayed out or with reduced opacity (approximately 30-50% opacity or gray overlay) to indicate this area will be cropped out, while still allowing the user to see the full image context for better crop selection
    - The rectangle should have a visible border (e.g., 2px solid border) to clearly define the crop area
  - **Interaction:**
    - Corner handles (4 handles, one at each corner) allow resizing the crop rectangle
    - The entire rectangle can be dragged to reposition it
    - Aspect ratio is locked to match the slot's aspect ratio - when resizing via corner handles, the rectangle maintains the slot's aspect ratio
    - Handles should be visually distinct (e.g., small squares or circles, 8-10px size) and change appearance on hover
  - Crop bounds stored as (x, y, width, height) in ImageAssignment, relative to original image dimensions
- **Rotate Tool:**
  - Rotation slider in SlotEditorModal (separate from crop tool)
  - Supports arbitrary angle rotation (at least one decimal place precision, e.g., 23.5°)
  - Rotation angle stored in ImageAssignment
- Both crop and rotate are stored as part of ImageAssignment transform, affecting display in slot without creating new/modified source image files
- Extend `ImageAssignment` interface to include:
  - `cropX`, `cropY`, `cropWidth`, `cropHeight` (crop bounds)
  - `rotation` (rotation angle in degrees)
- Update `SlotTransform` model to include crop and rotation fields
- Apply transformations during rendering in `ImageLayer` and export in `CanvasEditor`

**Files to Update:**

- `apps/web/types/index.ts` - Extend ImageAssignment interface with cropX, cropY, cropWidth, cropHeight, rotation fields
- `apps/database-service/src/models/slot_transform.py` - Add crop_x, crop_y, crop_width, crop_height, rotation fields to SlotTransform model
- `apps/web/components/SlotEditorModal.tsx` - Implement crop tool with:
  - Rectangle overlay with clear inside area and grayed-out outside area
  - Four corner handles for resizing (maintaining slot aspect ratio)
  - Draggable rectangle for repositioning
  - Visual feedback on hover/active states
  - Rotation slider (arbitrary angles, decimal precision)
- `apps/web/components/ImageLayer.tsx` - Apply crop bounds and rotation transformations during rendering
- `apps/web/components/CanvasEditor.tsx` - Apply crop and rotation transformations in generateCanvasDataUrl export function

### 9. UI Spacing Improvements

**Requirement:** Reduce horizontal spacing in image adjustment controls for more compact layout.

**Implementation:**

- Reduce gap between slider, eye icon, and reset icon in `ImageEditPanel`'s `SliderControl` component
  - Change from current spacing (likely 8-12px) to 4-6px
- Reduce padding around the entire control group
- Maintain usability while making layout more compact

**Files to Update:**

- `apps/web/components/ImageEditPanel.tsx` - Update SliderControl spacing styles

### 10. EXIF Metadata Expansion

**Requirement:** Extract and store all available EXIF metadata from source images. Handle missing fields gracefully.

**EXIF Fields to Extract:**

The following is the complete, explicit list of EXIF fields to attempt to extract. All fields are optional; the system must handle missing fields gracefully.

**Camera/Device Information:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `make` | Make | Camera manufacturer | "Canon", "Nikon", "Apple" |
| `model` | Model | Camera model | "Canon EOS R5", "iPhone 14 Pro" |
| `software` | Software | Software used to process image | "Adobe Lightroom 6.0" |
| `lens_make` | LensMake | Lens manufacturer | "Canon" |
| `lens_model` | LensModel | Lens model | "EF 24-70mm f/2.8L II USM" |

**Date/Time Information:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `date_time_original` | DateTimeOriginal | Original capture date/time | "2024:03:15 14:30:45" |
| `date_time_digitized` | DateTimeDigitized | Digitization date/time | "2024:03:15 14:30:45" |
| `date_time` | DateTime | File modification date/time | "2024:03:15 14:30:45" |
| `offset_time_original` | OffsetTimeOriginal | Timezone offset for original | "+05:30" |

**Exposure Settings:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `exposure_time` | ExposureTime | Shutter speed in seconds | 0.004 (1/250s) |
| `f_number` | FNumber | Aperture f-stop | 2.8 |
| `iso_speed` | ISOSpeedRatings | ISO sensitivity | 400 |
| `exposure_program` | ExposureProgram | Exposure program mode | 2 (Normal program) |
| `exposure_bias` | ExposureBiasValue | Exposure compensation | -0.67 |
| `exposure_mode` | ExposureMode | Exposure mode | 0 (Auto) |
| `metering_mode` | MeteringMode | Metering mode | 5 (Pattern) |
| `flash` | Flash | Flash status | 16 (Flash did not fire) |
| `white_balance` | WhiteBalance | White balance mode | 0 (Auto) |

**Lens/Focus Information:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `focal_length` | FocalLength | Focal length in mm | 50.0 |
| `focal_length_35mm` | FocalLengthIn35mmFilm | 35mm equivalent focal length | 75 |
| `max_aperture` | MaxApertureValue | Maximum lens aperture | 1.4 |
| `subject_distance` | SubjectDistance | Distance to subject in meters | 2.5 |

**Image Properties:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `orientation` | Orientation | Image rotation | 1 (Normal) |
| `image_width` | ExifImageWidth | Image width in pixels | 6000 |
| `image_height` | ExifImageHeight | Image height in pixels | 4000 |
| `color_space` | ColorSpace | Color space | 1 (sRGB) |
| `x_resolution` | XResolution | Horizontal resolution | 300.0 |
| `y_resolution` | YResolution | Vertical resolution | 300.0 |

**GPS Information:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `gps_latitude` | GPSLatitude + GPSLatitudeRef | Latitude (decimal degrees) | 37.7749 |
| `gps_longitude` | GPSLongitude + GPSLongitudeRef | Longitude (decimal degrees) | -122.4194 |
| `gps_altitude` | GPSAltitude + GPSAltitudeRef | Altitude in meters | 15.5 |
| `gps_timestamp` | GPSTimeStamp | GPS time | "14:30:45" |
| `gps_datestamp` | GPSDateStamp | GPS date | "2024:03:15" |
| `gps_img_direction` | GPSImgDirection | Direction camera faced | 180.0 (degrees) |

**Scene Information:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `scene_capture_type` | SceneCaptureType | Scene type | 0 (Standard) |
| `light_source` | LightSource | Light source type | 0 (Unknown) |
| `contrast` | Contrast | Contrast setting | 0 (Normal) |
| `saturation` | Saturation | Saturation setting | 0 (Normal) |
| `sharpness` | Sharpness | Sharpness setting | 0 (Normal) |

**Other Information:**
| Field Name | EXIF Tag | Description | Example Value |
|------------|----------|-------------|---------------|
| `image_description` | ImageDescription | Image description/caption | "Family photo" |
| `artist` | Artist | Creator name | "John Doe" |
| `copyright` | Copyright | Copyright notice | "© 2024 John Doe" |
| `user_comment` | UserComment | User comments | "Edited in Lightroom" |

**Handling Missing EXIF Data:**

1. **All fields are optional:** The `exif_metadata` JSON field stores only the fields that were successfully extracted. Missing fields are simply not included in the JSON (not set to null or empty string).

2. **Graceful extraction:** The extraction function should:

   - Wrap all extraction in try/except blocks
   - Log debug messages for extraction failures (not errors)
   - Continue extracting other fields if one fails
   - Return an empty dict `{}` if no EXIF data is available

3. **GPS coordinate conversion:** Convert GPS coordinates from degrees/minutes/seconds format to decimal degrees for easier use. Store as single float values (latitude, longitude) rather than DMS components.

4. **Data types:**

   - Dates should be converted to ISO 8601 strings
   - Rational numbers (like FNumber) should be converted to floats
   - GPS coordinates should be converted to decimal degrees (floats)
   - Enum values (like ExposureProgram) should store the integer code

5. **No default values:** Do not use placeholder values like "Unknown" or "N/A". If a field is missing, it should not exist in the JSON at all.

**Example `exif_metadata` JSON:**

```json
{
  "make": "Canon",
  "model": "Canon EOS R5",
  "date_time_original": "2024-03-15T14:30:45",
  "exposure_time": 0.004,
  "f_number": 2.8,
  "iso_speed": 400,
  "focal_length": 50.0,
  "focal_length_35mm": 75,
  "gps_latitude": 37.7749,
  "gps_longitude": -122.4194,
  "gps_altitude": 15.5,
  "orientation": 1
}
```

**Implementation:**

- Create Pydantic model `EXIFMetadata` for type-safe EXIF data (see Technical Details section)
- Store EXIF data in SourceImage model as `exif_metadata: dict[str, Any] | None = Field(default=None, sa_column=Column(SA_JSON))` JSON field
- Add `get_exif_metadata()` and `set_exif_metadata()` methods to SourceImage for serialization/deserialization
- Create new `extract_full_exif_metadata(filepath: Path) -> EXIFMetadata` function in `scanner.py` that returns Pydantic model
- Keep existing `extract_exif_date()` function for backward compatibility, but have it use the new function internally
- When creating `metadata_snapshot` in ImageSlot, copy the entire `exif_metadata` dict along with other SourceImage fields

**Files to Create:**

- `apps/database-service/src/models/exif_metadata.py` - Pydantic model for EXIF metadata with all fields as optional

**Files to Update:**

- `apps/database-service/src/models/source_image.py` - Add `exif_metadata: dict[str, Any] | None` JSON field and get/set methods
- `apps/database-service/src/scanner.py` - Create `extract_full_exif_metadata()` function that returns `EXIFMetadata` Pydantic model
- `apps/database-service/src/models/image_slot.py` - Update to populate `metadata_snapshot` when `source_image_id` is assigned, copying all SourceImage metadata including `exif_metadata`
- `apps/database-service/src/repositories/image_slot_repository.py` - Update create/update methods to populate metadata_snapshot automatically

## Technical Details

### Data Models

**ImageSlot Updates:**

- Add `metadata_snapshot: dict[str, Any] | None = Field(default=None, sa_column=Column(SA_JSON))` (JSON field)
- Add `get_metadata_snapshot() -> MetadataSnapshot | None` method to deserialize JSON to Pydantic model
- Add `set_metadata_snapshot(snapshot: MetadataSnapshot | None) -> None` method to serialize Pydantic model to JSON

**SlotTransform Updates:**

- Add `crop_x: float`
- Add `crop_y: float`
- Add `crop_width: float`
- Add `crop_height: float`
- Add `rotation: float` (degrees, supports decimal precision)

**New Pydantic Models:**

**EXIFMetadata** (`apps/database-service/src/models/exif_metadata.py`):

```python
from pydantic import BaseModel
from datetime import datetime

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
```

**MetadataSnapshot** (`apps/database-service/src/models/metadata_snapshot.py`):

```python
from pydantic import BaseModel
from datetime import datetime
from .exif_metadata import EXIFMetadata

class MetadataSnapshot(BaseModel):
    """Type-safe Pydantic model for source image metadata snapshot stored in ImageSlot."""

    # Source image basic info
    filename: str
    filepath: str
    date_taken: datetime | None = None

    # EXIF metadata (nested Pydantic model)
    exif_metadata: EXIFMetadata | None = None
```

**New Database Models:**

- `Tag`: id, name (unique), color (optional), created_at
- `GalleryImageTag`: id, gallery_image_id, tag_id (unique constraint)
- `SourceImageTag`: id, source_image_id, tag_id (unique constraint)

**SourceImage Updates:**

- Add `usage_count: int = Field(default=0, index=True)` - tracks how many ImageSlots reference this SourceImage
- Add `exif_metadata: dict[str, Any] | None = Field(default=None, sa_column=Column(SA_JSON))` JSON field
- Add `get_exif_metadata() -> EXIFMetadata | None` method to deserialize JSON to Pydantic model
- Add `set_exif_metadata(metadata: EXIFMetadata | None) -> None` method to serialize Pydantic model to JSON
- Computed property `is_used: bool` (usage_count > 0) - not stored, computed on read

**Type Safety Pattern:**

- Database models store JSON as `dict[str, Any] | None` (using modern type syntax)
- Pydantic models provide type-safe access with specific field types
- Serialization: `pydantic_model.model_dump()` converts to dict for database storage
- Deserialization: `PydanticModel(**dict_data)` converts from dict to Pydantic model
- Follow the same pattern as `SlotTransform` (see `ImageSlot.get_transform()`/`set_transform()`)

### API Endpoints

**New Endpoints:**

- `GET /tags` - List all tags
- `POST /tags` - Create tag
- `GET /gallery-images/{id}/tags` - Get tags for gallery image
- `POST /gallery-images/{id}/tags` - Add tag to gallery image
- `DELETE /gallery-images/{id}/tags/{tag_id}` - Remove tag from gallery image
- `GET /source-images/{id}/tags` - Get tags for source image
- `POST /source-images/{id}/tags` - Add tag to source image
- `DELETE /source-images/{id}/tags/{tag_id}` - Remove tag from source image
- `GET /gallery-images?tags=tag1,tag2` - Filter gallery images by tags
- `GET /source-images?tags=tag1,tag2&used=true/false` - Filter source images by tags and usage status
- `POST /source-images/recalculate-usage` - Recalculate all usage counts from ImageSlot references (admin/maintenance endpoint)

### User Interface Changes

**Gallery Page:**

- Add tag input/management UI for GalleryImages
- Add tag filter controls
- Visual indicators for synced images (already exists, verify)

**Canvas Editor:**

- Fix drag and drop to replace slots
- Add double-click handler on slots to open SlotEditorModal
- Update ImageEditPanel with filter presets
- Reduce spacing in adjustment controls

**ImageSidebar:**

- Add visual indicators for used images (based on usage_count > 0)
- Add filter toggle (All/Used/Unused) - filters by usage_count
- Add tag input/management UI for SourceImages
- Add tag filter controls

**Settings Page:**

- Add "Recalculate Usage Counts" button that calls reconciliation endpoint
- Show status/feedback when reconciliation completes

**SlotEditorModal (New):**

- Large image view with zoom/pan
- All ImageEditPanel controls
- Crop tool with slot-aspect-ratio constraint
- Rotation slider (arbitrary angles)

## Implementation Notes

### Crop Tool Details

**Visual Implementation:**

- Crop rectangle overlay rendered on top of the image in SlotEditorModal
- Use CSS overlay or canvas layering to achieve the grayed-out effect outside the crop rectangle
- Options for grayed-out effect:
  - Apply opacity reduction (30-50% opacity) to image areas outside rectangle
  - Apply gray overlay/darkening filter to areas outside rectangle
  - Use a semi-transparent dark layer (e.g., rgba(0, 0, 0, 0.5)) over areas outside rectangle
- The crop rectangle border should be clearly visible (2px solid border, contrasting color)
- Corner handles should be interactive and provide visual feedback on hover/active states

**Interaction Behavior:**

- Corner handles allow resizing while maintaining slot aspect ratio
- When dragging a corner handle, calculate new dimensions maintaining aspect ratio:
  - Determine which edge (width or height) changed more
  - Adjust the other dimension proportionally to maintain slot aspect ratio
- Entire rectangle can be dragged to reposition (maintains size and aspect ratio)
- Rectangle should be constrained to stay within image bounds
- If rectangle reaches image edge, prevent further movement/resizing in that direction

**Data Storage:**

- Crop bounds are stored relative to the original image dimensions (not slot dimensions)
- Crop coordinates: (cropX, cropY) is top-left corner, cropWidth and cropHeight define the crop rectangle size
- When applying crop, the cropped region is scaled to fill the slot while maintaining the slot's aspect ratio
- If no crop is set, default to full image bounds (cropX=0, cropY=0, cropWidth=imageWidth, cropHeight=imageHeight)

**Technical Implementation:**

- Use Konva.js or similar canvas library for overlay rendering if using canvas
- Or use CSS positioning with absolute overlay divs for HTML-based approach
- Handle mouse/touch events for dragging and resizing
- Calculate aspect ratio from slot dimensions: `slotAspectRatio = slotWidth / slotHeight`
- When resizing, maintain: `cropWidth / cropHeight = slotAspectRatio`

### Rotation Implementation

- Rotation is applied around the image center
- Rotation angle is stored in degrees (0-360, supports negative values which wrap)
- Rotation is applied after crop but before scaling/positioning within slot
- Rotation order: Crop → Rotate → Scale → Position

### EXIF Data Extraction

- Use PIL/Pillow's `Image._getexif()` and `ExifTags.TAGS` for tag name mapping
- GPS data requires special handling: use `ExifTags.GPSTAGS` for GPS-specific tag names
- Convert GPS coordinates from DMS (degrees/minutes/seconds) format to decimal degrees:
  ```python
  def dms_to_decimal(dms, ref):
      degrees, minutes, seconds = dms
      decimal = degrees + minutes/60 + seconds/3600
      if ref in ['S', 'W']:
          decimal = -decimal
      return decimal
  ```
- Convert EXIF rational numbers to floats using: `float(value[0]) / float(value[1])` if tuple
- Handle various date formats: EXIF uses "YYYY:MM:DD HH:MM:SS", convert to ISO 8601
- Wrap all field extractions in individual try/except blocks to continue on partial failures
- Log extraction issues at DEBUG level, not ERROR (missing EXIF is normal)
- Return `EXIFMetadata()` (empty Pydantic model) for images with no EXIF data or unsupported formats (PNG rarely has EXIF)
- The extraction function should return `EXIFMetadata` Pydantic model, not raw dict
- Test with various image types: JPEG (most EXIF), HEIC (Apple), PNG (usually no EXIF), RAW formats

### Metadata Snapshot Population

- When a SourceImage is assigned to an ImageSlot (via source_image_id), automatically populate metadata_snapshot
- Create `MetadataSnapshot` Pydantic model with:
  - `filename`: SourceImage.filename
  - `filepath`: SourceImage.filepath
  - `date_taken`: SourceImage.date_taken
  - `exif_metadata`: SourceImage.get_exif_metadata() (returns EXIFMetadata Pydantic model or None)
- Serialize to JSON using `metadata_snapshot.model_dump()` before storing in database
- This snapshot is immutable once created (does not update if SourceImage changes later)
- For manually uploaded images (source_image_id is null), metadata_snapshot should be None or contain whatever metadata is available from the upload
- When reading from database, use `ImageSlot.get_metadata_snapshot()` to deserialize JSON to `MetadataSnapshot` Pydantic model

### Tag Filtering

- Tag filtering uses AND logic: images must have ALL selected tags
- Multiple tags can be selected for filtering
- Tag filtering can be combined with usage status filtering in sidebar
- Tag autocomplete should show existing tags from both GalleryImages and SourceImages

### Filter Presets Application

- Presets modify existing slider values, so users can still fine-tune after applying a preset
- Black & White: saturation = -100, other adjustments unchanged
- Sepia: temperature = +30, saturation = -50, brightness = +10 (adjust as needed for desired effect)
- Monochrome: opens color picker, applies selected color as tint overlay preserving luminance (requires custom filter implementation)

### Visual Indicators for Used Images

- Use `usage_count` field on SourceImage (computed as `is_used = usage_count > 0`)
- Visual indicator should be subtle but noticeable (e.g., 2px blue border or small checkmark badge in corner)
- Filter queries use indexed `usage_count` field: `WHERE usage_count > 0` (used) or `WHERE usage_count = 0` (unused)

### Usage Count Management

- All usage count updates must be atomic and transactional
- On GalleryImage create/update/delete, usage counts are updated in the same transaction
- Negative count detection: If decrement would result in negative count, log error, set to 0, and flag for investigation
- Reconciliation runs automatically on startup and can be triggered manually from Settings UI
- Reconciliation query: `SELECT source_image_id, COUNT(*) as count FROM image_slots WHERE source_image_id IS NOT NULL GROUP BY source_image_id`

## Out of Scope

- Generative fill for cropped images (deferred to future sprint)
- Tag deletion and merging (deferred to future sprint - only add/remove supported)
- Tag management UI beyond add/remove (deferred to future sprint)
- Batch tag operations (deferred to future sprint)
