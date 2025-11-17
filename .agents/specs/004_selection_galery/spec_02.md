# Album-Based Image Selection System

## Overview

Replace the browser-based File System Access API directory selection with a server-managed album system. This resolves file path access limitations and simplifies the user workflow.

## Problem Statement

The current approach of letting users select directories from the browser using the File System Access API has limitations:

- Browser doesn't provide full file paths, creating complexity
- Requires repeated permission prompts
- Inconsistent browser support

## Solution

Implement a server-managed album system where users add image folders directly to the server's file system, and the application presents these as selectable albums.

## Album Storage Structure

### Directory Location

- **Albums Directory**: `<project-root>/data/albums/`
- Each subdirectory within `data/albums/` represents one album
- Album names are derived directly from folder names (no formatting applied)
- Example structure:
  ```
  data/
    albums/
      vacation-2024/
        img001.jpg
        img002.png
      family-photos/
        photo1.jpg
        photo2.jpeg
  ```

### Album Folder Rules

- **Flat structure only**: Only recognize top-level folders directly within the albums directory
- **Ignore subfolders**: Do not scan or display images from subfolders within albums
- **Supported formats**: .jpg, .jpeg, .png files (case-insensitive)
- **Display warning**: If an album contains subfolders, optionally warn users that only root-level images are recognized

## Backend API Implementation

### New Endpoints

#### 1. GET /api/albums

- **Purpose**: List all available albums
- **Returns**: Array of album objects with name and image count
- **Response format**:
  ```json
  {
    "success": true,
    "albums": [
      { "name": "vacation-2024", "imageCount": 42 },
      { "name": "family-photos", "imageCount": 128 }
    ]
  }
  ```

#### 2. POST /api/albums/browse

- **Purpose**: Browse images within a specific album with pagination
- **Request body**:
  ```json
  {
    "albumName": "vacation-2024",
    "page": 1,
    "limit": 100
  }
  ```
- **Validation**: Check that the album exists before processing. Return error if album not found.
- **Response format**: Same as existing browse endpoint
  ```json
  {
    "success": true,
    "directory": "vacation-2024",
    "images": [...],
    "page": 1,
    "limit": 100,
    "total": 42,
    "hasMore": false
  }
  ```

## Frontend Changes

### Album Selection UI

- **Replace** the "Select Folder" button with a **dropdown menu** showing all available album names
- **Behavior**: Selecting an album from the dropdown immediately loads its images into the sidebar
- **Refresh**: Include a refresh button to re-scan for new albums (users must refresh to see newly added albums)
- **Loading state**: Show "Loading albums..." while fetching album list

### Empty State

When no albums are available, display instructional message:

```
No albums found.

To add albums:
1. Create folders in <project-root>/data/albums/
2. Add .jpg/.jpeg/.png images to each folder
3. Click refresh or reload the page
```

### Information Icon

Add an information icon (ℹ️) next to the album selector that displays a tooltip or modal explaining:

- How to add new albums
- Supported image formats
- That only root-level images in album folders are recognized

## Files to Delete

Remove all File System Access API-related code:

- **Delete**: `apps/web/components/ImageSidebar/DirectorySelector.tsx`
- **Delete**: `apps/web/lib/fileSystemUtils.ts`

## Files to Update

### `apps/web/contexts/SidebarContext.tsx`

- Remove `directoryHandle` state (FileSystemDirectoryHandle)
- Remove File System Access API references
- Update `directoryPath` to store album name instead
- Remove localStorage persistence for directory paths (no migration needed)

### `apps/web/components/ImageSidebar/index.tsx`

- Remove directory restoration logic for browser-selected directories
- Update to use new album-based workflow
- Replace DirectorySelector with new AlbumSelector component

### `apps/web/components/ImageSidebar/ImageGrid.tsx`

- Update API calls to use `/api/albums/browse` instead of `/api/directory/browse`
- Pass album name instead of directory path

### `apps/web/app/api/directory/browse/route.ts`

- Keep this file but mark as deprecated/unused (for reference)
- All new code should use the album endpoints

## New Files to Create

### `apps/web/components/ImageSidebar/AlbumSelector.tsx`

New component to replace DirectorySelector with:

- Dropdown showing available albums
- Refresh button to reload album list
- Loading and error states
- Empty state with instructions

### `apps/web/app/api/albums/route.ts`

Implement GET endpoint to list all albums from `data/albums/` directory

### `apps/web/app/api/albums/browse/route.ts`

Implement POST endpoint to browse images within a specific album

## User Stories

- As a user, I want to select from pre-organized albums so that I don't have to repeatedly grant browser permissions for directory access
- As a user, I want to see all my available albums in a dropdown so that I can quickly switch between different image collections
- As a user, I want clear instructions on how to add new albums so that I can easily expand my image library
- As a user, I want to drag images from albums to canvas slots so that I can create compositions with my organized photos

