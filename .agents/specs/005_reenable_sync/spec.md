## Sprint Overview

This sprint focuses on re-enabling and enhancing TV synchronization functionality with intelligent image management, implementing proper data persistence for images and metadata, and setting up infrastructure for unified development workflows.

**Key Deliverables:**

1. Turborepo setup with root-level dev commands for three services
2. Intelligent TV sync with duplicate detection and selective sync modes
3. Database service (FastAPI) with SQLite + SQLModel ORM
4. OpenAPI-generated TypeScript types for frontend
5. Slideshow/rotation settings management in Settings page
6. Visual indicators in gallery for already-synced images
7. Database-backed tracking of TV content IDs and sync state with bidirectional mapping
8. Dedicated "TV" tab with thumbnail display showing current TV state
9. Source image scanning and metadata extraction from albums
10. TV state refresh button in both gallery and TV tab

## Core Requirements

### 1. Turborepo Setup

Set up a full Turborepo configuration with:

- `turbo.json` for task pipelines
- Root-level `package.json` with workspace configuration
- Unified `dev` command to start three services concurrently:
  - `apps/web` (Next.js on port 3000)
  - `apps/sync-service` (FastAPI on port 8000)
  - `apps/database-service` (FastAPI on port 8001) - **NEW SERVICE**
- Proper caching and parallel execution
- Service startup coordination (database-service first)

### 2. Database Service Architecture

Create a new `apps/database-service` FastAPI microservice:

- Runs on port 8001
- Uses SQLite with SQLModel ORM
- Generates OpenAPI specification at `/openapi.json`
- Frontend TypeScript types auto-generated from OpenAPI spec using code generation tool
- Both Next.js and sync-service access database exclusively through REST API
- Repository pattern for data access
- Alembic for database migrations
- Database file location: `data/frametv.db`
- Starts first before other services

**Key Principles:**

- Single source of truth for all data persistence
- Type-safe communication between services
- Future-proof for migration to PostgreSQL or other databases
- All file paths stored as relative paths to `data/` directory

### 3. Data Models (SQLModel & Pydantic)

Implement the following SQLModel models in database-service:

**SourceImage:**

- `id` (int, primary key)
- `filename` (str)
- `filepath` (str, **relative to data directory** - e.g., "albums/FrameTV - 2022/IMG_1234.jpg")
- `date_taken` (datetime, nullable - extracted from EXIF)
- `is_deleted` (bool, default False)
- `created_at` (datetime)
- `updated_at` (datetime)

**GalleryImage:**

- `id` (int, primary key)
- `filename` (str)
- `filepath` (str, **relative to data directory** - e.g., "saved-images/frametv-mat-20251116.jpg")
- `template_id` (str, reference to template/layout identifier)
- `notes` (str, nullable)
- `created_at` (datetime)
- `updated_at` (datetime)

**ImageSlot:**

- `id` (int, primary key)
- `gallery_image_id` (int, foreign key to GalleryImage)
- `slot_number` (int, e.g., 0, 1, 2 for slot positions)
- `source_image_id` (int, foreign key to SourceImage, nullable)
- `transform_data` (SlotTransform - Pydantic model, stored as JSON)
- `created_at` (datetime)
- `updated_at` (datetime)

**SlotTransform (Pydantic Model - for type-safe transform_data):**

```python
from pydantic import BaseModel

class SlotTransform(BaseModel):
    """Type-safe model for image slot transformations"""
    x: float  # Position X coordinate
    y: float  # Position Y coordinate
    scale: float  # Scale factor (1.0 = 100%)
    rotation: float  # Rotation in degrees (0-360)
    brightness: float  # Brightness adjustment (-1.0 to 1.0)
    contrast: float  # Contrast adjustment (-1.0 to 1.0)
    saturation: float  # Saturation adjustment (-1.0 to 1.0)
    tint: float  # Tint adjustment (-1.0 to 1.0)
    # Add other transform properties as needed
```

**TVContentMapping:**

- `id` (int, primary key)
- `gallery_image_id` (int, foreign key to GalleryImage, **nullable** - null for manually uploaded images)
- `tv_content_id` (str, TV-assigned content ID like "M-C00021234567", unique)
- `uploaded_at` (datetime)
- `last_verified_at` (datetime, nullable)
- `sync_status` (str enum: "synced", "pending", "failed", "manual")
  - "synced" - uploaded via app and verified on TV
  - "pending" - uploaded but not yet verified
  - "failed" - upload failed
  - "manual" - manually uploaded to TV (gallery_image_id is null)

