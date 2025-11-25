# Spec Tasks

## Tasks

- [x] 1. Create EXIF Metadata Pydantic Models

  - [x] 1.1 Create `apps/database-service/src/models/exif_metadata.py` with `EXIFMetadata` Pydantic model containing all optional fields (make, model, exposure_time, f_number, iso_speed, GPS fields, etc.)
  - [x] 1.2 Create `apps/database-service/src/models/metadata_snapshot.py` with `MetadataSnapshot` Pydantic model containing filename, filepath, date_taken, and nested EXIFMetadata
  - [x] 1.3 Update `apps/database-service/src/models/__init__.py` to export new models

- [x] 2. Add Usage Count Field to SourceImage Model

  - [x] 2.1 Add `usage_count: int = Field(default=0, index=True)` to `apps/database-service/src/models/source_image.py`
  - [x] 2.2 Add computed property `is_used: bool` (returns `usage_count > 0`)
  - [x] 2.3 Create database migration to add `usage_count` column and initialize values from existing ImageSlots
  - [x] 2.4 Update `apps/database-service/src/models/__init__.py` if needed

- [x] 3. Add EXIF Metadata Field to SourceImage Model

  - [x] 3.1 Add `exif_metadata: dict[str, Any] | None = Field(default=None, sa_column=Column(SA_JSON))` to `apps/database-service/src/models/source_image.py`
  - [x] 3.2 Add `get_exif_metadata() -> EXIFMetadata | None` method to deserialize JSON to Pydantic model
  - [x] 3.3 Add `set_exif_metadata(metadata: EXIFMetadata | None) -> None` method to serialize Pydantic model to JSON

- [x] 4. Add Metadata Snapshot Field to ImageSlot Model

  - [x] 4.1 Add `metadata_snapshot: dict[str, Any] | None = Field(default=None, sa_column=Column(SA_JSON))` to `apps/database-service/src/models/image_slot.py`
  - [x] 4.2 Add `get_metadata_snapshot() -> MetadataSnapshot | None` method to deserialize JSON to Pydantic model
  - [x] 4.3 Add `set_metadata_snapshot(snapshot: MetadataSnapshot | None) -> None` method to serialize Pydantic model to JSON

- [x] 5. Add Crop and Rotation Fields to SlotTransform Model

  - [x] 5.1 Add `crop_x: float`, `crop_y: float`, `crop_width: float`, `crop_height: float` fields to `apps/database-service/src/models/slot_transform.py`
  - [x] 5.2 Add `rotation: float` field (degrees, supports decimal precision) to SlotTransform model
  - [x] 5.3 Update default values or validation as needed

- [x] 6. Create Tag System Database Models

  - [x] 6.1 Create `apps/database-service/src/models/tag.py` with Tag model (id, name unique indexed, color optional, created_at)
  - [x] 6.2 Create `apps/database-service/src/models/gallery_image_tag.py` with GalleryImageTag junction model (id, gallery_image_id, tag_id with unique constraint)
  - [x] 6.3 Create `apps/database-service/src/models/source_image_tag.py` with SourceImageTag junction model (id, source_image_id, tag_id with unique constraint)
  - [x] 6.4 Update `apps/database-service/src/models/__init__.py` to export new models

- [x] 7. Create Tag System Repositories

  - [x] 7.1 Create `apps/database-service/src/repositories/tag_repository.py` with TagRepository class
  - [x] 7.2 Create `apps/database-service/src/repositories/gallery_image_tag_repository.py` with GalleryImageTagRepository class
  - [x] 7.3 Create `apps/database-service/src/repositories/source_image_tag_repository.py` with SourceImageTagRepository class
  - [x] 7.4 Add methods for finding tags by name, getting tags for images, etc.

- [x] 8. Implement EXIF Metadata Extraction Function

  - [x] 8.1 Create `extract_full_exif_metadata(filepath: Path) -> EXIFMetadata` function in `apps/database-service/src/scanner.py`
  - [x] 8.2 Extract all EXIF fields listed in spec (camera info, exposure, GPS, etc.) with individual try/except blocks
  - [x] 8.3 Convert GPS coordinates from DMS to decimal degrees
  - [x] 8.4 Convert dates to ISO 8601 format
  - [x] 8.5 Convert rational numbers to floats
  - [x] 8.6 Return `EXIFMetadata` Pydantic model (empty if no EXIF data)
  - [x] 8.7 Update `extract_exif_date()` to use new function internally for backward compatibility

