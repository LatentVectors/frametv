## Overview

The process of dragging images over into the slots does not work well, or it's very tedious to do it from a folder. Mostly because the images are too small. This sprint enhances the workflow by adding an image selection sidebar that displays larger thumbnails from a selected directory.

## User Story

As a user, I want to select a directory of images on my computer and view larger thumbnails in a sidebar, so that I can more easily drag and drop images into template slots with greater precision and care.

## Core Requirements

### Sidebar Layout

- Sidebar displayed on the left side of the canvas editor
- Always visible (not toggleable)
- Resizable with drag handle on right edge (200px - 600px range, starts at 300px)
- Uses masonry layout (`masonic` library) to preserve image aspect ratios
- Target thumbnail width: 150px
- Gap between images: 12px
- White background (matching page background)
- Thin gray border separator on right edge
- Sidebar width persisted in localStorage across page refreshes

### Directory Selection

- User selects a directory path using File System Access API
- Backend references files from the selected directory (no file duplication/copying)
- When no folder selected: Display button near top with message prompting user to select folder
- When folder selected: Display "Change Folder" button near top to allow switching directories
- Display selected directory path/name in sidebar header
- Selected directory path persisted across page refreshes (localStorage)

### Image Loading & Display

- Lazy loading with virtual scrolling for performance
- Infinite scroll pattern as user scrolls through images
- Thumbnails loaded from backend based on selected directory path
- Images display in directory order (see Sort Order decision below)

### Drag and Drop Functionality

- Primary: Drag from sidebar to template slots
- Secondary: Keep existing drag-from-filesystem if not overcomplicating implementation
- Use standard ghost image behavior for drag operations (whatever is standard practice)
- Future consideration: Mark images as used/highlighted (not in this sprint)

### Canvas Viewport Constraint

- **Critical**: Canvas must NEVER exceed viewport height, regardless of sidebar visibility
- Current issue: Bottom of canvas is cut off - must be fixed
- Canvas must always display in full, scaled appropriately to fit available viewport height
- This constraint applies at all times, with or without sidebar

### Template Switching Behavior

- Switching templates must NOT affect sidebar state
- Sidebar scroll position must be maintained when switching templates
- Loaded images remain in sidebar when template changes

### Responsive & Platform

- Desktop-first/desktop-only application
- Mobile not considered in this sprint

### Visual Design Details

- Sidebar background: White (same as page)
- Border separator: Thin gray border on right edge
- Image hover effect: Border highlight to indicate selection
- Directory indicator: Show selected file path with change option

## Technical Implementation Details

### Sort Order

- Sort images alphabetically by filename (case-insensitive)
- Keep implementation simple for this sprint
- Future enhancement: Sort by EXIF date metadata

### Backend API Architecture

- Implement new Next.js API route: `/api/directory/browse`
- **Backend-Heavy Approach**: Backend accesses user's local filesystem directly
- Accepts directory path, accesses directory, filters JPEG/PNG files, generates thumbnails
- Returns paginated list with: filename, path, size, modified date, thumbnail data URL
- Use `sharp` library for server-side thumbnail generation
- Sort images alphabetically by filename (case-insensitive)
- Application runs locally for power users, minimal security concerns
- Note: May deprecate separate sync service in future

### Page Layout Structure

- Use CSS Flexbox horizontal layout
- Main container: `display: flex; flex-direction: row; height: calc(100vh - [topbar-height])`
- Sidebar: Fixed/resizable flex item
- Canvas container: `flex: 1` with centered canvas that scales to fit available height
- Ensures canvas never exceeds viewport height

### Sidebar Resizing

- Implement custom React hook: `useResizableSidebar`
- Handles mouse events for drag handle
- State stored in React (width value)
- No external dependencies
- Min width: 200px, Max width: 600px, Default: 300px

### Virtual Scrolling with Masonry

- Use `masonic` library (handles both virtual scrolling and masonry layout)
- Optimized for variable-height items
- Single package solution
- Replaces need for separate react-masonry-css and react-window

### Canvas Scaling Fix

- Calculate `maxCanvasHeight = window.innerHeight - topBarHeight - verticalPadding`
- Calculate canvas display dimensions: `displayHeight = Math.min(maxCanvasHeight, calculatedHeightFromAspectRatio)`
- Always ensure `displayHeight <= maxCanvasHeight`
- Scale width proportionally to maintain 16:9 aspect ratio
- Fixes current issue where canvas bottom is cut off

### File System Access API and Directory Selection Flow

- Use File System Access API for directory selection (requires Chrome/Edge browsers)
- User clicks "Select a folder to browse images" button
- Browser shows native directory picker via `window.showDirectoryPicker()`
- After selection, show browser native confirmation dialog: `window.confirm('This application will have access to read files in the selected directory. Continue?')`
- If confirmed, send directory path to backend API
- Backend accesses directory, filters JPEG/PNG files, generates thumbnails
- If directory becomes inaccessible (moved/deleted/permissions changed):
  - Show error message: "The selected directory is no longer accessible. Please select a new directory."
  - Prompt user to reselect directory
  - Clear any cached directory path

