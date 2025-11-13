# Sprint 002: Image Save and Sync to Frame TV

## Overview

This sprint adds functionality to save edited images to a local directory, view saved images in a gallery, and sync selected images to a Samsung Frame TV. The sprint includes:

1. **Save Button**: Add a save button alongside the existing export button to save images to an application-managed directory
2. **Gallery Page**: Create a new page (`/gallery`) to view thumbnails of saved images with infinite scroll
3. **Image Selection**: Allow users to select multiple images via click-to-select in the gallery
4. **Settings Page**: Create a settings page (`/settings`) to configure TV connection (IP address, port) and handle initial authentication
5. **Sync Service**: Create a standalone FastAPI service to handle syncing images to the Frame TV
6. **Sync Functionality**: Implement sync controls on the gallery page to sync selected images to the TV

## User Stories

### Story 1: Save Edited Images

**As a** user editing images in the canvas editor  
**I want to** save my edited images to a local directory  
**So that** I can access them later for syncing to my Frame TV

**Acceptance Criteria:**

- Save button appears alongside export button in the top bar
- Clicking save button saves the current canvas as JPEG to `./data/saved-images/`
- Toast notification confirms successful save
- Filename follows format: `frametv-mat-{timestamp}.jpg`

### Story 2: View Saved Images Gallery

**As a** user  
**I want to** view thumbnails of all my saved images  
**So that** I can see what images I have available to sync

**Acceptance Criteria:**

- Gallery page accessible at `/gallery`
- Thumbnails displayed in masonry layout maintaining aspect ratios
- Initial load shows 50 images
- Infinite scroll loads 50 more images per batch
- Navigation link available from editor page

### Story 3: Select Multiple Images

**As a** user viewing the gallery  
**I want to** select multiple images by clicking on them  
**So that** I can choose which images to sync to my TV

**Acceptance Criteria:**

- Clicking a thumbnail toggles its selection
- Selected images show visual indicator (border/overlay)
- "Sync Selected" button appears when images are selected
- Button shows count of selected images (e.g., "Sync 3 Images")

### Story 4: Configure TV Connection

**As a** user  
**I want to** configure my Frame TV connection settings  
**So that** I can sync images to my TV

**Acceptance Criteria:**

- Settings page accessible at `/settings`
- Can enter TV IP address and port (default: 8002)
- Can initiate connection and enter PIN displayed on TV
- Settings saved to `./data/tv-settings.json`
- Token saved to `./data/tv_token.txt` by sync service

### Story 5: Sync Images to TV

**As a** user with selected images  
**I want to** sync them to my Frame TV with a chosen slideshow timer  
**So that** my images display on the TV in art mode

**Acceptance Criteria:**

- Timer dropdown available when images are selected
- Default timer is 15 minutes
- Can select from available timer options (3m, 5m, 10m, 15m, 1h, 3h, 6h, 12h, 24h)
- Progress bar shows sync progress
- Success notification shows count of synced images
- Failed images listed with error messages if any fail
- Images uploaded with `matte='none'`
- Slideshow timer set after all images uploaded

### Story 6: Handle Service Errors

**As a** user attempting to sync  
**I want to** see clear error messages when things go wrong  
**So that** I can understand what happened and take corrective action

**Acceptance Criteria:**

- Error toast shown if sync service is not running
- Connection failure shows error with retry option
- Partial sync success shows list of failed images
- Gallery page shows banner if TV not configured

## Project Structure

This project uses a monorepo structure with separate applications:

```
frametv_v4/
├── apps/
│   ├── web/                    # Next.js application
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── tsconfig.json
│   └── sync-service/           # Python FastAPI sync service
│       ├── main.py
│       ├── models.py
│       ├── tv_sync.py
│       ├── requirements.txt
│       └── README.md
├── data/                       # Shared data directory (at project root)
│   ├── saved-images/          # Saved JPEG images
│   ├── tv_token.txt          # TV authentication token (managed by sync service)
│   └── tv-settings.json      # TV connection settings
├── package.json                # Root package.json (optional, for workspace scripts)
└── README.md
```

### Migration Notes

**Restructuring Required:** The existing Next.js application currently resides at the project root. As part of this sprint, the project structure should be reorganized:

1. **Move Next.js files** from root to `apps/web/`:

   - Move `app/`, `components/`, `lib/`, `hooks/`, `types/` directories to `apps/web/`
   - Move Next.js config files (`next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `components.json`) to `apps/web/`
   - Move `package.json` and `package-lock.json` to `apps/web/`

2. **Update Next.js configuration**:

   - Ensure `next.config.js` paths are correct for the new location
   - Update any absolute imports if needed (though relative imports should work as-is)
   - Update scripts in `apps/web/package.json` to run from `apps/web/` directory

3. **Create sync service directory**:

   - Create `apps/sync-service/` directory
   - Add Python service files as specified

4. **Create shared data directory**:
   - Create `./data/` directory at project root
   - Create `./data/saved-images/` subdirectory

**Running the Applications:**

- **Next.js app**: Run from `apps/web/` directory: `cd apps/web && npm run dev`
- **Sync service**: Run from `apps/sync-service/` directory: `cd apps/sync-service && python main.py` or `uvicorn main:app --port 8000`
- Alternatively, use absolute paths from project root if preferred

## Data Directory Structure

All application-generated data will be stored in a `./data/` directory at the project root to avoid cluttering the main directory structure:

- `./data/saved-images/` - Directory containing all saved JPEG images
- `./data/tv_token.txt` - TV authentication token file (managed by sync service)
- `./data/tv-settings.json` - TV connection settings (IP address, port)

The application should create the `./data/` directory and subdirectories if they don't exist. Both the Next.js app (`apps/web`) and sync service (`apps/sync-service`) access this shared data directory using relative paths from their respective locations.

**Path Resolution:**

- From `apps/web/`: Use `../../data/` to access shared data directory
- From `apps/sync-service/`: Use `../../data/` to access shared data directory
- Both applications resolve paths relative to the project root for consistency

## Save Button Implementation

- **Keep both ExportButton and SaveButton**: The existing ExportButton component remains unchanged and continues to download images. A new SaveButton component will be added alongside it in the top bar.
- **Save Location**: Images are saved to `./data/saved-images/` directory with the same filename format: `frametv-mat-{timestamp}.jpg`
- **Save Process**: The save button triggers the same canvas export process as the export button, but instead of downloading, saves the JPEG file to `./data/saved-images/`. After saving, show a toast notification: "Image saved successfully".
- **File Path**: `apps/web/components/SaveButton.tsx` (new component)

## Gallery Page

- **Route**: Create `apps/web/app/gallery/page.tsx` accessible at `/gallery`
- **Navigation**: Add navigation links in the main layout or top bar to navigate between editor (`/`) and gallery (`/gallery`)
- **Thumbnail Display**:
  - Use a masonry layout (images of different aspect ratios fitted together) that displays the full image regardless of aspect ratio
  - Thumbnails maintain the aspect ratio of the original images (do not force them into the same aspect ratio)
  - Initial load: 50 thumbnails
  - Infinite scroll: Load 50 more thumbnails per scroll batch
- **Image Selection**:
  - Click-to-select mode: Clicking a thumbnail toggles its selection (visual highlight/border)
  - Selected images show a visual indicator (border/overlay)
  - A "Sync Selected" button appears in a fixed position (top or bottom bar) when images are selected, showing the count (e.g., "Sync 3 Images")
- **Sync Controls**: When images are selected, display sync controls on the gallery page including:
  - Timer dropdown/select with slideshow interval options
  - "Sync to TV" button that triggers the sync process

## Settings Page

- **Route**: Create `apps/web/app/settings/page.tsx` accessible at `/settings`
- **Settings Storage**: Store settings in `./data/tv-settings.json` file. Next.js API routes handle reading/writing this file.
- **Settings Fields**:
  - TV IP Address (text input)
  - TV Port (number input, default: 8002)
- **Authentication Flow**:
  - User enters IP address and port, then clicks "Connect & Authorize"
  - The app calls the sync service to initiate connection
  - The TV displays a PIN on screen
  - User enters the PIN in a modal/input field on the settings page
  - The sync service completes authentication and returns a token
  - The token is saved to `./data/tv_token.txt` by the sync service
  - Settings are saved to `./data/tv-settings.json`
- **Token Management**: The token file (`./data/tv_token.txt`) is managed by the sync service. The Next.js app reads settings from `./data/tv-settings.json` but does not directly manage the token file.

## Gallery Page Authentication Warning

- If the TV token is not present (check if `./data/tv_token.txt` exists or if settings are not configured), display a notification banner at the top of the gallery page
- Banner message: "TV not configured. Please go to Settings to set up your Frame TV connection."
- Link to `/settings` page from the banner

## Sync Service

- **Architecture**: Create a standalone Python FastAPI service that runs as a separate process
- **Framework**: Use FastAPI with Pydantic for type checking of API inputs
- **Communication**: Next.js app communicates with sync service via HTTP API endpoints
- **Service Port**: Sync service runs on a configurable port (default: 8000, configurable via environment variable or config)
- **Next.js Integration**: Create Next.js API routes (`apps/web/app/api/sync/route.ts`) that proxy requests to the sync service
- **Dependencies**: Sync service requires `samsungtvws[async,encrypted]` and `fastapi` packages
- **Service Endpoints** (to be implemented in Python):
  - `POST /connect` - Initiate TV connection and return PIN request
  - `POST /authorize` - Complete authorization with PIN and save token
  - `POST /sync` - Sync selected images to TV with slideshow timer

## Sync Functionality

- **Sync Process**:
  1. User selects images in gallery and chooses slideshow timer
  2. User clicks "Sync to TV" button
  3. Next.js API route (`apps/web/app/api/sync/route.ts`) receives list of image file paths and timer selection
  4. API route calls sync service `/sync` endpoint with image paths and timer
  5. Sync service:
     - Connects to TV using IP/port from settings and token from `./data/tv_token.txt`
     - Turns on Art Mode
     - Uploads each selected image with `matte='none'`
     - Sets slideshow interval using `set_slideshow_options(change_interval=selected_timer)`
- **Slideshow Timer Options**: Provide these timer options with 15 minutes as default:
  - 3 minutes (`'3m'`)
  - 5 minutes (`'5m'`)
  - 10 minutes (`'10m'`)
  - 15 minutes (`'15m'`) - **default**
  - 1 hour (`'1h'`)
  - 3 hours (`'3h'`)
  - 6 hours (`'6h'`)
  - 12 hours (`'12h'`)
  - 24 hours (`'24h'`)
- **Timer Selection**: Display timer options as a dropdown/select component on the gallery page when images are selected

## Error Handling

- **Sync Service Not Running**: If the sync service is not running or unreachable, show an error toast notification with message indicating the service needs to be started
- **Sync Progress**: Display a progress bar during sync process showing upload progress (simplest implementation for first iteration)
- **Partial Sync Success**: If some images fail to sync but others succeed:
  - Complete syncing of successful images
  - Show a notification with list of failed image filenames
  - Display success count and failure count
- **TV Connection Failure**: If TV connection fails during sync:
  - Show error notification
  - Allow manual retry via a "Retry" button
  - Do not automatically retry

## Files to Create/Modify

### New Next.js Files (in `apps/web/`)

- `apps/web/components/SaveButton.tsx` - New save button component
- `apps/web/app/gallery/page.tsx` - Gallery page with thumbnail view
- `apps/web/app/settings/page.tsx` - Settings page for TV configuration
- `apps/web/app/api/save/route.ts` - API route to save images to filesystem
- `apps/web/app/api/gallery/route.ts` - API route to list saved images
- `apps/web/app/api/settings/route.ts` - API route to read/write TV settings
- `apps/web/app/api/settings/connect/route.ts` - API route to initiate TV connection (proxies to sync service)
- `apps/web/app/api/settings/authorize/route.ts` - API route to complete TV authorization (proxies to sync service)
- `apps/web/app/api/sync/route.ts` - API route to sync images to TV (proxies to sync service)
- `apps/web/lib/galleryUtils.ts` - Utility functions for gallery operations (image listing, etc.)
- `apps/web/lib/settingsUtils.ts` - Utility functions for reading/writing settings

### Sync Service Files (in `apps/sync-service/`)

- `apps/sync-service/main.py` - FastAPI application entry point
- `apps/sync-service/models.py` - Pydantic models for API request/response types
- `apps/sync-service/tv_sync.py` - TV synchronization logic using samsungtvws
- `apps/sync-service/requirements.txt` - Python dependencies
- `apps/sync-service/README.md` - Instructions for running the sync service

### Modified Files (in `apps/web/`)

- `apps/web/app/page.tsx` - Add SaveButton alongside ExportButton, add navigation to gallery
- `apps/web/app/layout.tsx` - Add navigation links between editor and gallery (if needed)
- `apps/web/components/CanvasEditor.tsx` - May need to expose save functionality similar to export

## API Specifications

### Next.js API Routes

#### POST `/api/save`

Save a canvas image to the filesystem.

**Request Body:**

```typescript
{
  imageData: string; // Base64 encoded JPEG data URL
  filename?: string; // Optional, defaults to generated timestamp filename
}
```

**Response:**

```typescript
{
  success: boolean;
  filename: string;
  filepath: string; // Full path to saved file
}
```

#### GET `/api/gallery`

List saved images with pagination support.

**Query Parameters:**

- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 50) - Number of images per page

**Response:**

```typescript
{
  images: Array<{
    filename: string;
    filepath: string;
    createdAt: string; // ISO timestamp
    size: number; // File size in bytes
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

#### GET `/api/settings`

Get TV connection settings.

**Response:**

```typescript
{
  ipAddress?: string;
  port?: number;
  isConfigured: boolean; // true if settings exist
}
```

#### POST `/api/settings`

Save TV connection settings.

**Request Body:**

```typescript
{
  ipAddress: string;
  port: number;
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

#### POST `/api/settings/connect`

Initiate TV connection and request PIN (proxies to sync service).

**Request Body:**

```typescript
{
  ipAddress: string;
  port: number;
}
```

**Response:**

```typescript
{
  success: boolean;
  requiresPin: boolean;
  message: string;
}
```

#### POST `/api/settings/authorize`

Complete TV authorization with PIN (proxies to sync service).

**Request Body:**

```typescript
{
  ipAddress: string;
  port: number;
  pin: string;
}
```

**Response:**

```typescript
{
  success: boolean;
  tokenSaved: boolean;
  message: string;
}
```

#### POST `/api/sync`

Sync selected images to TV.

**Request Body:**

```typescript
{
  imagePaths: string[]; // Array of file paths relative to data/saved-images/
  timer: string; // Slideshow timer value (e.g., '15m', '1h')
}
```

**Response:**

```typescript
{
  success: boolean;
  synced: string[]; // Array of successfully synced image filenames
  failed: Array<{
    filename: string;
    error: string;
  }>;
}
```

### Python FastAPI Service Endpoints

#### POST `/connect`

Initiate TV connection and request PIN.

**Request Body (Pydantic model):**

```python
class ConnectRequest(BaseModel):
    ip_address: str
    port: int = 8002
```

**Response:**

```python
class ConnectResponse(BaseModel):
    success: bool
    requires_pin: bool
    message: str
```

#### POST `/authorize`

Complete authorization with PIN.

**Request Body:**

```python
class AuthorizeRequest(BaseModel):
    ip_address: str
    port: int = 8002
    pin: str
```

**Response:**

```python
class AuthorizeResponse(BaseModel):
    success: bool
    token_saved: bool
    message: str
```

#### POST `/sync`

Sync images to TV.

**Request Body:**

```python
class SyncRequest(BaseModel):
    image_paths: List[str]  # Full file paths to images
    timer: str  # Slideshow timer (e.g., '15m', '1h')
    ip_address: str
    port: int = 8002
```

**Response:**

```python
class SyncResponse(BaseModel):
    success: bool
    synced: List[str]  # Successfully synced filenames
    failed: List[Dict[str, str]]  # Failed images with error messages
    total: int
    successful: int
```

## Sync Service Implementation Details

### Service Configuration

- **Service Port**: Default port 8000, configurable via environment variable `SYNC_SERVICE_PORT` or config file
- **Base URL**: Next.js app communicates with sync service at `http://localhost:{port}` (default: `http://localhost:8000`)
- **CORS**: Sync service must enable CORS to accept requests from Next.js app (typically running on `http://localhost:3000`)

### File Paths

- **Token File Location**: `./data/tv_token.txt` (relative to project root, managed by sync service)
  - Sync service accesses via `../../data/tv_token.txt` from `apps/sync-service/` directory
- **Settings File Location**: `./data/tv-settings.json` (read by Next.js API routes in `apps/web/`, sync service receives settings via API request body)
  - Next.js app accesses via `../../data/tv-settings.json` from `apps/web/` directory
- **Image Directory**: `./data/saved-images/` (sync service receives full file paths in sync request)
  - Both apps access via `../../data/saved-images/` relative to their respective directories

### TV Operations

- **Image Upload**: Use `tv.art().upload(image_data, file_type=file_type, matte='none')` for each image
- **Art Mode**: Call `tv.art().set_artmode(True)` before uploading images
- **Slideshow Timer**: Call `tv.art().set_slideshow_options(change_interval=timer)` after all images are uploaded
- **Connection**: Create `SamsungTVWS` instance with `host=ip_address, port=tv_port, token_file='../../data/tv_token.txt'` (relative path from `apps/sync-service/` directory)

### Error Handling

- Wrap all TV operations in try/except blocks
- Return detailed error information for failed operations in API responses
- Log errors for debugging purposes
- Handle cases where TV is offline or unreachable gracefully

### Service Startup

- Sync service should be started independently before using sync functionality
- Service can be started via command: `python apps/sync-service/main.py` or `uvicorn apps.sync-service.main:app --port 8000` (from project root)
- Alternatively, from `apps/sync-service/` directory: `python main.py` or `uvicorn main:app --port 8000`
- Next.js app should handle service unavailability gracefully with error messages
- **Path Handling**: Sync service should use relative paths from project root to access `./data/` directory (e.g., `../../data/tv_token.txt`)

## Workflows

### Workflow 1: Save Image from Editor

1. User edits images on canvas in editor (`/`)
2. User clicks "Save Image" button
3. Canvas is exported to JPEG (same process as export)
4. JPEG data is sent to `POST /api/save`
5. API route saves file to `./data/saved-images/frametv-mat-{timestamp}.jpg`
6. Toast notification: "Image saved successfully"

### Workflow 2: Initial TV Setup

1. User navigates to Settings page (`/settings`)
2. User enters TV IP address and port (default: 8002)
3. User clicks "Connect & Authorize"
4. Settings saved to `./data/tv-settings.json` via `POST /api/settings`
5. Next.js calls `POST /api/settings/connect` which proxies to sync service `POST /connect`
6. Sync service initiates connection to TV
7. TV displays PIN on screen
8. User enters PIN in modal/input on settings page
9. Next.js calls `POST /api/settings/authorize` which proxies to sync service `POST /authorize` with PIN
10. Sync service completes authentication and saves token to `./data/tv_token.txt`
11. Success message displayed

### Workflow 3: Sync Images to TV

1. User navigates to Gallery page (`/gallery`)
2. If TV not configured, banner displayed: "TV not configured. Please go to Settings..."
3. User views thumbnails of saved images (masonry layout)
4. User clicks thumbnails to select images (click-to-select)
5. "Sync Selected" button appears with count (e.g., "Sync 3 Images")
6. Timer dropdown appears with default "15 minutes"
7. User selects timer option (optional, defaults to 15m)
8. User clicks "Sync to TV"
9. Next.js calls `POST /api/sync` with image paths and timer
10. API route calls sync service `POST /sync` endpoint
11. Sync service:
    - Reads settings from request (IP, port)
    - Connects to TV using token from `./data/tv_token.txt`
    - Turns on Art Mode
    - Uploads each image with `matte='none'`
    - Sets slideshow timer
12. Progress bar shows upload progress
13. Success notification shows count of synced images
14. If any images fail, list of failed images displayed

### Workflow 4: Gallery Infinite Scroll

1. User navigates to Gallery page (`/gallery`)
2. Initial load: Fetch first 50 images via `GET /api/gallery?page=1&limit=50`
3. Thumbnails displayed in masonry layout
4. User scrolls to bottom
5. When near bottom, fetch next batch: `GET /api/gallery?page=2&limit=50`
6. Append new thumbnails to gallery
7. Repeat until all images loaded

## Next.js to Sync Service Communication

The Next.js API routes act as a proxy layer between the frontend and sync service:

- **API Route Pattern**: Next.js API routes (`apps/web/app/api/*/route.ts`) receive requests from frontend
- **Service Proxy**: API routes make HTTP requests to FastAPI sync service
- **Error Handling**: API routes handle sync service unavailability and return appropriate errors to frontend
- **Configuration**: Sync service URL configured in Next.js (default: `http://localhost:8000`)
- **Request Forwarding**: API routes forward request bodies and return service responses

Example flow:

```
Frontend → POST /api/sync → Next.js API Route → HTTP POST http://localhost:8000/sync → Sync Service → TV
```

## Data Models

### TV Settings (stored in `./data/tv-settings.json`)

```typescript
interface TVSettings {
  ipAddress: string;
  port: number;
}
```

### Gallery Image Metadata

```typescript
interface GalleryImage {
  filename: string;
  filepath: string;
  createdAt: string; // ISO timestamp
  size: number; // File size in bytes
}
```

### Selected Image State (client-side only)

```typescript
interface SelectedImage {
  filename: string;
  filepath: string;
}
```

## Dependencies

### Next.js Dependencies

- No new npm packages required (existing packages sufficient)
- File system operations use Node.js `fs` module (available in Next.js API routes)

### Sync Service Dependencies

- `fastapi` - Web framework for API
- `uvicorn` - ASGI server for FastAPI
- `pydantic` - Data validation (included with FastAPI)
- `samsungtvws[async,encrypted]` - Samsung TV WebSocket API library
- Python 3.12 required

### Installation

Sync service dependencies should be listed in `apps/sync-service/requirements.txt`:

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
samsungtvws[async,encrypted]>=2.4.0
```

## Assumptions and Constraints

### Assumptions

- TV and computer running the application are on the same Wi-Fi network
- Sync service will be started manually by the user before syncing
- TV supports Samsung SmartThings API (Frame TV 2016+)
- User has access to TV's network settings to find IP address
- File system write permissions available for `./data/` directory

### Constraints

- Sync service must run on same machine as Next.js app (localhost communication)
- Token file must be accessible by sync service at `./data/tv_token.txt` (relative to project root)
- Both Next.js app and sync service must use consistent relative paths to access shared `./data/` directory
- Images must be saved as JPEG format (PNG support may be added later)
- Maximum image size limited by TV's capabilities (typically 3840×2160 or smaller)
- Next.js app runs from `apps/web/` directory, sync service runs from `apps/sync-service/` directory

### Risks

- Sync service may not be running when sync is attempted (handled with error messages)
- TV may be offline or unreachable (handled with error messages and retry option)
- Network connectivity issues between computer and TV
- Token may expire or become invalid (user will need to re-authenticate)

## Technical Details

The sync functionality will need to call a sync service that will accept the list of images and sync them to the TV.

**Python Library References:**

- https://pypi.org/project/samsungtvws/
- https://github.com/xchwarze/samsung-tv-ws-api

The following reference information provides implementation guidance for the sync service integration.

Following are some comments from a conversation I had with an LLM about how to integrate or use this Python module to sync to the Frame TV. You can use this as a reference to understand how to go about accomplishing this task.

To be clear, I want to sync the selected files from the directory to the TV. Then, I want to set it to slideshow with a 15-minute timer. I also want to make sure that the mat is set to none because we're already creating the mats in this software that we're creating.

You know what? Just for kicks, when we sync files to the TV, let's have all of the different timer options for the slideshow. And let's just default to a 15-minute timer. But for kicks, let's allow the person to try different timers if they want.

Here are the steps and code snippets to connect to your Samsung Frame TV, authorize the connection, and sync a directory of images.

### **Prerequisites**

You'll need the IP address of your Samsung Frame TV. You can typically find this in your TV's network settings menu. Ensure your TV and the computer running the script are on the same Wi-Fi network.

### **Step 1: Installation**

First, you need to install the `samsungtvws` library. Open your terminal or command prompt and run the following command:

```bash
pip install "samsungtvws[async,encrypted]"
```

### **Step 2: Connecting and Authorizing**

The first time you connect to the TV, it will display a PIN on the screen. You'll need to enter this PIN in the console where you're running the script. A token file will then be created, which will be used for future connections so you don't have to enter the PIN again.

Here's a Python script to handle the initial connection and authorization. Save it as a Python file (e.g., `connect_tv.py`).

```python
import os
import logging
from samsungtvws import SamsungTVWS

# Set up logging to see what's happening
logging.basicConfig(level=logging.INFO)

# Replace with your TV's IP address
TV_IP = "192.168.1.100"
PORT = 8002

# This is the path where the token file will be saved
TOKEN_FILE = "tv_token.txt"

# Create the SamsungTVWS object
tv = SamsungTVWS(host=TV_IP, port=PORT, token_file=TOKEN_FILE)

# The first time you run this, you will be prompted on your TV to allow the connection
# and a PIN will be displayed on the TV. You need to enter that PIN in the console.
# After the first successful connection, the token is saved in TOKEN_FILE, and you
# won't be prompted for a PIN again.
try:
    info = tv.rest_device_info()
    print(f"Connected to {info['device']['name']}")
except Exception as e:
    print(f"Failed to connect to the TV. Error: {e}")

```

Run this script from your terminal. Look at your TV for the PIN and enter it in the terminal when prompted. If successful, you'll see a "Connected to..." message and a `tv_token.txt` file will be created in the same directory.

### **Step 3: Syncing a Directory of Images**

Now that you're authorized, you can use the following script to upload a directory of images to your Frame TV. This script will iterate through all JPG and PNG files in a specified directory and upload them.

```python
import os
import logging
from samsungtvws import SamsungTVWS

# --- Configuration ---
TV_IP = "192.168.1.100"  # Replace with your TV's IP address
PORT = 8002
TOKEN_FILE = "tv_token.txt"  # This should be the token file from the previous step
IMAGE_DIR = "/path/to/your/images"  # Replace with the path to your image directory
# ---------------------

logging.basicConfig(level=logging.INFO)

# Connect to the TV
tv = SamsungTVWS(host=TV_IP, port=PORT, token_file=TOKEN_FILE)

def upload_images_to_frame(directory):
    """
    Uploads all JPG and PNG images from a directory to the Frame TV.
    """
    if not os.path.isdir(directory):
        logging.error(f"Directory not found: {directory}")
        return

    # Turn on Art Mode
    try:
        tv.art().set_artmode(True)
        logging.info("Art Mode turned on.")
    except Exception as e:
        logging.warning(f"Could not set Art Mode. It might already be on. Error: {e}")


    for filename in os.listdir(directory):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            filepath = os.path.join(directory, filename)
            logging.info(f"Uploading {filename}...")

            try:
                with open(filepath, "rb") as f:
                    image_data = f.read()

                file_type = 'JPEG' if filename.lower().endswith((".jpg", ".jpeg")) else 'PNG'

                # Upload the image
                tv.art().upload(image_data, file_type=file_type)

                logging.info(f"Successfully uploaded {filename}")

            except Exception as e:
                logging.error(f"Failed to upload {filename}. Error: {e}")

if __name__ == "__main__":
    upload_images_to_frame(IMAGE_DIR)
```

**How to use the script:**

1.  Save the code above as a Python file (e.g., `sync_images.py`).
2.  Make sure the `tv_token.txt` file you created in Step 2 is in the same directory.
3.  Change the `IMAGE_DIR` variable to the full path of the directory containing your images.
4.  Run the script from your terminal: `python sync_images.py`

The script will turn on Art Mode and then upload each image in the specified directory to your Frame TV.

You're right to ask for verification. Based on the official documentation within the GitHub repository for the `samsung-tv-ws-api`, I can confirm that the process I outlined is accurate and the intended way to use the library for your project. I've vetted the steps against the repository's own examples.

Here are some additional details and specifics from the official documentation that are relevant to what you're doing:

### **Key Verification Points and Additional Details:**

- **Official "Art Mode" Support:** The library has a dedicated `art()` module specifically for controlling Frame TVs. The code I provided utilizes this module, which is a strong indication that this is a well-supported feature.

- **File Types:** The documentation explicitly shows that you can upload both JPEG and PNG files. You can specify the file type during the upload process like this: \* **Matte Effect:** You can even set a matte effect when you upload an image. The `matte` parameter can be added to the `upload` function. For example:

  - **Error Handling:** In a real-world application, you'll want to add more robust error handling. For instance, you could wrap the connection and upload calls in `try...except` blocks to gracefully handle cases where the TV is offline or an image fails to upload. The provided scripts include basic error logging, but you can expand on this.

- **Idempotency:** The provided script is not idempotent, meaning if you run it multiple times, it will re-upload all the images each time. For a more advanced setup, you could keep track of the images you've already uploaded and only upload new or changed files.

### **Confidence in the Process**

I am confident this process will work for your 2022 Frame TV for the following reasons:

- The `samsung-tv-ws-api` library is specifically designed for modern Samsung TVs (post-2016) that use the Tizen operating system, which includes your 2022 model.
- The functionality for controlling Art Mode and uploading images is clearly documented and exampled in the library's official repository, which I have reviewed.
- The workflow of connecting, authenticating with a token, and then sending commands is a standard pattern for controlling smart devices via an API.

As with any project involving network communication and specific hardware, there's always a small chance of running into environmental issues (e.g., network configuration, firewall settings). However, the Python code and the steps provided are sound and based on the library's own documentation.

Of course. To disable the matte effect, you need to add the `matte` parameter to the `upload` function and set its value to `'none'`.

Here is the specific line of code you'll need to change in the `sync_images.py` script I provided earlier.

**Change this line:**

```python
# Old line
tv.art().upload(image_data, file_type=file_type)
```

**To this:**

```python
# New line with matte disabled
tv.art().upload(image_data, file_type=file_type, matte='none')
```

### **Updated `sync_images.py` Script**

For your convenience, here is the complete, updated script with the matte effect disabled.

```python
import os
import logging
from samsungtvws import SamsungTVWS

# --- Configuration ---
TV_IP = "192.168.1.100"  # Replace with your TV's IP address
PORT = 8002
TOKEN_FILE = "tv_token.txt"  # This should be the token file from the previous step
IMAGE_DIR = "/path/to/your/images"  # Replace with the path to your image directory
# ---------------------

logging.basicConfig(level=logging.INFO)

# Connect to the TV
tv = SamsungTVWS(host=TV_IP, port=PORT, token_file=TOKEN_FILE)

def upload_images_to_frame(directory):
    """
    Uploads all JPG and PNG images from a directory to the Frame TV
    with no matte effect.
    """
    if not os.path.isdir(directory):
        logging.error(f"Directory not found: {directory}")
        return

    # Turn on Art Mode
    try:
        tv.art().set_artmode(True)
        logging.info("Art Mode turned on.")
    except Exception as e:
        logging.warning(f"Could not set Art Mode. It might already be on. Error: {e}")


    for filename in os.listdir(directory):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            filepath = os.path.join(directory, filename)
            logging.info(f"Uploading {filename} with no matte...")

            try:
                with open(filepath, "rb") as f:
                    image_data = f.read()

                file_type = 'JPEG' if filename.lower().endswith((".jpg", ".jpeg")) else 'PNG'

                # Upload the image with the matte parameter set to 'none'
                tv.art().upload(image_data, file_type=file_type, matte='none')

                logging.info(f"Successfully uploaded {filename}")

            except Exception as e:
                logging.error(f"Failed to upload {filename}. Error: {e}")

if __name__ == "__main__":
    upload_images_to_frame(IMAGE_DIR)
```

Now, when you run this script, the images will be uploaded and displayed on your Frame TV without any of the TV's built-in digital mats.

Excellent question. Yes, you can absolutely control the slideshow settings programmatically after uploading your images.

The function you need is `set_slideshow_options()`, which is part of the Art Mode controls. You can use it to set the slideshow's rotation interval.

To set a 15-minute timer, you will add the following line of code to your script **after** the `for` loop that uploads the images:

```python
tv.art().set_slideshow_options(change_interval='15m')
```

### **Why This Works**

- The `set_slideshow_options()` function directly communicates with the TV's Art Mode API.
- The `change_interval` parameter accepts specific string values to define the time between image rotations. Based on the library's functionality and the TV's options, the accepted values are typically `'3m'`, `'5m'`, `'10m'`, `'15m'`, `'1h'`, `'3h'`, `'6h'`, `'12h'`, and `'24h'`.

### **Final, Updated `sync_images.py` Script**

Here is the complete and final script that includes all your requests: disabling the matte, uploading all images from a directory, and then setting the slideshow to a 15-minute interval.

```python
import os
import logging
from samsungtvws import SamsungTVWS

# --- Configuration ---
TV_IP = "192.168.1.100"  # Replace with your TV's IP address
PORT = 8002
TOKEN_FILE = "tv_token.txt"  # This should be the token file from the previous step
IMAGE_DIR = "/path/to/your/images"  # Replace with the path to your image directory
# ---------------------

logging.basicConfig(level=logging.INFO)

# Connect to the TV
tv = SamsungTVWS(host=TV_IP, port=PORT, token_file=TOKEN_FILE)

def upload_images_and_set_slideshow(directory):
    """
    Uploads all JPG and PNG images from a directory to the Frame TV
    with no matte effect, and then sets the slideshow interval.
    """
    if not os.path.isdir(directory):
        logging.error(f"Directory not found: {directory}")
        return

    # Turn on Art Mode
    try:
        tv.art().set_artmode(True)
        logging.info("Art Mode turned on.")
    except Exception as e:
        logging.warning(f"Could not set Art Mode. It might already be on. Error: {e}")


    # Upload all images in the directory
    for filename in os.listdir(directory):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            filepath = os.path.join(directory, filename)
            logging.info(f"Uploading {filename} with no matte...")

            try:
                with open(filepath, "rb") as f:
                    image_data = f.read()

                file_type = 'JPEG' if filename.lower().endswith((".jpg", ".jpeg")) else 'PNG'

                # Upload the image with the matte parameter set to 'none'
                tv.art().upload(image_data, file_type=file_type, matte='none')

                logging.info(f"Successfully uploaded {filename}")

            except Exception as e:
                logging.error(f"Failed to upload {filename}. Error: {e}")

    # After uploading all images, set the slideshow interval
    try:
        logging.info("Setting slideshow timer to 15 minutes...")
        tv.art().set_slideshow_options(change_interval='15m')
        logging.info("Successfully set slideshow timer.")
    except Exception as e:
        logging.error(f"Failed to set slideshow timer. Error: {e}")


if __name__ == "__main__":
    upload_images_and_set_slideshow(IMAGE_DIR)
```

Now, when you run this final script, it will perform the entire workflow you've requested.