- [x] 9. Update Scanner to Extract and Store EXIF Metadata

  - [x] 9.1 Update `scan_albums_directory()` in `apps/database-service/src/scanner.py` to call `extract_full_exif_metadata()`
  - [x] 9.2 Store EXIF metadata in SourceImage records using `set_exif_metadata()` method
  - [x] 9.3 Update existing SourceImage records during scan if EXIF metadata changed

- [x] 10. Implement Usage Count Management Methods

  - [x] 10.1 Add `increment_usage(source_image_id: int)` method to `apps/database-service/src/repositories/source_image_repository.py`
  - [x] 10.2 Add `decrement_usage(source_image_id: int)` method with negative count detection (log error, set to 0)
  - [x] 10.3 Add `batch_increment_usage(source_image_ids: list[int])` method for efficient batch updates
  - [x] 10.4 Add `batch_decrement_usage(source_image_ids: list[int])` method for efficient batch updates
  - [x] 10.5 Add `recalculate_all_usage_counts()` method that queries ImageSlots and updates all counts

- [x] 11. Integrate Usage Count Updates in GalleryImage Operations

  - [x] 11.1 Update `POST /gallery-images` endpoint in `apps/database-service/src/routers/gallery_images.py` to batch increment usage_count after creating ImageSlots
  - [x] 11.2 Update `DELETE /gallery-images/{id}` endpoint to batch decrement usage_count before deleting ImageSlots
  - [x] 11.3 Update `PUT /gallery-images/{id}` endpoint to compare old/new slots and update usage counts accordingly
  - [x] 11.4 Ensure all usage count updates are within same transaction as GalleryImage operations

- [x] 12. Add Usage Count Reconciliation Endpoint

  - [x] 12.1 Add `POST /source-images/recalculate-usage` endpoint to `apps/database-service/src/routers/source_images.py`
  - [x] 12.2 Implement endpoint to call `recalculate_all_usage_counts()` and return results
  - [x] 12.3 Add automatic reconciliation on database-service startup in `apps/database-service/src/main.py`
  - [x] 12.4 Log reconciliation results (counts updated, negative counts found)

- [x] 13. Update SourceImage List Endpoint to Include Usage Status

  - [x] 13.1 Update `GET /source-images` endpoint in `apps/database-service/src/routers/source_images.py` to include `is_used` computed property
  - [x] 13.2 Add `used` query parameter to filter by usage status (true/false)
  - [x] 13.3 Update response model to include `is_used: bool` field

- [x] 14. Implement Metadata Snapshot Population Logic

  - [x] 14.1 Update `apps/database-service/src/repositories/image_slot_repository.py` create method to populate metadata_snapshot when source_image_id is set
  - [x] 14.2 Create MetadataSnapshot Pydantic model with filename, filepath, date_taken, and exif_metadata from SourceImage
  - [x] 14.3 Serialize MetadataSnapshot to JSON using `model_dump()` before storing
  - [x] 14.4 Update update method to handle metadata_snapshot changes

- [x] 15. Create Tag API Endpoints

  - [x] 15.1 Create `apps/database-service/src/routers/tags.py` with tag CRUD endpoints (`GET /tags`, `POST /tags`)
  - [x] 15.2 Add tag endpoints to `apps/database-service/src/routers/gallery_images.py` (`GET /gallery-images/{id}/tags`, `POST /gallery-images/{id}/tags`, `DELETE /gallery-images/{id}/tags/{tag_id}`)
  - [x] 15.3 Add tag endpoints to `apps/database-service/src/routers/source_images.py` (`GET /source-images/{id}/tags`, `POST /source-images/{id}/tags`, `DELETE /source-images/{id}/tags/{tag_id}`)
  - [x] 15.4 Add tag filtering to list endpoints (`GET /gallery-images?tags=tag1,tag2`, `GET /source-images?tags=tag1,tag2`)

- [x] 16. Fix Tint Slider to Match Photoshop Convention

  - [x] 16.1 Verify `apps/web/lib/filters/temperatureTint.ts` filter logic matches Photoshop standard (positive = magenta, negative = green)
  - [x] 16.2 Fix `TintIcon` SVG component in `apps/web/components/ImageEditPanel.tsx` if icon visualization is inverted
  - [x] 16.3 Fix `TintIcon` SVG component in `apps/web/components/ImageEditMenu.tsx` if icon visualization is inverted
  - [x] 16.4 Verify value range matches standard (-150 to +150 or equivalent)

