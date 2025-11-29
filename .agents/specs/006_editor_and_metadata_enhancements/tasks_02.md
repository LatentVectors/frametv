# Spec Tasks

Dependency Order:
Backend tasks (1-2) come first
Frontend API client (3) builds on backend
Sidebar integration (4-5) uses the API client
Slot editor tasks (6-9) are grouped by component
Gallery enhancements (10-11) are independent
Verification (12) comes last

## Tasks

- [x] 1. Backend API: Add Sorting and Filtering to Source Images Endpoint

  - [x] 1.1 Add `album`, `sort_by`, `sort_order` query parameters to `GET /source-images` in `apps/database-service/src/routers/source_images.py`
  - [x] 1.2 Update `source_image_repository.py` to add `filepath_prefix` parameter for album filtering (matches `filepath` starting with `albums/{album}/`)
  - [x] 1.3 Add `order_by` and `order_direction` parameters to repository method `get_all_not_deleted_filtered()`
  - [x] 1.4 Update SQL query to include `ORDER BY` clause with configurable field (`date_taken`, `filename`, `created_at`) and direction (`asc`, `desc`)
  - [x] 1.5 Test endpoint with various parameter combinations to verify filtering and sorting work correctly

- [x] 2. Backend API: Create Source Image Thumbnail Endpoint

  - [x] 2.1 Create new Next.js API route at `apps/web/app/api/source-images/thumbnail/route.ts`
  - [x] 2.2 Implement handler to accept `id` query parameter and fetch `SourceImage` record from database API
  - [x] 2.3 Resolve full filesystem path from relative `filepath` in the SourceImage record
  - [x] 2.4 Generate thumbnail using Sharp (300px width, JPEG quality 85, auto-orient from EXIF)
  - [x] 2.5 Return thumbnail as `image/jpeg` response with proper error handling (404 for not found, 500 for generation failure)

- [x] 3. Frontend API Client: Add sourceImagesApi Functions

  - [x] 3.1 Add `PaginatedSourceImages` type to types file if not already present
  - [x] 3.2 Create `sourceImagesApi.list()` function with params: `album`, `page`, `limit`, `sortOrder`, `sortBy`, `used`, `tags`
  - [x] 3.3 Create `sourceImagesApi.get()` function to fetch single source image by ID
  - [x] 3.4 Create `sourceImagesApi.getTags()`, `sourceImagesApi.addTag()`, and `sourceImagesApi.removeTag()` functions
  - [x] 3.5 Create `sourceImagesApi.getThumbnailUrl()` helper that returns the thumbnail endpoint URL for a given ID

- [x] 4. Sidebar: Switch to Database API for Source Images

  - [x] 4.1 Update `SidebarContext.tsx` to fetch images from `sourceImagesApi.list()` instead of direct file handling
  - [x] 4.2 Update `ImageSidebar/index.tsx` to use database-backed state and pass `SourceImage` objects to children
  - [x] 4.3 Update `ImageGrid.tsx` to handle the new `SourceImage` data structure from database API
  - [x] 4.4 Update `ImageThumbnail.tsx` to use `sourceImagesApi.getThumbnailUrl()` for thumbnail URLs
  - [x] 4.5 Add placeholder image display (gray box with image icon) when thumbnail fails to load
  - [x] 4.6 Add green checkmark badge (`CheckCircle2` icon) in top-left corner for thumbnails where `usage_count > 0`
  - [x] 4.7 Update "Usage" filter (All/Used/Unused) in sidebar header to filter based on database `is_used` status

- [x] 5. Sidebar: Implement Source Image Tagging

  - [x] 5.1 Add tag icon that appears on hover in the bottom-right corner of `ImageThumbnail.tsx`
  - [x] 5.2 Create tag popover component using Radix Popover (anchored to tag icon, opens upward/downward based on space)
  - [x] 5.3 Implement popover contents: list of existing tags with remove (X) buttons
  - [x] 5.4 Add text input with autocomplete suggestions for adding new tags
  - [x] 5.5 Connect add/remove tag actions to `sourceImagesApi.addTag()` and `sourceImagesApi.removeTag()`
  - [x] 5.6 Add loading spinner while tags are being fetched
  - [x] 5.7 Implement dismissal behavior: close on click outside, Escape key, or clicking tag icon again