**Settings:**

- `id` (int, primary key)
- `key` (str, unique - e.g., "slideshow_enabled", "slideshow_duration", "tv_ip_address")
- `value` (JSON field to support various data types)
- `updated_at` (datetime)

**Notes:**

- **Tags completely deferred to next sprint** - no Tag, ImageTag, or GalleryImageTag tables in this sprint
- All file paths are **relative to `data/` directory** for portability (e.g., "albums/...", "saved-images/...")
- SlotTransform is a Pydantic model for type safety, serialized to JSON in database
- Use term "gallery image" consistently (not "saved image")

### 4. Source Image Scanning & Sync

Implement album directory scanning to populate and maintain SourceImage records:

**Startup Scan:**

- On database-service startup, scan albums directory (`data/albums/`)
- Recursively discover all image files (jpg, jpeg, png, bmp)
- Create SourceImage records for new files
- Update existing records if filepath changed
- Extract EXIF metadata (date_taken) using PIL/Pillow
- Store filepath relative to data directory (e.g., "albums/FrameTV - 2022/IMG_1234.jpg")
- Log scan results (files added, updated, missing)

**Periodic Filesystem Sync (triggered by refresh action):**

- Compare SourceImage records with actual files on disk
- Mark records as `is_deleted=True` when files are missing
- **Critical:** Do NOT delete records if they're referenced in ImageSlot (used in gallery compositions)
- Add new SourceImage records for newly discovered files
- Update `updated_at` timestamp on all touched records

**Cleanup Job (out of scope for this sprint):**

- Future sprint: Delete SourceImage records marked `is_deleted=True` that have no ImageSlot references

### 5. TV Sync State Management & ID Mapping

**Critical Concept - Bidirectional ID Mapping:**

The TV and our database use different ID systems that must be mapped:

- **Our System:** Each gallery image has a `gallery_image_id` (database primary key)
- **TV System:** When uploaded, TV assigns its own `tv_content_id` (e.g., "M-C00021234567")
- **CRITICAL:** TV API only returns TV's content IDs, never our gallery image IDs
- **Solution:** TVContentMapping table maintains bidirectional mapping: `gallery_image_id` ↔ `tv_content_id`

**Refresh TV State Logic:**

The "Refresh TV State" operation (button in both Gallery page toolbar and TV tab) reconciles our database with TV's actual state:

1. **Query TV:** Call `tv.available('MY-C0002')` → returns list of objects (extract `content_id` property)
2. **Compare with Database:** Query all TVContentMapping records
3. **Identify Removed Images:**
   - Find TVContentMapping records where `tv_content_id` is NOT in TV's returned list
   - These images were removed from TV externally (via SmartThings app or TV interface)
   - Delete these TVContentMapping records from database
4. **Identify Manually Uploaded Images:**
   - Find `tv_content_id` values from TV that are NOT in our TVContentMapping table
   - These are images uploaded manually (not through our app)
   - Create new TVContentMapping records with:
     - `tv_content_id` = TV's content ID
     - `gallery_image_id` = **null** (indicates manual upload, not from our gallery)
     - `sync_status` = "manual"
     - `uploaded_at` = current timestamp
     - `last_verified_at` = current timestamp
5. **Update Verified Timestamps:**
   - For all matching records (images still on TV), update `last_verified_at` to current timestamp
6. **Download Thumbnails:**
   - Call `tv.get_thumbnail_list(content_ids)` to get dictionary of `{filename: bytes}`
   - Clear `data/tv-thumbnails/` directory completely
   - Save thumbnails using the returned filename (e.g. `{tv_content_id}.jpg`)
7. **Return Results:**
   - Counts: total on TV, synced via app, manual uploads, removed
   - Show toast notification with summary
   - Update gallery badges and TV tab display

**Key Points:**

- Refresh is separate from upload/delete operations
- Handles external changes made outside our app
- Maintains accurate sync state in database
- Downloads fresh thumbnails every refresh

### 6. Intelligent TV Upload/Delete (Sync Modes)

Implement smart sync logic using TVContentMapping to track which gallery images are on TV:

**Add Mode:**

- Upload only new gallery images that don't already exist on the TV
- Preserve all existing images on the TV (including manually uploaded)
- Prevent duplicate uploads
- Algorithm:
  1. User selects gallery images (by `gallery_image_id`) in gallery UI
  2. Query TVContentMapping for records matching selected `gallery_image_id` values
  3. Filter out gallery images that already have TVContentMapping records (already on TV)
  4. Upload remaining gallery images to TV using `tv.upload(full_filepath, matte="none")`
  5. TV returns `tv_content_id` for each successful upload
  6. Create TVContentMapping records linking our `gallery_image_id` to TV's `tv_content_id`:
     - `gallery_image_id` = our gallery image ID
     - `tv_content_id` = TV-assigned content ID
     - `sync_status` = "synced"
     - `uploaded_at` = current timestamp
     - `last_verified_at` = current timestamp

**Reset Mode:**

- Delete gallery images from TV that are no longer in the selection
- Upload new gallery images that aren't on the TV
- Keep gallery images that are both selected and already on TV
- **Preserve manually uploaded images** (those with `gallery_image_id` = null)
- Execution order: delete unwanted → upload new → preserve overlapping
- Algorithm:
  1. User selects gallery images (by `gallery_image_id`) in gallery UI
  2. Query TVContentMapping for all records where `gallery_image_id` is NOT null (app-uploaded)
  3. Identify records to delete: TVContentMapping where `gallery_image_id` is NOT in user's selection
  4. For each record to delete:
     - Call `tv.delete(tv_content_id)` to remove from TV
     - Delete TVContentMapping record from database
  5. For selected gallery images without TVContentMapping records:
     - Upload to TV using `tv.upload(full_filepath, matte="none")`
     - TV returns `tv_content_id`
     - Create TVContentMapping record
  6. **Do not touch** manually uploaded images (`sync_status` = "manual", `gallery_image_id` = null)

**Sync Mode Selection UI:**

- When user clicks "Sync" button in gallery (with images selected), show modal dialog
- Two large, clear options with descriptions:
  - Option 1: "Add to existing images on TV" (Add Mode)
    - Description: "Upload new images while keeping all current TV content"
  - Option 2: "Replace all images on TV with selection" (Reset Mode)
    - Description: "Remove unselected images and upload new ones. Manually uploaded images are preserved."
  - Cancel button
- Show count of selected gallery images
- Show preview: "5 new images will be uploaded" or "5 new, 3 removed"

**Implementation Requirements:**

- Use `tv.available('MY-C0002')` - returns list of objects (need to extract `content_id`)
- Use `tv.upload(filepath, matte="none")` - returns `tv_content_id` for uploaded image
- Use `tv.delete(tv_content_id)` - removes image from TV
- Query TVContentMapping by `gallery_image_id` to check if image is on TV
- Never expect TV to return our `gallery_image_id` values
- When uploading, prepend data directory path to relative filepath from database
- Review patterns from `/apps/tvtest/example/`:
  - `async_art_update_from_directory.py` - upload/delete patterns
  - `async_art_slideshow_anything.py` - thumbnail download, content tracking

### 7. TV State Synchronization & Thumbnail Display

**"Refresh TV State" Button Locations:**

- **Gallery Page:** Add "Refresh TV State" button in toolbar (next to Sync button)
- **TV Tab:** "Refresh TV State" button in header
- Both buttons trigger the same sync state refresh logic (section 5)
- Shows loading indicator during operation
- Updates both gallery badges and TV tab thumbnails after completion
- Toast notification shows results: "Found X images on TV (Y synced via app, Z manual)"

**Thumbnail Storage:**

- Directory: `data/tv-thumbnails/`
- On each refresh, clear directory completely and re-download all thumbnails
- Filename provided by TV response (usually `{tv_content_id}.jpg`)
- Thumbnails served via API route for display in frontend

**TV Tab - New Navigation Tab:**

- Add new "TV" tab to main navigation (alongside Gallery, Settings, etc.)
- Tab icon: TV or monitor icon
- Shows thumbnails of all images currently on TV

**TV Tab Content:**

- Header section:
  - "Refresh TV State" button (primary button)
  - Status: "Last refreshed: [timestamp]" or "Not refreshed yet"
  - Summary: "X images on TV (Y synced via app, Z manual)"