- [x] 17. Fix Drag and Drop Slot Replacement

  - [x] 17.1 Update `handleDrop` function in `apps/web/components/CanvasEditor.tsx` to replace existing ImageAssignment for target slotId
  - [x] 17.2 Update `handleSidebarImageDrop` function to replace existing ImageAssignment rather than appending
  - [x] 17.3 Ensure drop operation properly updates `imageAssignments` state with new assignment (not duplicate)

- [x] 18. Update TypeScript Types for Database API

  - [x] 18.1 Add `Tag`, `GalleryImageTag`, `SourceImageTag` interfaces to `apps/web/types/database-api.ts`
  - [x] 18.2 Add `is_used: boolean` to `SourceImage` interface
  - [x] 18.3 Add `usage_count: number` to `SourceImage` interface
  - [x] 18.4 Add `exif_metadata` field to `SourceImage` interface
  - [x] 18.5 Add `metadata_snapshot` field to `ImageSlot` interface
  - [x] 18.6 Update `SlotTransform` interface to include crop_x, crop_y, crop_width, crop_height, rotation fields

- [x] 19. Add Tag API Client Methods

  - [x] 19.1 Add `tagsApi` object to `apps/web/lib/api/database.ts` with list, create methods
  - [x] 19.2 Add tag methods to `galleryImagesApi` (getTags, addTag, removeTag)
  - [x] 19.3 Add tag methods to `sourceImagesApi` (getTags, addTag, removeTag)
  - [x] 19.4 Add `recalculateUsageCounts()` method to `sourceImagesApi`

- [x] 20. Extend ImageAssignment Interface for Crop and Rotation

  - [x] 20.1 Add `cropX?: number`, `cropY?: number`, `cropWidth?: number`, `cropHeight?: number` to `ImageAssignment` interface in `apps/web/types/index.ts`
  - [x] 20.2 Add `rotation?: number` (degrees) to ImageAssignment interface
  - [x] 20.3 Add `monochromeColor?: string` to ImageAssignment interface for monochrome filter

- [x] 21. Reduce UI Spacing in Image Adjustment Controls

  - [x] 21.1 Update `SliderControl` component spacing in `apps/web/components/ImageEditPanel.tsx`
  - [x] 21.2 Reduce gap between slider, eye icon, and reset icon from 8-12px to 4-6px
  - [x] 21.3 Reduce padding around entire control group while maintaining usability

- [x] 22. Add Visual Indicators for Used Images in Sidebar

  - [x] 22.1 Add filter toggle (All/Used/Unused) to `SidebarHeader` in `apps/web/components/ImageSidebar/index.tsx`
  - [x] 22.2 Update `ImageThumbnail` component in `apps/web/components/ImageSidebar/ImageThumbnail.tsx` to display visual indicator (border or badge) when `is_used` is true
  - [x] 22.3 Update `ImageGrid` component to pass `is_used` prop to thumbnails
  - [x] 22.4 Implement filter logic to filter images based on selected filter option

- [x] 23. Add Filter Presets to ImageEditPanel

  - [x] 23.1 Add "Black & White" preset button to `apps/web/components/ImageEditPanel.tsx` that sets saturation to -100
  - [x] 23.2 Add "Sepia" preset button that applies temperature +30, saturation -50, brightness +10
  - [x] 23.3 Add "Monochrome" preset button that opens color picker and stores selected color in `monochromeColor`
  - [x] 23.4 Ensure presets modify existing slider values (users can fine-tune after)

- [x] 24. Implement Monochrome Filter with Luminance Preservation

  - [x] 24.1 Update `apps/web/components/ImageLayer.tsx` to apply monochrome filter as tint overlay preserving luminance
  - [x] 24.2 Implement custom filter logic that preserves underlying value structure while shifting hue to selected color
  - [x] 24.3 Apply monochrome filter when `monochromeColor` is set in ImageAssignment

- [x] 25. Create SlotEditorModal Component

  - [x] 25.1 Create `apps/web/components/SlotEditorModal.tsx` component
  - [x] 25.2 Implement modal overlay that grays out rest of screen
  - [x] 25.3 Display slot image at 2x-3x size with zoom (mouse wheel/pinch) and pan (drag) support
  - [x] 25.4 Include all ImageEditPanel controls inside modal
  - [x] 25.5 Add "Done" button to close and apply changes
  - [x] 25.6 Sync changes back to main editor immediately