### File Filtering

- Only display JPEG and PNG images from selected directory
- Filter file extensions: `.jpg`, `.jpeg`, `.png` (case-insensitive)
- Validate MIME types when possible

### Thumbnail Generation

- Format: JPEG at 85% quality
- Target size: 300px width for retina displays (displayed at 150px)
- Generate on every page load (no caching)
- Balance between visual quality and load speed
- Generated server-side via Next.js API route using `sharp`

### Empty States and Error Handling

- **No folder selected**: Display button with message "Select a folder to browse images"
- **Empty folder or no valid images**: Display message "This folder is empty or contains no JPEG/PNG images. Please select a different folder."
- **Directory access error**: Display error message and prompt to reselect
- **Thumbnail generation failure**: Display placeholder icon (Lucide React icon - `ImageOff` or similar standard broken image icon)
- **File count indicator**: Deferred to future sprint (not in this sprint)

### Directory Path Display and Sidebar Width Persistence

- Show only folder name in sidebar header (not full path)
- Full path visible in tooltip on hover
- Tooltip delay: 700ms to prevent rapid appearance
- Truncate folder name if excessively long (>30 characters) with ellipsis
- **Persistence**: Store both directory path and sidebar width in localStorage
- Restore both values on page load for consistent UX across sessions

### Component Structure and File Organization

Create modular component structure:

- `components/ImageSidebar/index.tsx` - Main sidebar component container
- `components/ImageSidebar/DirectorySelector.tsx` - Directory selection button/UI
- `components/ImageSidebar/ImageGrid.tsx` - Wraps masonic for image display
- `components/ImageSidebar/ImageThumbnail.tsx` - Individual draggable image item
- `components/ImageSidebar/ResizeHandle.tsx` - Drag handle for resizing sidebar
  Clear separation of concerns with dedicated sub-components.

### State Management

Implement React Context for sidebar state:

- Create `contexts/SidebarContext.tsx`
- Provides: selected directory path, directory handle (File System Access API), loaded images array, sidebar width
- Functions to update values
- Prevents prop drilling, allows state access throughout app

### API Route Response Format

`/api/directory/browse` returns:

```typescript
{
  success: boolean;
  directory: string;
  images: Array<{
    filename: string;
    path: string;
    size: number;
    modifiedDate: string;
    thumbnailDataUrl: string; // base64 encoded JPEG
  }>;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
```

All data in one response for simpler frontend logic.

### Drag and Drop Data Transfer

- Transfer file path string via `dataTransfer.setData('text/plain', filePath)`
- Canvas drop handler reads file path and loads image from File System Access API handle
- Clean and simple approach

### Integration with Existing CanvasEditor

- Add new `handleSidebarImageDrop` function in CanvasEditor
- Sidebar images use different drag data type to route to new handler
- Separate from existing filesystem drop logic
- Cleaner separation with minimal logic duplication

### File Access with File System Access API

- Store `FileSystemDirectoryHandle` in React state after directory selection
- When loading images, iterate directory handle to get file handles
- Request permissions if needed
- Enables access to full-resolution files when needed

### Top Bar Layout Modifications

- Top bar remains full width above both sidebar and canvas
- Move template selector to right side, grouped with Export and Save buttons
- Rename buttons: "Export" (not "Export JPEG") and "Save" (not "Save Image")
- Simplified, cleaner header layout

### Sidebar Header

- Contains: Directory name + "Change Folder" button
- Fixed position at top of sidebar while images scroll below
- Simple, focused header with essential controls only

### Error Handling and Resilience

- Implement Error Boundary around sidebar to prevent crashes from propagating to entire app
- Error boundary fallback UI: Display error message in sidebar with "Retry" button to reload sidebar
- If thumbnail generation fails for individual image: Show placeholder using Lucide React `ImageOff` icon
- Placeholder indicates image exists but thumbnail failed to generate
- Placeholder is non-interactive (clicking does not retry)

### Performance Requirements

- Must efficiently handle directories with 5,000-6,000 images
- Virtual scrolling with `masonic` essential for performance
- Lazy loading and pagination critical
- Only render visible thumbnails + small buffer
- Backend API pagination with page size of 50-100 images

### Thumbnail Loading Strategy

- **Initial Load**: Load first 100 images immediately on directory selection
- **On-Demand Loading**: As user scrolls, load next batch when approaching bottom (infinite scroll pattern)
- **API Pagination**: Request 50-100 images per API call
- **No Caching**: Thumbnails regenerated on every page load (no IndexedDB or cache)

