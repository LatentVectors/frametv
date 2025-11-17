# Spec Tasks

## Tasks

- [x] 1. Install Dependencies and Project Setup

  - [x] 1.1 Install `masonic` and `sharp` packages via npm
  - [x] 1.2 Install `@types/sharp` as dev dependency
  - [x] 1.3 Create directory structure: `components/ImageSidebar/` folder
  - [x] 1.4 Create `contexts/` folder if not exists
  - [x] 1.5 Create `lib/fileSystemUtils.ts` file for File System Access API helpers

- [x] 2. Create Sidebar Context and State Management

  - [x] 2.1 Create `contexts/SidebarContext.tsx` with context definition
  - [x] 2.2 Define context shape: directoryPath, directoryHandle, images array, sidebarWidth
  - [x] 2.3 Implement SidebarProvider component with useState for all state values
  - [x] 2.4 Create helper functions: setDirectory, setImages, setSidebarWidth, clearDirectory
  - [x] 2.5 Implement localStorage persistence for directoryPath and sidebarWidth
  - [x] 2.6 Load persisted values on provider mount

- [x] 3. Create Resizable Sidebar Hook

  - [x] 3.1 Create `hooks/useResizableSidebar.ts` custom hook
  - [x] 3.2 Implement mouse event handlers for drag: handleMouseDown, handleMouseMove, handleMouseUp
  - [x] 3.3 Add constraints: min width 200px, max width 600px, default 300px
  - [x] 3.4 Return width value and drag handler refs
  - [x] 3.5 Add cleanup for event listeners on unmount

- [x] 4. Implement Backend API Route for Directory Browsing

  - [x] 4.1 Create `app/api/directory/browse/route.ts` file
  - [x] 4.2 Implement POST handler accepting directory path and page number
  - [x] 4.3 Add filesystem access to read directory contents (Node.js fs module)
  - [x] 4.4 Filter files for `.jpg`, `.jpeg`, `.png` extensions (case-insensitive)
  - [x] 4.5 Sort filtered files alphabetically by filename
  - [x] 4.6 Implement pagination logic (50-100 images per page)
  - [x] 4.7 Generate thumbnails using `sharp` (300px width, JPEG 85% quality)
  - [x] 4.8 Return response matching spec format: success, directory, images array, page, limit, total, hasMore

- [x] 5. Create File System Access API Utilities

  - [x] 5.1 In `lib/fileSystemUtils.ts`, create `selectDirectory()` function using `window.showDirectoryPicker()`
  - [x] 5.2 Add `showConfirmationDialog()` wrapper around `window.confirm()` with specified message
  - [x] 5.3 Create `getDirectoryPath()` helper to extract path from FileSystemDirectoryHandle
  - [x] 5.4 Add `validateDirectoryAccess()` function to check if directory is still accessible
  - [x] 5.5 Export all utility functions

- [x] 6. Build Base Sidebar Component with Error Boundary

  - [x] 6.1 Create `components/ImageSidebar/index.tsx` main component
  - [x] 6.2 Implement Error Boundary class component or use react-error-boundary
  - [x] 6.3 Create error fallback UI with "Retry" button that reloads sidebar
  - [x] 6.4 Wrap sidebar content in Error Boundary
  - [x] 6.5 Add base layout: white background, thin gray border on right edge
  - [x] 6.6 Consume SidebarContext for accessing shared state

- [x] 7. Implement Directory Selector Component

  - [x] 7.1 Create `components/ImageSidebar/DirectorySelector.tsx`
  - [x] 7.2 Implement empty state UI: button with "Select a folder to browse images" message
  - [x] 7.3 Add click handler to trigger `selectDirectory()` from fileSystemUtils
  - [x] 7.4 Show confirmation dialog after directory selection
  - [x] 7.5 On confirmation, call backend API with directory path to load first 100 images
  - [x] 7.6 Update SidebarContext with directory path and images
  - [x] 7.7 Handle errors: show message if directory empty or no JPEG/PNG files

- [x] 8. Create Sidebar Header Component

  - [x] 8.1 Create header section in `components/ImageSidebar/index.tsx`
  - [x] 8.2 Display folder name (truncate if >30 characters with ellipsis)
  - [x] 8.3 Add tooltip with full path on hover (700ms delay)
  - [x] 8.4 Add "Change Folder" button that triggers directory selection flow
  - [x] 8.5 Make header fixed position (sticky) at top of sidebar
  - [x] 8.6 Style header with padding and bottom border separator

- [x] 9. Implement Resize Handle Component

  - [x] 9.1 Create `components/ImageSidebar/ResizeHandle.tsx`
  - [x] 9.2 Render thin vertical div on right edge of sidebar (8px wide)
  - [x] 9.3 Add cursor style: `cursor: col-resize`
  - [x] 9.4 Integrate with `useResizableSidebar` hook for drag functionality
  - [x] 9.5 Add visual indicator on hover (slightly darker or highlighted)
  - [x] 9.6 Position absolutely on right edge of sidebar

