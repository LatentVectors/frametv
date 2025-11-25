# Spec: Editor & Metadata Enhancements

## Overview

This sprint focuses on refining the image editing experience, enhancing metadata management (tagging), and improving the gallery and sidebar UI. Key goals include a full-screen slot editor, improved filter controls, and database-backed source image management in the sidebar. This sprint includes both frontend UI changes and backend API enhancements.

---

## User Stories

### Slot Editor

- As a user, I want to edit an image in a full-screen view so I can focus on making precise adjustments.
- As a user, I want crop handles always visible so I can quickly adjust framing without switching modes.
- As a user, I want to rotate images with fine precision (0.1°) so I can straighten horizons accurately.

### Filter Presets

- As a user, I want filter presets to be mutually exclusive so I don't accidentally combine incompatible effects.
- As a user, I want a "Reset All" button that returns the image to its original state so I can start over easily.

### Sidebar

- As a user, I want to see which source images I've already used so I can choose fresh images for new compositions.
- As a user, I want to tag source images directly in the sidebar so I can organize and filter my photo library.

### Gallery

- As a user, I want a collapsible filter panel so I can filter my gallery without taking up permanent screen space.

---

## 1. Slot Editor Experience (Full-Screen Overlay)

The current pop-up editing window for image slots will be replaced with a full-screen modal overlay to provide a more immersive editing experience.

### Interaction

- Double-clicking a slot on the canvas opens the editor as a full-viewport overlay (`fixed inset-0 z-50`).

### Layout

- **Left Sidebar (fixed width ~320px):**
  1. Mirror/Flip control (icon-only button, no text label).
  2. Filter Presets (Black & White, Sepia, Monochrome with always-visible color swatch).
  3. Detailed Adjustments (Brightness, Contrast, Saturation, Hue, Temperature, Tint sliders).
  4. Rotation control (slider + numeric input).
- **Main Area:** Canvas filling remaining space.
- **Header:** Minimal top bar with "Cancel" (left) and "Save" (right) buttons only.

### State Management

- Changes are applied to a local state within the overlay.
- **Save:** Commits changes to the slot and closes the overlay.
- **Cancel:** Discards all changes made in the session and closes the overlay.
- **Loading Existing State:** When opening the editor for a slot that already has transforms applied, initialize local state from the existing `ImageAssignment` (crop, rotation, filters, etc.). If no crop is defined, auto-calculate an aspect-ratio-constrained crop to fill the slot.

### Cropping Behavior

- Cropping is always enabled and active; no separate "Pan/Crop" mode toggle.
- Crop handles are always visible, locked to the slot's aspect ratio.
- User can drag the crop region to reposition or drag corners to resize.
- Pan/zoom available via mouse drag within crop region and scroll wheel.

---

## 2. Image Adjustments UI

### Position

Fixed left sidebar in the full-screen editor (~320px width).

### Layout Order

1. **Mirror/Flip:** Icon-only button (no text label). Toggles horizontal flip.
2. **Filter Presets:** Black & White, Sepia, Monochrome buttons.
3. **Detailed Adjustments:** Brightness, Contrast, Saturation, Hue, Temperature, Tint sliders with numeric inputs.
4. **Rotation:** Slider + numeric input field.

### Filter Presets Behavior

- **Exclusive Toggles:** Only one preset can be active at a time. Activating one deactivates the others.
  - **Black & White:** Sets `saturation: -100`, clears `monochromeColor`, resets any Sepia-specific values.
  - **Sepia:** Sets `temperature: 30, saturation: -50, brightness: 10`, clears `monochromeColor`.
  - **Monochrome:** Sets `monochromeColor` to chosen color, resets saturation to `0`.
- **Visual State:** Active preset shows as toggled-on button; inactive presets show as outline buttons.
- **Clear Preset:** A "None" or "Clear Preset" option resets all preset-specific values.
- **Manual Override:** If the user manually changes any value that was set by a preset (e.g., adjusts saturation after activating Black & White), the preset button visually deactivates (returns to outline style). The manual values remain in place. Activating a preset again will override the manual values.

### Monochrome Control