## Implementation Details

### Thumbnail Generation

Reuse existing thumbnail generation logic in the new `/api/albums/browse` endpoint:

- Use Sharp to generate 300px width thumbnails
- JPEG format at 85% quality
- Return as base64 data URLs in response
- Same pagination (100 images per page)

### Image Path Resolution

The `/api/albums/browse` endpoint must include the full absolute file path for each image in the response:

```json
{
  "filename": "img001.jpg",
  "path": "/absolute/path/to/project/data/albums/vacation-2024/img001.jpg",
  "thumbnailDataUrl": "data:image/jpeg;base64,..."
}
```

The ImageThumbnail component sets this path in dataTransfer for drag-and-drop to canvas.

### AlbumSelector Component

Create new `AlbumSelector.tsx` component with:

- Fetch albums on component mount via `GET /api/albums`
- Display in a `<select>` dropdown or custom Select component from shadcn/ui
- `onChange` handler loads selected album images
- Separate refresh button (circular arrow icon from lucide-react) to refetch album list
- Show "Loading albums..." during initial fetch
- Show error message if fetch fails

### Context State Changes

Update `SidebarContext.tsx` with minimal changes:

- Remove `directoryHandle: FileSystemDirectoryHandle | null` state
- Rename `directoryPath` to `albumName` for clarity (or keep as `directoryPath` but use for album name)
- Remove `setDirectory(path, handle)` - replace with `setAlbum(name)` or `setDirectory(albumName)`
- Remove localStorage persistence entirely (no saving/restoring selected album)

### Error Handling

Standard error handling for all scenarios:

- **Album not found**: Return `{ success: false, error: "Album 'album-name' not found" }` with 404 status
- **Empty album**: Return `{ success: true, images: [], total: 0, hasMore: false }`
- **File system error**: Return `{ success: false, error: "Failed to read album directory" }` with 500 status
- Display all errors in the UI with red error messages

### Albums Directory Initialization

Create utility function in `lib/dataUtils.ts` (similar to existing `ensureDataDirectories()`):

- Add `data/albums/` to the directories that are auto-created
- Update `ensureDataDirectories()` function to create albums directory if missing
- Call this when the API endpoints are accessed to ensure directory exists

### Information Icon & Tooltip

Add information icon next to album selector:

- Use lucide-react `Info` icon (already in project)
- Implement as hover tooltip/popover showing instructions
- Use **700ms hover delay** for consistency across all tooltips in the application
- Tooltip content should explain:
  - How to add new albums (create folders in `data/albums/`)
  - Supported image formats (.jpg, .jpeg, .png)
  - That only root-level images in album folders are recognized
  - How to refresh to see new albums

**Shared Tooltip Configuration:**
Create or update a shared tooltip component/configuration with 700ms delay that all tooltips in the application use for consistency.

## Data Models

Define TypeScript interfaces for type safety:

```typescript
// Album type
interface Album {
  name: string;
  imageCount: number;
}

// Album list API response
interface AlbumsResponse {
  success: boolean;
  albums: Album[];
  error?: string;
}

// Image data (update existing ImageData interface)
interface ImageData {
  filename: string;
  path: string; // Full absolute path
  thumbnailDataUrl: string;
}

// Browse API response
interface BrowseResponse {
  success: boolean;
  albumName: string; // Changed from "directory" for clarity
  images: ImageData[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  error?: string;
}
```

**Note:** The browse API response field is named `albumName` (not `directory`) for clarity and consistency. No backward compatibility needed.

## Detailed Component Specifications

### AlbumSelector Component (New)

**File:** `apps/web/components/ImageSidebar/AlbumSelector.tsx`

**Props:**

- Optional: `onAlbumSelected?: (albumName: string) => void`

**State:**

- `albums: Album[]` - List of available albums
- `selectedAlbum: string | null` - Currently selected album name
- `isLoading: boolean` - Loading state
- `error: string | null` - Error message

**Layout:**

- Horizontal row with: dropdown (flex-grow) + refresh button + info icon
- Dropdown: Select component from shadcn/ui or native `<select>`
- Refresh button: `RefreshCw` icon from lucide-react
- Info icon: `Info` icon from lucide-react with 700ms hover tooltip

**Behavior:**

- Fetch albums on mount via `GET /api/albums`
- Show placeholder "Select an album..." when none selected
- Disable dropdown during loading
- On selection change:
  1. Call context `setDirectory(albumName)` (directoryPath now stores album name)
  2. Fetch `POST /api/albums/browse` with page 1
  3. Update context with images
- Refresh button: Re-fetch `GET /api/albums` and update dropdown
- If currently selected album no longer exists after refresh: show error and clear selection

**Empty State:**
Display when no albums available with instructional message (see Empty State section above).

### Context Updates (SidebarContext.tsx)

