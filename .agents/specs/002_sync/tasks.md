# Spec Tasks

## Tasks

- [x] 1. Restructure project to monorepo layout

  - [x] 1.1 Create `apps/web/` directory structure
  - [x] 1.2 Move Next.js directories (`app/`, `components/`, `lib/`, `hooks/`, `types/`) to `apps/web/`
  - [x] 1.3 Move Next.js config files (`next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `components.json`) to `apps/web/`
  - [x] 1.4 Move `package.json` and `package-lock.json` to `apps/web/`
  - [x] 1.5 Verify all imports still work (update any absolute imports if needed)
  - [x] 1.6 Test that Next.js app runs from `apps/web/` directory

- [x] 2. Create shared data directory structure

  - [x] 2.1 Create `./data/` directory at project root
  - [x] 2.2 Create `./data/saved-images/` subdirectory
  - [x] 2.3 Add `.gitignore` entry for `./data/` directory (if not already present)
  - [x] 2.4 Create utility function to ensure data directories exist (for use in API routes)

- [x] 3. Implement save button component and API route

  - [x] 3.1 Create `apps/web/components/SaveButton.tsx` component (similar to ExportButton)
  - [x] 3.2 Create `apps/web/app/api/save/route.ts` API route to handle image saving
  - [x] 3.3 Implement file saving logic with timestamp filename format (`frametv-mat-{timestamp}.jpg`)
  - [x] 3.4 Add SaveButton to `apps/web/app/page.tsx` alongside ExportButton
  - [x] 3.5 Implement toast notification on successful save
  - [x] 3.6 Ensure SaveButton uses same canvas export process as ExportButton

- [x] 4. Create gallery API route and utilities

  - [x] 4.1 Create `apps/web/lib/galleryUtils.ts` with image listing functions
  - [x] 4.2 Create `apps/web/app/api/gallery/route.ts` API route
  - [x] 4.3 Implement pagination logic (page, limit parameters)
  - [x] 4.4 Return image metadata (filename, filepath, createdAt, size)
  - [x] 4.5 Implement sorting by creation date (newest first)
  - [x] 4.6 Add error handling for missing directory or file read errors

- [x] 5. Build gallery page UI with infinite scroll

  - [x] 5.1 Create `apps/web/app/gallery/page.tsx` component
  - [x] 5.2 Implement masonry layout for thumbnails (maintain aspect ratios)
  - [x] 5.3 Implement infinite scroll (load 50 images initially, 50 per batch)
  - [x] 5.4 Add loading states and empty state handling
  - [x] 5.5 Display image thumbnails with proper aspect ratio preservation
  - [x] 5.6 Handle scroll detection and fetch next batch when near bottom

- [x] 6. Implement image selection functionality

  - [x] 6.1 Add click-to-select state management in gallery page
  - [x] 6.2 Implement visual indicator for selected images (border/overlay)
  - [x] 6.3 Add "Sync Selected" button that appears when images are selected
  - [x] 6.4 Display count of selected images in button text (e.g., "Sync 3 Images")
  - [x] 6.5 Implement toggle selection on thumbnail click
  - [x] 6.6 Store selected image filepaths for sync operation

- [x] 7. Create settings page UI

  - [x] 7.1 Create `apps/web/app/settings/page.tsx` component
  - [x] 7.2 Add form fields for TV IP address and port (default: 8002)
  - [x] 7.3 Implement "Connect & Authorize" button
  - [x] 7.4 Add PIN input modal/field for authorization
  - [x] 7.5 Display connection status and error messages
  - [x] 7.6 Add loading states during connection/authorization

- [x] 8. Implement settings API routes

  - [x] 8.1 Create `apps/web/lib/settingsUtils.ts` for reading/writing settings
  - [x] 8.2 Create `apps/web/app/api/settings/route.ts` (GET and POST handlers)
  - [x] 8.3 Implement reading settings from `./data/tv-settings.json`
  - [x] 8.4 Implement writing settings to `./data/tv-settings.json`
  - [x] 8.5 Add validation for IP address and port fields
  - [x] 8.6 Return `isConfigured` flag based on settings file existence

- [x] 9. Create sync service FastAPI structure and models

  - [x] 9.1 Create `apps/sync-service/` directory
  - [x] 9.2 Create `apps/sync-service/requirements.txt` with dependencies
  - [x] 9.3 Create `apps/sync-service/models.py` with Pydantic models (ConnectRequest, ConnectResponse, AuthorizeRequest, AuthorizeResponse, SyncRequest, SyncResponse)
  - [x] 9.4 Create `apps/sync-service/main.py` with FastAPI app setup
  - [x] 9.5 Configure CORS for Next.js app (localhost:3000)
  - [x] 9.6 Add environment variable support for service port (default: 8000)
  - [x] 9.7 Create `apps/sync-service/README.md` with setup and run instructions

- [x] 10. Implement sync service TV connection and authorization

  - [x] 10.1 Create `apps/sync-service/tv_sync.py` with TV connection logic
  - [x] 10.2 Implement `POST /connect` endpoint to initiate TV connection
  - [x] 10.3 Handle PIN request flow (detect when PIN is required)
  - [x] 10.4 Implement `POST /authorize` endpoint to complete authorization with PIN
  - [x] 10.5 Save token to `../../data/tv_token.txt` after successful authorization
  - [x] 10.6 Add error handling for connection failures and invalid PINs
  - [x] 10.7 Use `SamsungTVWS` with proper token file path resolution

- [x] 11. Implement sync service TV sync functionality

  - [x] 11.1 Implement `POST /sync` endpoint in sync service
  - [x] 11.2 Add logic to connect to TV using token from `../../data/tv_token.txt`
  - [x] 11.3 Implement Art Mode activation (`tv.art().set_artmode(True)`)
  - [x] 11.4 Implement image upload loop with `matte='none'` parameter
  - [x] 11.5 Add slideshow timer setting (`set_slideshow_options(change_interval=timer)`)
  - [x] 11.6 Track successful and failed uploads
  - [x] 11.7 Return detailed sync response with success/failure counts
  - [x] 11.8 Add comprehensive error handling for TV operations

- [x] 12. Create Next.js sync API proxy routes

  - [x] 12.1 Create `apps/web/app/api/settings/connect/route.ts` to proxy to sync service
  - [x] 12.2 Create `apps/web/app/api/settings/authorize/route.ts` to proxy to sync service
  - [x] 12.3 Create `apps/web/app/api/sync/route.ts` to proxy sync requests
  - [x] 12.4 Implement error handling for sync service unavailability
  - [x] 12.5 Configure sync service URL (default: `http://localhost:8000`)
  - [x] 12.6 Forward request bodies and return service responses
  - [x] 12.7 Add proper error messages when service is not running

- [x] 13. Add sync controls to gallery page

  - [x] 13.1 Add timer dropdown/select component with slideshow options (3m, 5m, 10m, 15m, 1h, 3h, 6h, 12h, 24h)
  - [x] 13.2 Set default timer to 15 minutes
  - [x] 13.3 Implement "Sync to TV" button that calls sync API
  - [x] 13.4 Add progress bar component for sync progress
  - [x] 13.5 Display success notification with count of synced images
  - [x] 13.6 Display error messages for failed images
  - [x] 13.7 Handle partial sync success (show both success and failure counts)

- [x] 14. Add TV configuration check and navigation
  - [x] 14.1 Add banner to gallery page when TV not configured (check for `../../data/tv_token.txt`)
  - [x] 14.2 Banner message: "TV not configured. Please go to Settings to set up your Frame TV connection."
  - [x] 14.3 Add link to `/settings` page from banner
  - [x] 14.4 Add navigation links between editor (`/`) and gallery (`/gallery`) in layout or top bar
  - [x] 14.5 Add navigation link to settings page (`/settings`)
  - [x] 14.6 Update `apps/web/app/layout.tsx` or create navigation component