- [x] 26. Add Double-Click Handler to Open SlotEditorModal

  - [x] 26.1 Add `onDoubleClick` prop to `ImageLayer` component in `apps/web/components/ImageLayer.tsx`
  - [x] 26.2 Add double-click handler in `CanvasEditor` that opens SlotEditorModal with current imageAssignment
  - [x] 26.3 Pass `onUpdate` callback to modal to sync changes back

- [x] 27. Implement Crop Tool in SlotEditorModal

  - [x] 27.1 Add crop rectangle overlay rendering in SlotEditorModal (clear inside, grayed-out outside at 30-50% opacity)
  - [x] 27.2 Implement four corner handles (8-10px) for resizing crop rectangle
  - [x] 27.3 Lock aspect ratio to slot aspect ratio when resizing via corner handles
  - [x] 27.4 Implement draggable rectangle for repositioning
  - [x] 27.5 Constrain rectangle to stay within image bounds
  - [x] 27.6 Store crop bounds (cropX, cropY, cropWidth, cropHeight) in ImageAssignment relative to original image dimensions
  - [x] 27.7 Add visual feedback on hover/active states for handles

- [x] 28. Implement Rotation Tool in SlotEditorModal

  - [x] 28.1 Add rotation slider to SlotEditorModal with arbitrary angle support (decimal precision)
  - [x] 28.2 Store rotation angle in degrees in ImageAssignment
  - [x] 28.3 Display current rotation angle value
  - [x] 28.4 Support rotation from -360 to +360 degrees

- [x] 29. Apply Crop and Rotation Transformations in ImageLayer

  - [x] 29.1 Update `apps/web/components/ImageLayer.tsx` to apply crop bounds during rendering
  - [x] 29.2 Apply rotation transformation around image center
  - [x] 29.3 Ensure transformation order: Crop → Rotate → Scale → Position
  - [x] 29.4 Handle default case when no crop is set (full image bounds)

- [x] 30. Apply Crop and Rotation in Canvas Export

  - [x] 30.1 Update `generateCanvasDataUrl()` function in `apps/web/components/CanvasEditor.tsx` to apply crop bounds
  - [x] 30.2 Apply rotation transformation during export
  - [x] 30.3 Ensure cropped region is scaled to fill slot while maintaining slot aspect ratio

- [x] 31. Add Tag Input UI to Gallery Page

  - [x] 31.1 Add tag input field to `apps/web/app/gallery/page.tsx` for GalleryImages
  - [x] 31.2 Implement autocomplete showing existing tags from both GalleryImages and SourceImages
  - [x] 31.3 Support adding multiple tags to a GalleryImage
  - [x] 31.4 Display existing tags on each GalleryImage with remove button
  - [x] 31.5 Call API to add/remove tags when user interacts

- [x] 32. Add Tag Filtering to Gallery Page

  - [x] 32.1 Add tag filter controls to `apps/web/app/gallery/page.tsx`
  - [x] 32.2 Implement tag selection UI (multi-select with AND logic)
  - [x] 32.3 Update gallery image list query to include `tags` query parameter
  - [x] 32.4 Filter GalleryImages to show only those with ALL selected tags

- [x] 33. Add Tag Input UI to ImageSidebar

  - [x] 33.1 Add tag input field to `SidebarHeader` in `apps/web/components/ImageSidebar/index.tsx`
  - [x] 33.2 Implement autocomplete for existing tags
  - [x] 33.3 Support adding multiple tags to SourceImages
  - [x] 33.4 Display tags on SourceImage thumbnails (optional, in ImageThumbnail component)
  - [x] 33.5 Call API to add/remove tags when user interacts

- [x] 34. Add Tag Filtering to ImageSidebar

  - [x] 34.1 Add tag filter controls to ImageSidebar header
  - [x] 34.2 Implement tag selection UI with AND logic
  - [x] 34.3 Update source image list query to include `tags` query parameter
  - [x] 34.4 Combine tag filtering with usage status filtering

- [x] 35. Add Usage Count Recalculation to Settings Page
  - [x] 35.1 Add "Recalculate Usage Counts" button to `apps/web/app/settings/page.tsx`
  - [x] 35.2 Call `recalculateUsageCounts()` API method on button click
  - [x] 35.3 Show loading state while reconciliation is in progress
  - [x] 35.4 Display success/error feedback when reconciliation completes