**Remove:**

- `directoryHandle: FileSystemDirectoryHandle | null` state
- All localStorage `getItem`/`setItem` calls for `sidebar_directory_path`
- Second parameter from `setDirectory(path: string, handle: FileSystemDirectoryHandle)`

**Keep/Update:**

- Keep `directoryPath: string | null` state (will now store album name)
- Update `setDirectory(path: string)` - single parameter only
- Keep `clearDirectory()` function
- Keep all image-related state (images, hasMore, currentPage, scrollPosition, sidebarWidth, etc.)

**Updated Context Interface:**

```typescript
interface SidebarContextType {
  directoryPath: string | null; // Now stores album name (not full path)
  images: ImageData[];
  hasMore: boolean;
  isLoading: boolean;
  currentPage: number;
  scrollPosition: number;
  sidebarWidth: number;
  setDirectory: (albumName: string) => void; // Single parameter
  clearDirectory: () => void;
  setImages: (images: ImageData[]) => void;
  addImages: (images: ImageData[]) => void;
  setHasMore: (hasMore: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentPage: (page: number) => void;
  setSidebarWidth: (width: number) => void;
  setScrollPosition: (position: number) => void;
}
```

### ImageGrid Updates

**File:** `apps/web/components/ImageSidebar/ImageGrid.tsx`

**Changes:**

- Update API endpoint from `/api/directory/browse` to `/api/albums/browse`
- Update request body:
  ```typescript
  body: JSON.stringify({
    albumName: directoryPath, // directoryPath now contains album name
    page: currentPage + 1,
    limit: 100,
  });
  ```
- Update response field from `data.directory` to `data.albumName`
- Keep all other logic unchanged (infinite scroll, pagination, loading states)

### Sidebar Header Updates

**File:** `apps/web/components/ImageSidebar/index.tsx` - SidebarHeader function

**Changes:**

- Change button text from "Change Folder" to "Change Album"
- Keep truncation logic (truncate album name if > 30 characters)
- Update tooltip to show full album name (not full path)
- Clicking "Change Album" clears current album and shows AlbumSelector

### CanvasEditor Updates

**File:** `apps/web/components/CanvasEditor.tsx`

**Changes:**
**No changes needed.** The existing drag-and-drop handler already:

- Reads `image.path` from dataTransfer
- Loads the image using that path
- Works with full absolute paths from any source

The only difference is paths now come from `data/albums/` instead of user-selected directories.

## User Workflows

### Initial Load Flow

1. User opens application → sidebar renders
2. AlbumSelector fetches `GET /api/albums`
3. If albums exist → populate dropdown
4. If no albums → show empty state with instructions
5. User selects album from dropdown
6. AlbumSelector calls context `setDirectory(albumName)`
7. AlbumSelector fetches `POST /api/albums/browse` with page 1, limit 100
8. Context updates with images
9. ImageGrid renders with masonry layout

### Album Refresh Flow

1. User clicks refresh button in AlbumSelector
2. Re-fetch `GET /api/albums`
3. Update dropdown with new album list
4. If currently selected album no longer exists → show error and clear selection

### Image Drag-and-Drop Flow

1. User drags image thumbnail from sidebar
2. ImageThumbnail `onDragStart` sets `dataTransfer.setData('text/plain', image.path)`
3. User drops on canvas slot
4. Canvas reads path from `dataTransfer.getData('text/plain')`
5. Canvas loads full-resolution image from file system using that path
6. Image is assigned to slot with initial transform (center and fill)

## Utility Functions

### Data Directory Utilities

**File:** `apps/web/lib/dataUtils.ts`

**Updates:**

1. Update `ensureDataDirectories()` function:

   - Add creation of `data/albums/` directory
   - Create albums directory if it doesn't exist

   ```typescript
   const albumsDir = path.join(dataDir, "albums");
   if (!fs.existsSync(albumsDir)) {
     fs.mkdirSync(albumsDir, { recursive: true });
   }
   ```

2. Add new helper function:

   ```typescript
   /**
    * Gets the path to the albums directory.
    */
   export function getAlbumsDirectory(): string {
     const projectRoot = getProjectRoot();
     return path.join(projectRoot, "data", "albums");
   }
   ```

3. Call `ensureDataDirectories()` at the start of both new API endpoints to ensure directories exist.

## Documentation Updates

### README.md

Update main project README at `<project-root>/README.md` with new section explaining:

- How to add image albums (create folders in `data/albums/`)
- Supported image formats (.jpg, .jpeg, .png)
- Album structure requirements (flat, no subfolders)
- How to refresh the album list in the UI
- Example folder structure

## Migration and Backward Compatibility

**No migration needed.** This is rapid development - completely remove old code and localStorage state. Users will start fresh with the new album-based system.

## Testing and Validation

User will perform manual testing and validation.
