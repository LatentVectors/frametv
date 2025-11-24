# Spec Tasks

## Tasks

- [x] 1. Turborepo Setup & Project Structure

  - [x] 1.1 Configure `turbo.json` with pipelines for `dev`, `build`, and `start`.
  - [x] 1.2 Update root `package.json` to define workspaces and unified `dev` script.
  - [x] 1.3 Create `apps/database-service` directory structure with standard FastAPI layout.
  - [x] 1.4 Configure `wait-on` in `dev` scripts to ensure Database Service starts before others.
  - [x] 1.5 Verify all three services (web, sync, database) start concurrently with correct ordering.

- [x] 2. Database Service Infrastructure & Models

  - [x] 2.1 Install dependencies (`sqlmodel`, `alembic`, `fastapi`, `uvicorn`) in database-service.
  - [x] 2.2 Configure SQLite database connection (`data/frametv.db`) and Alembic setup.
  - [x] 2.3 Implement `SourceImage` and `GalleryImage` SQLModel classes.
  - [x] 2.4 Implement `ImageSlot`, `SlotTransform` (Pydantic), and `TVContentMapping` models.
  - [x] 2.5 Implement `Settings` model and generate initial Alembic migration.

- [x] 3. Database Service Repositories & API

  - [x] 3.1 Implement generic Repository pattern for CRUD operations.
  - [x] 3.2 Create REST endpoints for `SourceImage` (CRUD + pagination).
  - [x] 3.3 Create REST endpoints for `GalleryImage` and related `ImageSlot`s.
  - [x] 3.4 Create REST endpoints for `TVContentMapping` and `Settings`.
  - [x] 3.5 Expose `/health` and `/openapi.json` endpoints.

- [x] 4. Album Scanner Implementation

  - [x] 4.1 Implement recursive directory scanner for `data/albums/`.
  - [x] 4.2 Implement EXIF metadata extraction (date_taken) using Pillow.
  - [x] 4.3 Create logic to sync file system state with `SourceImage` table (add new, mark deleted).
  - [x] 4.4 Create `POST /source-images/scan` endpoint to trigger scan.
  - [x] 4.5 Wire up scanner to run on service startup.

- [x] 5. Frontend Types & API Clients

  - [x] 5.1 Configure `openapi-typescript` to generate types from Database Service.
  - [x] 5.2 Create type-safe API client wrapper for Database Service.
  - [x] 5.3 Update existing Sync Service client to use strictly typed interfaces.
  - [x] 5.4 Verify `SlotTransform` type is correctly generated and usable in frontend.

- [x] 6. Sync Service - TV State Refresh

  - [x] 6.1 Update Sync Service to connect to Database Service.
  - [x] 6.2 Implement `tv.available()` logic to fetch current TV content IDs.
  - [x] 6.3 Implement reconciliation logic (detect removed, identify manual uploads).
  - [x] 6.4 Implement thumbnail download logic (`tv.get_thumbnail_list`) to `data/tv-thumbnails/`.
  - [x] 6.5 Expose `POST /tv-content/refresh` endpoint.

- [x] 7. Sync Service - Smart Sync Modes

  - [x] 7.1 Implement "Add Mode" logic: Filter selected against DB, upload new (`matte='none'`), save mapping.
  - [x] 7.2 Implement "Reset Mode" logic: Identify unselected app-managed images, delete from TV, upload new.
  - [x] 7.3 Ensure "Reset Mode" preserves manually uploaded images (`gallery_image_id` is null).
  - [x] 7.4 Update sync endpoints to accept mode parameter and handle `SlotTransform` data if needed.

- [x] 8. Frontend - Gallery UI Enhancements

  - [x] 8.1 Add "Refresh TV State" button to toolbar with loading state.
  - [x] 8.2 Implement "Synced" visual badge (green checkmark) on gallery items using `TVContentMapping` data.
  - [x] 8.3 Create Sync Modal with "Add" vs "Reset" mode selection and preview counts.
  - [x] 8.4 Wire up Sync Modal to trigger appropriate Sync Service endpoint.

- [x] 9. Frontend - TV Tab Implementation

  - [x] 9.1 Create new `/tv` route and navigation item.
  - [x] 9.2 Implement grid layout for TV content thumbnails.
  - [x] 9.3 Display metadata (Content ID, sync status badge, upload date) for each item.
  - [x] 9.4 Connect "Refresh TV State" button on TV tab.

- [x] 10. Settings & Slideshow Logic
  - [x] 10.1 Remove legacy PIN authentication UI from Settings page.
  - [x] 10.2 Add Slideshow configuration UI (Duration, Type) and save to `Settings` table.
  - [x] 10.3 Implement migration logic to import `tv-settings.json` on startup if DB empty.
  - [x] 10.4 Update Sync Service to apply slideshow settings (`tv.set_slideshow_status`) after sync.