- Grid layout showing TV thumbnails:
  - Responsive columns (2-6 columns based on screen width)
  - Each thumbnail displays:
    - Image preview (from `data/tv-thumbnails/{tv_content_id}.jpg`)
    - TV Content ID below image (small text, e.g., "M-C00021234567")
    - Badge indicating sync status from TVContentMapping:
      - Green "Synced" badge: `gallery_image_id` is NOT null (uploaded via app)
      - Blue "Manual" badge: `gallery_image_id` IS null (manually uploaded)
    - Date uploaded (TVContentMapping.uploaded_at, if available)
    - Gallery image filename (from GalleryImage join, if synced via app)
- Loading state during refresh operation
- Error state if TV unreachable (see error handling)
- Empty state: "Click 'Refresh TV State' to see current TV content"

**Handle External TV Changes:**

- User can upload images via SmartThings app or TV interface
- User can delete images via SmartThings app or TV interface
- Refresh operation detects these changes and updates TVContentMapping accordingly
- Manual uploads tracked with `gallery_image_id` = null
- Deleted images: corresponding TVContentMapping records removed

### 8. Slideshow Settings & Authentication UI Updates

**Remove PIN Authentication Workflow:**

- Review Settings page for existing PIN entry UI
- Remove PIN entry fields and workflow if present
- Remove "Authorize" button that leads to PIN entry
- Keep only IP address and port configuration
- Token exchange happens transparently in background via `samsungtvws` library
- Token stored in `data/tv_token.txt` (handled by sync-service)

**Slideshow Settings (Settings Page):**

- Add new "Slideshow Settings" section with:
  - **Enable Slideshow Toggle:** Enable/disable automatic slideshow
  - **Duration Input:** Number input for slideshow interval
    - Range: 3-60 minutes (minimum 3, maximum 60)
    - Note: API documentation suggests any positive integer; verify limits through testing
    - Default: 10 minutes
    - Show validation error if outside range
  - **Slideshow Type:** Radio buttons - "Sequential" or "Shuffle"
    - Sequential = "slideshow"
    - Shuffle = "shuffleslideshow"
- Store settings in database Settings table with keys:
  - `slideshow_enabled` (boolean)
  - `slideshow_duration` (integer, minutes, 3-60)
  - `slideshow_type` (string: "slideshow" or "shuffleslideshow")
- Always use MY_PHOTOS (MY-C0002) category for this sprint
- Design Settings schema to easily support multiple categories in future (add `slideshow_category` key later)

**Apply Slideshow Settings After Sync:**

- After each successful gallery sync operation, automatically query slideshow settings from database
- If slideshow enabled, call `tv.set_slideshow_status(duration, type, category=2)` with stored settings:
  - duration: stored slideshow_duration value (integer)
  - type: True for "shuffleslideshow", False for "slideshow"
  - category: 2 for MY_PHOTOS (MY-C0002)
- If slideshow disabled, call `tv.set_slideshow_status(0, type, category=2)` to turn off
- Note: May need to use `set_auto_rotation_status()` instead depending on TV model - test both
- Log results of slideshow configuration
- Show toast notification confirming slideshow settings applied

### 9. Migration Requirements

**TV Settings Migration:**

- On first database-service startup, check if `data/tv-settings.json` exists
- If exists and database Settings table is empty, migrate settings:
  - `ipAddress` → Settings("tv_ip_address", value)
  - `port` → Settings("tv_port", value)
  - Any other stored settings
- After successful migration, keep JSON file for backward compatibility but prioritize database
- Log migration results

**Gallery Images:**

- No automatic migration of existing saved images from `data/saved-images/`
- User will manually delete existing saved images for fresh start
- Future gallery images will be tracked in database from creation
- When saving new images, create GalleryImage and ImageSlot records
- Store filepath relative to data directory (e.g., "saved-images/frametv-mat-20251116.jpg")

**Database Schema Management:**

- Use Alembic for database migrations in database-service
- Initial migration creates all tables
- If database file is deleted/corrupted:
  - Automatically recreate schema from Alembic migrations
  - Run startup album scan to populate SourceImage records
  - Re-migrate settings from JSON if available

### 10. Metadata Tracking

Track metadata independently of actual image files:

- Extract EXIF data (date_taken) when images are first scanned
- Track which source images appear in each gallery composition via ImageSlot
- Enable future filtering of gallery compositions by source image date
- Tags deferred to next sprint (no tag tables in this sprint)
- Maintain metadata even when source files are deleted (is_deleted flag)

### 11. API Endpoints (Database Service)

The database-service should expose RESTful API endpoints following REST conventions:

**Response Format:**

- Use HTTP status codes directly (200, 201, 400, 404, 500, etc.)
- Return data directly in response body (no envelope like `{success, data}`)
- Error responses: `{"detail": "error message"}` (FastAPI default)
- List endpoints include pagination

**Source Images:**

- `GET /source-images?page=1&limit=50` - List source images (paginated)
  - Response: `{"items": [...], "total": 100, "page": 1, "pages": 2}`
- `GET /source-images/{id}` - Get single source image
- `POST /source-images` - Create source image record
- `PUT /source-images/{id}` - Update source image
- `POST /source-images/scan` - Trigger album scan
  - Response: `{"scanned": 50, "added": 5, "updated": 3, "deleted": 1}`

**Gallery Images:**

- `GET /gallery-images?page=1&limit=50` - List gallery images (paginated)
- `GET /gallery-images/{id}` - Get single gallery image with slots
- `POST /gallery-images` - Create gallery image with slots
- `PUT /gallery-images/{id}` - Update gallery image
- `DELETE /gallery-images/{id}` - Delete gallery image

**TV Content Mapping:**