- Always show the color swatch button (not hidden when inactive).
- The Monochrome button itself indicates active/inactive state.
- Clicking the color swatch opens the color picker popover.
- When Monochrome is inactive, the swatch is visible but muted/disabled.

### Rotation Control

- **Range:** -180.0 to 180.0 degrees (symmetric range).
- **Step:** 0.1 degrees for precision.
- **Input:** Floating-point slider and numeric input field.
- **Reset:** "Reset All" must reset rotation to 0.

### Reset All Behavior

"Reset All" clears everything and returns the image to its original unedited state:

- All adjustment sliders reset to 0 (brightness, contrast, saturation, hue, temperature, tint).
- Rotation resets to 0.
- Mirror resets to off.
- Clears any active preset (no preset active, `monochromeColor: undefined`).

---

## 3. Sidebar & Source Images (Database Integration)

Transition the Image Sidebar to use the database API for source images instead of direct file handling.

### Data Source

- The sidebar must fetch images from the `GET /source-images` API endpoint.
- Query parameters: `album`, `limit`, `page`, `sort_order` (desc|asc), `sort_by` (date_taken|filename|created_at), `used` (true|false|omit for all), `tags` (comma-separated).
- Response provides `SourceImage` objects with `id`, `filepath`, `usage_count`, `date_taken`, `is_used`, etc.
- **Assumption:** The database already contains `SourceImage` records for images in the albums directory (no scan trigger needed).

### Tagging Source Images

- **Trigger:** On hover, a small tag icon appears in the bottom-right corner of the thumbnail.
- **Interaction:** Clicking the tag icon opens a tag popover/popup.
- **Popover Contents:**
  - List of existing tags on the image with remove (X) buttons.
  - Text input to add new tags (with autocomplete suggestions).
  - Tags are stored via `POST /source-images/{id}/tags` and removed via `DELETE /source-images/{id}/tags/{tag_id}`.
- **Popover Behavior:**
  - **Position:** Anchors to the tag icon, opens upward or downward based on available space (use Radix Popover or similar).
  - **Dismissal:** Closes on click outside, pressing Escape, or clicking the tag icon again.
  - **Persistence:** Stays open while adding/removing tags; user explicitly closes it.
  - **Loading State:** Show spinner while tags are being fetched for the image.

### Usage Indicators

- **Definition:** "Used" means the source image is currently assigned to a slot in a saved Gallery Image (`usage_count > 0`).
- **Visual:** Display a small green checkmark badge (`CheckCircle2` icon) in the top-left corner of thumbnails where `usage_count > 0`.
- **Filtering:** The "Usage" filter (All/Used/Unused) in the sidebar header must work based on this database status.

### Thumbnail Display

- Thumbnails are generated on-demand via a new Next.js API endpoint.
- Sidebar fetches thumbnail URLs using the source image ID.
- **Error Handling:** If thumbnail generation fails, display a placeholder image (gray box with image icon). Do not retry automatically. Log errors to console for debugging.

---

## 4. Gallery Page Enhancements

### Collapsible Filter Panel

- Add a full-width collapsible filter panel below the Navigation bar.
- **Expand/Collapse:** Toggle button in the nav bar.
- **Panel Contents:**
  - Tag autocomplete input for filtering by tags.
  - Usage filter buttons: All / On TV / Not on TV.
  - Sort dropdown: Newest First / Oldest First.
- **Collapsed State:** Display a summary chip showing active filter count (e.g., "3 filters active").

### Multi-Select Sync Button Bug

- Investigate and confirm the bug where "Sync" button text is stuck on "Sync 1 Image" regardless of selection count.
- Verify `selectedImages` Set triggers re-renders correctly with immutable updates (`new Set(prev)`).
- Fix any race conditions or stale closures if found.
- Confirm fix during testing phase.

---

## 5. Synchronization (Cleanup)

- Ensure that filters applied in the Edit Image window (presets, adjustments, rotation, crop) are correctly synced to the slot and visible in the final saved Gallery Image.
- Verify the export pipeline (`generateCanvasDataUrl`) applies all transformations consistently.

---

## 6. Backend API Enhancements

### 6.1 Source Images Endpoint Updates

Add new query parameters to `GET /source-images` in `apps/database-service/src/routers/source_images.py`:

| Parameter    | Type            | Description                                                               |
| ------------ | --------------- | ------------------------------------------------------------------------- |
| `album`      | `Optional[str]` | Filter by album name (matches `filepath` starting with `albums/{album}/`) |
| `sort_by`    | `Optional[str]` | Field to sort by: `date_taken` (default), `filename`, `created_at`        |
| `sort_order` | `Optional[str]` | Sort direction: `desc` (default), `asc`                                   |

### Repository Changes

Update `apps/database-service/src/repositories/source_image_repository.py`:

- Add `filepath_prefix` parameter to `get_all_not_deleted_filtered()` for album filtering.
- Add `order_by` and `order_direction` parameters for sorting.
- Update SQL query to include `ORDER BY` clause with configurable field and direction.

### 6.2 Source Image Thumbnail Endpoint

Create new Next.js API route: `apps/web/app/api/source-images/thumbnail/route.ts`

**Endpoint:** `GET /api/source-images/thumbnail?id={source_image_id}`

**Behavior:**

1. Fetch `SourceImage` record from database API to get `filepath`.
2. Resolve full filesystem path from relative `filepath`.
3. Generate thumbnail using Sharp (300px width, JPEG quality 85, auto-orient from EXIF).
4. Return thumbnail as `image/jpeg` response.

**Error Handling:**

- 404 if source image ID not found.
- 500 if thumbnail generation fails.

---

## 7. Frontend API Client Updates

### Add sourceImagesApi to database.ts

In `apps/web/lib/api/database.ts`, add new client functions:

```typescript
export const sourceImagesApi = {
  list: (params: {
    album?: string;
    page?: number;
    limit?: number;
    sortOrder?: "asc" | "desc";
    sortBy?: "date_taken" | "filename" | "created_at";
    used?: boolean;
    tags?: string;
  }) => Promise<PaginatedSourceImages>,

  get: (id: number) => Promise<SourceImage>,

  getTags: (id: number) => Promise<Tag[]>,

  addTag: (id: number, tagName: string, tagColor?: string) => Promise<Tag>,

  removeTag: (id: number, tagId: number) => Promise<void>,

  getThumbnailUrl: (id: number) => string,
};
```

---

## Technical Notes

### Files to Modify

**Frontend:**

- `apps/web/components/SlotEditorModal.tsx` – Full rewrite for new layout.
- `apps/web/components/ImageEditPanel.tsx` – Refactor for sidebar integration, exclusive presets, monochrome swatch.
- `apps/web/components/ImageSidebar/index.tsx` – Switch to database API, add usage badge.
- `apps/web/components/ImageSidebar/ImageThumbnail.tsx` – Add tag icon on hover, usage badge, use new thumbnail endpoint.
- `apps/web/components/ImageSidebar/ImageGrid.tsx` – Update for new data structure from database API.
- `apps/web/app/gallery/page.tsx` – Add collapsible filter panel, fix sync button bug.
- `apps/web/contexts/SidebarContext.tsx` – Update state management for database-backed images.
- `apps/web/lib/api/database.ts` – Add `sourceImagesApi` client functions.

**Backend:**

- `apps/database-service/src/routers/source_images.py` – Add `album`, `sort_by`, `sort_order` query parameters.
- `apps/database-service/src/repositories/source_image_repository.py` – Add filtering and sorting logic.

**New Files:**

- `apps/web/app/api/source-images/thumbnail/route.ts` – New thumbnail generation endpoint.

### API Endpoints Used

- `GET /source-images` – List source images with filtering (enhanced with new parameters).
- `GET /source-images/{id}/tags` – Get tags for a source image.
- `POST /source-images/{id}/tags` – Add tag to source image.
- `DELETE /source-images/{id}/tags/{tag_id}` – Remove tag from source image.
- `GET /api/source-images/thumbnail?id={id}` – New endpoint for thumbnail generation.

### Types

- `ImageAssignment.rotation` – Already supports float; update slider range to -180 to 180.
- `SourceImage` – Includes `usage_count`, `is_used` computed property.
- Add `PaginatedSourceImages` type for list response if not already present.

### Assumptions

- The database already contains `SourceImage` records for all images in the albums directory.
- No new database migrations are required for this sprint.