- [x] 10. Create Image Thumbnail Component

  - [x] 10.1 Create `components/ImageSidebar/ImageThumbnail.tsx`
  - [x] 10.2 Accept props: image data (filename, path, thumbnailDataUrl), onDragStart handler
  - [x] 10.3 Implement draggable div with `draggable={true}`
  - [x] 10.4 On dragStart, set `dataTransfer` with file path: `e.dataTransfer.setData('text/plain', filePath)`
  - [x] 10.5 Render thumbnail using img tag with thumbnailDataUrl
  - [x] 10.6 Add hover effect: border highlight
  - [x] 10.7 Handle failed thumbnails: show Lucide React `ImageOff` icon placeholder
  - [x] 10.8 Style thumbnail: 150px width, appropriate height, border-radius

- [x] 11. Build Image Grid with Masonic

  - [x] 11.1 Create `components/ImageSidebar/ImageGrid.tsx`
  - [x] 11.2 Import and configure `Masonry` component from `masonic`
  - [x] 11.3 Set column width to 150px, gap to 12px
  - [x] 11.4 Implement render function that creates ImageThumbnail for each item
  - [x] 11.5 Set up virtual scrolling with appropriate overscan
  - [x] 11.6 Implement infinite scroll: detect when near bottom and load next page
  - [x] 11.7 Call backend API for next batch when scrolling (pagination)
  - [x] 11.8 Show loading indicator while fetching more images

- [x] 12. Update Main Page Layout Structure

  - [x] 12.1 Modify `app/page.tsx` to import and add SidebarProvider wrapper
  - [x] 12.2 Change main content area to use flexbox horizontal layout
  - [x] 12.3 Add ImageSidebar component on left side
  - [x] 12.4 Update canvas container to use `flex: 1`
  - [x] 12.5 Calculate and set main container height: `calc(100vh - [topbar-height])`
  - [x] 12.6 Ensure layout uses `display: flex; flex-direction: row`

- [x] 13. Reorganize Top Bar Layout

  - [x] 13.1 In `app/page.tsx`, move TemplateSelector to right side of top bar
  - [x] 13.2 Group TemplateSelector with Export and Save buttons
  - [x] 13.3 Update `components/ExportButton.tsx` to change text to "Export" (remove "JPEG")
  - [x] 13.4 Update `components/SaveButton.tsx` to change text to "Save" (remove "Image")
  - [x] 13.5 Adjust top bar styling for better button grouping
  - [x] 13.6 Ensure top bar remains full width above sidebar and canvas

- [x] 14. Fix Canvas Viewport Height Constraint

  - [x] 14.1 In `components/CanvasEditor.tsx`, calculate `maxCanvasHeight`
  - [x] 14.2 Update useEffect for canvas sizing to get `window.innerHeight - topBarHeight - padding`
  - [x] 14.3 Calculate display dimensions: `displayHeight = Math.min(maxCanvasHeight, aspectRatioHeight)`
  - [x] 14.4 Ensure `displayHeight <= maxCanvasHeight` constraint always enforced
  - [x] 14.5 Scale width proportionally to maintain 16:9 aspect ratio
  - [x] 14.6 Test that canvas never exceeds viewport height with/without sidebar

- [x] 15. Implement Sidebar Image Drop Handler in Canvas

  - [x] 15.1 In `components/CanvasEditor.tsx`, create new `handleSidebarImageDrop` function
  - [x] 15.2 Add logic to differentiate sidebar drops from filesystem drops (check dataTransfer type)
  - [x] 15.3 Read file path from `dataTransfer.getData('text/plain')`
  - [x] 15.4 Load full-resolution image from File System Access API handle
  - [x] 15.5 Apply same image assignment logic as existing drop handler
  - [x] 15.6 Calculate initial transform (center and fill slot)
  - [x] 15.7 Update imageAssignments state with new assignment

- [x] 16. Integrate Drag and Drop Between Sidebar and Canvas

  - [x] 16.1 Ensure ImageThumbnail dragStart sets correct data type
  - [x] 16.2 Test drag from sidebar to canvas slots
  - [x] 16.3 Verify existing drag-from-filesystem still works
  - [x] 16.4 Ensure drop handler correctly identifies source (sidebar vs filesystem)
  - [x] 16.5 Test with multiple slots and template switching
  - [x] 16.6 Verify images load at full resolution when dropped

- [x] 17. Implement Empty States and Error Messages

  - [x] 17.1 Add empty state UI in DirectorySelector when no directory selected
  - [x] 17.2 Show message "This folder is empty or contains no JPEG/PNG images" for empty directories
  - [x] 17.3 Display error message "The selected directory is no longer accessible. Please select a new directory." when directory inaccessible
  - [x] 17.4 Add logic to clear cached directory path on access error
  - [x] 17.5 Ensure all error messages are user-friendly and actionable

- [x] 18. Add Persistence and State Restoration

  - [x] 18.1 Verify localStorage persistence for directory path working correctly
  - [x] 18.2 Verify localStorage persistence for sidebar width working correctly
  - [x] 18.3 On page load, restore directory path from localStorage
  - [x] 18.4 If directory path exists, call backend API to reload images
  - [x] 18.5 Restore sidebar width from localStorage or use 300px default
  - [x] 18.6 Handle case where persisted directory no longer accessible