- `GET /tv-content?page=1&limit=100` - List all TV content mappings (paginated)
- `GET /tv-content/{id}` - Get single mapping
- `POST /tv-content` - Create TV content mapping (when uploading or discovering manual uploads)
- `PUT /tv-content/{id}` - Update TV content mapping (e.g., update last_verified_at)
- `DELETE /tv-content/{id}` - Delete TV content mapping (when image removed from TV)
- `DELETE /tv-content/by-tv-id/{tv_content_id}` - Delete mapping by TV content ID
- `GET /tv-content/by-gallery-image/{gallery_image_id}` - Get TV mapping for gallery image
- `GET /tv-content/by-tv-id/{tv_content_id}` - Get mapping by TV content ID
- `POST /tv-content/refresh` - Trigger TV state refresh (reconcile with TV's current state)
  - Request body: `{"tv_content_ids": ["M-C00021234567", ...]}`
  - Response: `{"removed": 2, "added": 1, "updated": 15}`

**Settings:**

- `GET /settings` - Get all settings (no pagination needed, small dataset)
- `GET /settings/{key}` - Get setting by key
- `PUT /settings/{key}` - Update or create setting
- `POST /settings/migrate` - Trigger migration from JSON
  - Response: `{"migrated": ["tv_ip_address", "tv_port"], "skipped": []}`

**Health & Info:**

- `GET /health` - Health check endpoint
  - Response: `{"status": "healthy", "database": "connected"}`
- `GET /openapi.json` - OpenAPI specification

### 12. Frontend Type Generation

Set up automatic TypeScript type generation from database-service OpenAPI spec:

- Use tool like `openapi-typescript` or `openapi-generator`
- Add npm script to generate types: `npm run generate-types`
- Generate types into `apps/web/types/database-api.ts`
- Run generation as part of dev startup or as separate step
- Types should include all request/response models, including SlotTransform
- Update frontend API calls to use generated types

### 13. UI Updates

**Gallery Page Updates:**

_Toolbar Buttons:_

- Existing "Sync" button (when images selected)
- **New: "Refresh TV State" button** (always visible in toolbar)
  - Triggers sync state refresh logic (section 5)
  - Shows loading indicator during operation
  - Updates gallery badges after completion
  - Toast notification with results

_Visual Indicators:_

- Badge in upper left corner of gallery images indicating sync status:
  - Green checkmark: Image is on TV (TVContentMapping exists for this gallery_image_id)
  - No badge: Image not on TV (no TVContentMapping record)
- Query TVContentMapping table by gallery_image_id to determine badge state

_Sync Modal Dialog:_

- Triggered when "Sync" button clicked with gallery images selected
- Two large, clear options with descriptions
- Show count of selected gallery images
- Show preview of what will happen
- Confirm button for selected mode
- Cancel button to abort

**TV Tab (New):**

_Tab Navigation:_

- Add "TV" tab to main navigation (alongside Gallery, Settings, etc.)
- Tab icon: TV or monitor icon

_Tab Content:_

- Header with "Refresh TV State" button and status/summary
- Grid of thumbnails showing all TV content
- Each thumbnail with image, content ID, badge, date
- Empty state, loading state, error state (see section 7)

**Settings Page Updates:**

_Remove PIN Workflow:_

- Remove PIN entry field and authorize workflow if present
- Keep only:
  - TV IP Address input
  - Port input (default: 8002)
  - Save button

_Add Slideshow Settings Section:_

- Section title: "Slideshow Settings"
- Enable Slideshow toggle (on/off)
- Duration input: number field with validation (3-60 minutes)
  - Show validation error if outside range
- Type selector: Radio buttons "Sequential" or "Shuffle"
- Save button (or auto-save on change)

### 14. Error Handling & Offline Mode

**TV Offline/Unreachable:**

- When sync or refresh operation fails due to TV being unreachable:
  - Show clear error toast/notification: "Unable to connect to TV"
  - Include helpful troubleshooting message:
    - "Please verify: TV is powered on, TV is on the same network, IP address is correct"
  - In TV tab, show error state with retry button
  - In gallery, disable sync button and show warning banner

**Database Service Unavailable:**

- If database-service is not running:
  - Show error banner in app: "Database service unavailable"
  - Retry connection with exponential backoff
  - Disable features that require database

**Graceful Degradation:**

- Gallery page should work in read-only mode if TV is offline
- Settings should be editable even if TV is offline
- TV tab should show cached thumbnails if available and refresh fails

### 15. Service Startup Order & Health Checks

**Startup Sequence:**

1. **Database Service** starts first (port 8001)
   - Run Alembic migrations
   - Perform startup album scan
   - Expose `/health` endpoint
2. **Sync Service** starts after database service ready (port 8000)
   - Poll database service `/health` endpoint until healthy (with timeout)
   - Initialize TV connection (requires `await tv.start_listening()`)
   - Expose `/health` endpoint
3. **Web Frontend** starts last (port 3000)
   - Can poll sync-service and database-service health endpoints
   - Gracefully handle service unavailability with retry logic

**Health Check Endpoints:**

- All services expose `GET /health` endpoint
- Response format: `{"status": "healthy"}` (200) or `{"status": "unhealthy", "detail": "..."}` (503)
- Database service checks database connection
- Sync service checks database service availability (not TV - TV check too slow)
- Web checks both services (optional, can be done on-demand in UI)

**Turborepo Configuration:**

- Configure startup in `turbo.json` and root `package.json` scripts
- Use npm tools like `wait-on` to ensure database-service health before starting others
- Log startup sequence clearly for debugging
- Example dev script: `wait-on http://localhost:8001/health && npm run dev:sync`

### 16. Testing Considerations

**Database Service:**

- Unit tests for repository methods
- Integration tests for API endpoints
- Test migration scripts
- Test album scan logic
- Test SlotTransform Pydantic model validation

**Sync Service:**

- Unit tests for sync logic (Add Mode, Reset Mode)
- Mock TV API for testing
- Test TVContentMapping CRUD operations
- Test slideshow settings application
- Test refresh TV state logic

**Frontend:**

- E2E tests for sync workflow
- Test modal dialog interactions
- Test refresh TV state functionality
- Verify type safety with generated types
- Test TV tab thumbnail display
- Test gallery badge updates

## Technical Details

### File Paths Referenced

**Existing:**

- `/apps/web/` - Next.js frontend
- `/apps/sync-service/` - Existing sync service
- `/apps/tvtest/example/` - TV API example code (authoritative patterns)
- `/data/albums/` - Source image directories
- `/data/saved-images/` - Gallery images (saved compositions)
- `/data/tv-settings.json` - Current settings file (to be migrated)

**New:**

- `/apps/database-service/` - New database API service
- `/apps/database-service/alembic/` - Database migrations
- `/apps/database-service/repositories/` - Data access layer
- `/apps/database-service/models/` - SQLModel and Pydantic models
- `/data/frametv.db` - SQLite database file
- `/data/tv_token.txt` - TV authentication token
- `/data/tv-thumbnails/` - TV thumbnail cache (cleared on each refresh)
- `/turbo.json` - Turborepo configuration
- `/package.json` - Root package.json for monorepo

### Dependencies to Add

**Root:**

- `turbo` - Turborepo

**Database Service (new):**

- `fastapi`
- `uvicorn[standard]`
- `sqlmodel`
- `alembic`
- `pillow` (for EXIF extraction)
- `python-multipart` (for file uploads if needed)
- `pydantic` (included with SQLModel)

**Sync Service:**

- No new dependencies (uses existing `samsungtvws` library)

**Web:**

- `openapi-typescript` or `openapi-generator-cli` (dev dependency)
- `wait-on` (dev dependency - for service startup coordination)

### Environment Variables

**Database Service:**

- `DATABASE_URL` - SQLite connection string (default: `sqlite:///../../data/frametv.db`)
- `ALBUMS_PATH` - Path to albums directory (default: `../../data/albums`)
- `DATA_PATH` - Base data directory path (default: `../../data`)
- `PORT` - Service port (default: 8001)

**Sync Service:**

- `DATABASE_SERVICE_URL` - Database service URL (default: `http://localhost:8001`)
- `TV_TOKEN_FILE` - Path to token file (default: `../../data/tv_token.txt`)
- `TV_THUMBNAILS_PATH` - Path to thumbnail cache (default: `../../data/tv-thumbnails`)
- `DATA_PATH` - Base data directory path (default: `../../data`)
- `PORT` - Service port (default: 8000)

**Web:**

- `NEXT_PUBLIC_DATABASE_SERVICE_URL` - Database service URL (default: `http://localhost:8001`)
- `NEXT_PUBLIC_SYNC_SERVICE_URL` - Sync service URL (default: `http://localhost:8000`)
- `PORT` - Service port (default: 3000)

## Out of Scope (Deferred to Future Sprints)

- Drag-and-drop slot replacement fix
- UI polish (tint icon, compact spacing, visual template selector)
- Image filters (B&W, sepia, monochrome)
- Double-click slot editing with zoom/pan
- Generative fill for cropping
- Layout additions/removals
- **Tags completely deferred** - no Tag, ImageTag, or GalleryImageTag tables this sprint
- Tag-based filtering in gallery
- Cleanup job for unused deleted source images
- Advanced thumbnail management (caching, optimization)
- Multiple slideshow profiles
- Category selection beyond MY_PHOTOS
- Automatic periodic TV state polling (only on-demand refresh for now)
- Image comparison/deduplication
- Batch operations on multiple images
- "Adopt" functionality for manually uploaded images (nice-to-have)
- Automatic database record creation when saving gallery images (will integrate manually for now)

## Success Criteria

- [ ] Root-level `npm run dev` starts all three services in correct order
- [ ] Database service starts first, runs migrations, performs album scan
- [ ] Database service exposes OpenAPI spec at `/openapi.json`
- [ ] TypeScript types auto-generated from OpenAPI spec include SlotTransform
- [ ] Health check endpoints work on all services
- [ ] All file paths stored as relative paths to data directory
- [ ] SlotTransform Pydantic model provides type-safe transform_data
- [ ] No tag-related tables in database (deferred to next sprint)
- [ ] GalleryImage model used consistently (not SavedGalleryImage)
- [ ] Settings page has slideshow configuration (3-60 minutes range)
- [ ] Settings page has PIN workflow removed (only IP and port)
- [ ] New "TV" tab added to navigation showing TV thumbnails
- [ ] Gallery page has "Refresh TV State" button in toolbar
- [ ] TV tab also has "Refresh TV State" button
- [ ] Refresh TV State correctly reconciles TVContentMapping with TV's actual state
- [ ] Refresh detects and tracks manually uploaded images (gallery_image_id = null)
- [ ] Refresh removes TVContentMapping records for images deleted from TV
- [ ] Refresh downloads all thumbnails to data/tv-thumbnails/ with tv_content_id filenames
- [ ] Thumbnails show correct badges based on gallery_image_id: "Synced" (green) or "Manual" (blue)
- [ ] Gallery shows green checkmark badges for images with TVContentMapping records
- [ ] Sync button shows modal with Add/Reset mode options
- [ ] Add Mode uploads only new gallery images, preserves all TV content
- [ ] Reset Mode removes unselected gallery images, preserves manual uploads
- [ ] TVContentMapping correctly stores bidirectional mapping (gallery_image_id ↔ tv_content_id)
- [ ] Sync logic handles fact that TV only returns tv_content_id values, not our IDs
- [ ] Upload operation creates TVContentMapping with both IDs
- [ ] Slideshow settings automatically applied after each sync
- [ ] TV settings migrated from JSON to database on first startup
- [ ] All database operations use database-service REST API
- [ ] Type safety enforced with generated types
- [ ] Clear error messages when TV is offline/unreachable
- [ ] Services handle unavailability gracefully with retries

## Risks & Assumptions

**Risks:**

- Three-service architecture adds complexity
- TV WebSocket API may have undocumented quirks
- Thumbnail download may be slow for many images
- Concurrent database access needs careful handling (SQLite limitations)
- SQLModel learning curve if team unfamiliar
- Service startup coordination may be fragile
- Bidirectional ID mapping must be maintained correctly or sync breaks

**Assumptions:**

- TV API examples in `/apps/tvtest/example/` are authoritative and current
- User will manually delete old saved images (no migration needed)
- SQLite sufficient for current scale (single user, local machine)
- TV assigns persistent content IDs that don't change
- Token file authentication works reliably
- Slideshow duration limits are 3-60 minutes (to be verified through testing)
- TV's `available()` method returns complete list of content IDs accurately

**Dependencies:**

- Requires working TV on local network
- Requires Python 3.12+ for sync-service and database-service
- Requires Node.js 18+ for web frontend
- Requires sufficient disk space for thumbnail cache

## Critical Implementation Notes

### TV API ID Handling (MOST IMPORTANT)

**CRITICAL:** The TV API only returns its own content IDs (`tv_content_id`), never our gallery image IDs. This is the most important concept to understand:

1. **Our Database:** Uses `gallery_image_id` as primary key for GalleryImage table
2. **TV's Database:** Uses `tv_content_id` (e.g., "M-C00021234567") as its identifier
3. **The Problem:** TV never knows about or returns our `gallery_image_id` values
4. **The Solution:** TVContentMapping table maintains the bidirectional mapping

**Implementation Requirements:**

- When uploading: `tv.upload()` returns `tv_content_id` → create TVContentMapping record
- When querying TV: `tv.available()` returns list of objects (extract `content_id` from them)
- When checking if gallery image is on TV: Query TVContentMapping by `gallery_image_id`
- When identifying what gallery image a TV content ID belongs to: Query TVContentMapping by `tv_content_id`
- Manual uploads have `gallery_image_id` = null in TVContentMapping (no corresponding gallery image)

### File Path Storage

- **All file paths in database are relative to `data/` directory**
- Example SourceImage.filepath: `"albums/FrameTV - 2022/IMG_1234.jpg"`
- Example GalleryImage.filepath: `"saved-images/frametv-mat-20251116.jpg"`
- When reading/writing files, prepend data directory path at runtime
- This ensures portability if data directory moves or project is copied

### Sync State Refresh vs Upload/Delete

- **Refresh TV State** (section 5): Reconciles database with TV's current state, handles external changes
- **Sync Modes** (section 6): User-initiated upload/delete operations for selected gallery images
- These are separate operations with different purposes
- Refresh should be run before sync to ensure accurate state

### Type Safety with Pydantic

- SlotTransform Pydantic model ensures transform_data is type-safe
- SQLModel will serialize/deserialize JSON automatically
- Frontend types generated from OpenAPI spec include SlotTransform structure
- End-to-end type safety from database to frontend

### Terminology

- Use "gallery image" consistently (not "saved image", "saved gallery image", etc.)
- Use "source image" for images in albums directory
- Use "TV content" or "TV content ID" when referring to TV's identifiers

### Other Notes

- Follow examples in `/apps/tvtest/example/` directory carefully:
  - `async_art_update_from_directory.py` - for upload/delete patterns
  - `async_art_slideshow_anything.py` - for thumbnail download and content tracking
- Use `SamsungTVAsyncArt` class from `samsungtvws` library
- Respect TV API rate limits and connection management
- Log all TV operations for debugging
- Test slideshow duration limits (3-60 minutes) with actual TV to confirm
- Clear `data/tv-thumbnails/` directory completely on each refresh to avoid stale data
- Tags completely removed from this sprint - will add comprehensive tagging in next sprint