- [x] 6. Slot Editor: Create Full-Screen Overlay Layout

  - [x] 6.1 Refactor `SlotEditorModal.tsx` to use full-viewport overlay (`fixed inset-0 z-50`)
  - [x] 6.2 Implement minimal header with "Cancel" (left) and "Save" (right) buttons only
  - [x] 6.3 Create left sidebar container (fixed width ~320px) for controls
  - [x] 6.4 Set up main area canvas to fill remaining space
  - [x] 6.5 Implement local state for changes within the overlay (not committed until Save)
  - [x] 6.6 Wire up Cancel button to discard all changes and close overlay
  - [x] 6.7 Wire up Save button to commit changes to slot and close overlay
  - [x] 6.8 Initialize local state from existing `ImageAssignment` when opening editor for slot with existing transforms

- [x] 7. Slot Editor: Implement Image Adjustments Sidebar

  - [x] 7.1 Refactor `ImageEditPanel.tsx` for integration as left sidebar in full-screen editor
  - [x] 7.2 Add Mirror/Flip icon-only button at top of sidebar (toggles horizontal flip)
  - [x] 7.3 Implement Brightness, Contrast, Saturation, Hue, Temperature, Tint sliders with numeric inputs
  - [x] 7.4 Add Rotation control with slider + numeric input (range -180.0 to 180.0, step 0.1)
  - [x] 7.5 Ensure all controls update local state and preview in real-time

- [x] 8. Slot Editor: Implement Filter Presets with Exclusive Toggle Behavior

  - [x] 8.1 Add Filter Presets section with Black & White, Sepia, Monochrome buttons below Mirror control
  - [x] 8.2 Implement exclusive toggle logic: activating one preset deactivates others
  - [x] 8.3 Implement Black & White preset: sets `saturation: -100`, clears `monochromeColor`
  - [x] 8.4 Implement Sepia preset: sets `temperature: 30, saturation: -50, brightness: 10`, clears `monochromeColor`
  - [x] 8.5 Implement Monochrome preset: sets `monochromeColor` to chosen color, resets saturation to `0`
  - [x] 8.6 Add always-visible color swatch for Monochrome (muted/disabled when inactive, opens color picker on click)
  - [x] 8.7 Implement manual override detection: visually deactivate preset button when user manually changes a preset value
  - [x] 8.8 Add "Reset All" button that clears all adjustments, rotation, mirror, and active preset to original state

- [x] 9. Slot Editor: Implement Always-Active Cropping

  - [x] 9.1 Remove separate "Pan/Crop" mode toggle; cropping is always enabled
  - [x] 9.2 Display crop handles always visible, locked to slot's aspect ratio
  - [x] 9.3 Implement drag-to-reposition crop region
  - [x] 9.4 Implement drag corners to resize crop (maintaining aspect ratio)
  - [x] 9.5 Add pan via mouse drag within crop region
  - [x] 9.6 Add zoom via scroll wheel
  - [x] 9.7 Auto-calculate aspect-ratio-constrained crop to fill slot when no crop is defined

- [x] 10. Gallery Page: Add Collapsible Filter Panel

  - [x] 10.1 Create full-width collapsible filter panel component below Navigation bar
  - [x] 10.2 Add expand/collapse toggle button in the nav bar
  - [x] 10.3 Implement tag autocomplete input for filtering by tags in panel
  - [x] 10.4 Add Usage filter buttons: All / On TV / Not on TV
  - [x] 10.5 Add Sort dropdown: Newest First / Oldest First
  - [x] 10.6 Display summary chip showing active filter count when panel is collapsed (e.g., "3 filters active")

- [x] 11. Gallery Page: Fix Multi-Select Sync Button Bug

  - [x] 11.1 Investigate sync button showing "Sync 1 Image" regardless of selection count
  - [x] 11.2 Verify `selectedImages` Set triggers re-renders with immutable updates (`new Set(prev)`)
  - [x] 11.3 Check for race conditions or stale closures in selection handling
  - [x] 11.4 Implement fix and verify button text updates correctly with selection count