## Files to Create/Modify

### New Files

- `apps/web/components/ImageSidebar/index.tsx`
- `apps/web/components/ImageSidebar/DirectorySelector.tsx`
- `apps/web/components/ImageSidebar/ImageGrid.tsx`
- `apps/web/components/ImageSidebar/ImageThumbnail.tsx`
- `apps/web/components/ImageSidebar/ResizeHandle.tsx`
- `apps/web/contexts/SidebarContext.tsx`
- `apps/web/hooks/useResizableSidebar.ts`
- `apps/web/app/api/directory/browse/route.ts`
- `apps/web/lib/fileSystemUtils.ts` (File System Access API helpers)

### Modified Files

- `apps/web/app/page.tsx` - Add sidebar, update layout structure, move template selector
- `apps/web/components/CanvasEditor.tsx` - Add handleSidebarImageDrop function
- `apps/web/components/ExportButton.tsx` - Update button text to "Export"
- `apps/web/components/SaveButton.tsx` - Update button text to "Save"
- `apps/web/package.json` - Add dependencies: `masonic`, `sharp`

## Dependencies to Install

```bash
npm install masonic sharp
npm install --save-dev @types/sharp
```

## Implementation Workflow

### Phase 1: Setup and Infrastructure

1. Install dependencies (`masonic`, `sharp`)
2. Create SidebarContext and provider
3. Create useResizableSidebar hook
4. Create API route `/api/directory/browse` with pagination and thumbnail generation

### Phase 2: Sidebar Components

5. Build ImageSidebar base component structure
6. Implement DirectorySelector with File System Access API
7. Implement ResizeHandle for sidebar width adjustment
8. Build ImageGrid with masonic integration
9. Create ImageThumbnail draggable component
10. Add Error Boundary around sidebar

### Phase 3: Layout Integration

11. Modify page.tsx to include sidebar and adjust layout
12. Update top bar layout (move template selector, rename buttons)
13. Implement canvas viewport height constraint fix

### Phase 4: Drag and Drop Integration

14. Implement handleSidebarImageDrop in CanvasEditor
15. Add drag data transfer in ImageThumbnail
16. Test drag and drop from sidebar to canvas slots
17. Maintain existing drag-from-filesystem functionality

### Phase 5: Polish and Error Handling

18. Implement all empty states and error messages
19. Add placeholder icon for failed thumbnails
20. Implement directory path persistence (localStorage)
21. Add tooltip with full path on hover (700ms delay)
22. Test with large directories (5,000+ images)

## Testing Considerations

### Functional Testing

- Directory selection flow (empty state → select → populated)
- Change directory functionality
- Drag and drop from sidebar to canvas slots
- Sidebar resize functionality (200-600px range)
- Template switching maintains sidebar scroll position
- Page refresh maintains selected directory

### Performance Testing

- Load directory with 5,000-6,000 images
- Scroll performance in image grid
- Thumbnail generation speed
- Memory usage with large directories
- Virtual scrolling efficiency

### Edge Cases

- Empty directory selection
- Directory with no JPEG/PNG files
- Directory becomes inaccessible after selection
- Thumbnail generation failures (show placeholder)
- Very long directory names (truncate with ellipsis)
- Simultaneous drag operations
- Canvas viewport constraint at various screen sizes

### Browser Compatibility

- Chrome/Edge (File System Access API required)
- Note: Firefox and Safari not supported due to API limitations

## Acceptance Criteria

### Must Have (Sprint Completion)

- ✓ Sidebar visible on left side with resizable width (200-600px)
- ✓ Directory selection via File System Access API
- ✓ Display thumbnails in masonry layout (150px width, 12px gap)
- ✓ Virtual scrolling handles 5,000+ images efficiently
- ✓ Drag and drop from sidebar to canvas slots works
- ✓ Canvas never exceeds viewport height
- ✓ Template switching maintains sidebar state
- ✓ Directory path persisted across page refresh
- ✓ Error boundary prevents sidebar crashes
- ✓ Placeholder icon for failed thumbnails
- ✓ Top bar layout updated (template selector moved, buttons renamed)
- ✓ Sidebar header fixed with directory name and change button
- ✓ Empty state and error messaging implemented

### Nice to Have (Optional)

- Smooth animations for sidebar resize
- Loading states during thumbnail generation
- Skeleton loaders for thumbnails while loading

## Future Considerations (Not in This Sprint)

- File count indicator in sidebar header (e.g., "42 images")
- Mark/highlight images that have been used in slots
- Search/filter functionality in sidebar
- Mobile/tablet support
- Custom sort orders or drag-to-reorder
- Multiple directory selection
- Sort by EXIF date metadata
- Thumbnail caching (IndexedDB)
- Retry mechanism for failed individual thumbnails
- Firefox/Safari support via fallback methods
