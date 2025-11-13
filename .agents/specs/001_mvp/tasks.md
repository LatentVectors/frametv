# Spec Tasks

## Tasks

- [x] 1. Project Setup and Configuration

  - [x] 1.1 Use `npx create-next-app@latest` to initialize Next.js project with TypeScript and app router (select TypeScript, App Router, TailwindCSS when prompted)
  - [x] 1.2 Verify TailwindCSS is configured (should be included in create-next-app)
  - [x] 1.3 Install and configure ShadCN UI
  - [x] 1.4 Install react-konva and konva dependencies
  - [x] 1.5 Create additional project directories (components/, lib/, types/) if not already present
  - [x] 1.6 Verify dev server runs with `npm run dev`

- [x] 2. Type Definitions and Configuration Constants

  - [x] 2.1 Create `types/index.ts` with Slot, ImageAssignment, and Template types
  - [x] 2.2 Create `lib/config.ts` with margin (4%) and gap (4%) constants
  - [x] 2.3 Define canvas dimensions constant (3840×2160) and preview minimum (960×540)
  - [x] 2.4 Export configuration values for use across components

- [x] 3. Template Definitions

  - [x] 3.1 Create `lib/templates.ts` with template type definitions
  - [x] 3.2 Implement Single Image template with slot coordinates (x: 4%, y: 4%, width: 92%, height: 92%, id: "single-1")
  - [x] 3.3 Implement Two Images template with wide and narrow slots (using config margins/gaps)
  - [x] 3.4 Implement Triptych template with three equal columns
  - [x] 3.5 Implement Wide + Two Stacked Squares template with calculated coordinates
  - [x] 3.6 Create template array/object with all four templates and helper functions to get template by ID

- [x] 4. Basic UI Layout and Page Structure

  - [x] 4.1 Create `app/page.tsx` with top bar layout (Template Selector left, Export Button right)
  - [x] 4.2 Implement minimal, clean layout using TailwindCSS (white background, centered canvas area)
  - [x] 4.3 Add canvas container div that will hold the react-konva Stage
  - [x] 4.4 Set up responsive layout that maintains 16:9 aspect ratio for canvas preview area

- [x] 5. Canvas Editor Foundation

  - [x] 5.1 Create `components/CanvasEditor.tsx` with react-konva Stage component
  - [x] 5.2 Implement canvas auto-scaling to fit viewport (max 90% width, maintain 16:9, min 960×540)
  - [x] 5.3 Set canvas background color to pure white (#FFFFFF)
  - [x] 5.4 Add Layer component for rendering slots and images
  - [x] 5.5 Integrate CanvasEditor into main page component

- [x] 6. Slot Rendering and Outlines

  - [x] 6.1 Create `components/Slot.tsx` component for rendering slot rectangles
  - [x] 6.2 Implement slot outline rendering with dashed borders using Konva Rect
  - [x] 6.3 Convert percentage-based slot coordinates to pixel coordinates based on canvas scale
  - [x] 6.4 Render all slots for selected template on canvas
  - [x] 6.5 Add hover state visual feedback (highlighted border) for active slot

- [x] 7. Template Selector Component

  - [x] 7.1 Create `components/TemplateSelector.tsx` using ShadCN Select component
  - [x] 7.2 Populate dropdown with four template options (Single Image, Two Images, Triptych, Wide + Two Stacked Squares)
  - [x] 7.3 Implement template selection handler that updates canvas and clears image assignments
  - [x] 7.4 Integrate TemplateSelector into top bar of main page
  - [x] 7.5 Add state management for selected template using React useState

- [x] 8. Image Loading and Drag-and-Drop Foundation

  - [x] 8.1 Create `lib/imageUtils.ts` with image loading helper using URL.createObjectURL()
  - [x] 8.2 Implement file type validation (JPEG, PNG primarily, with fallback for other HTML5 Image API formats)
  - [x] 8.3 Add drag-and-drop event handlers to CanvasEditor (onDragOver, onDrop)
  - [x] 8.4 Implement slot hit detection using Konva's hit detection to determine which slot contains drop coordinates
  - [x] 8.5 Handle invalid drops (outside slots - ignore silently)

- [x] 9. Image Assignment to Slots

  - [x] 9.1 Create `components/ImageLayer.tsx` for rendering images within slots
  - [x] 9.2 Implement image assignment state management (slotId → ImageAssignment mapping)
  - [x] 9.3 Calculate initial transform on drop: center image and scale to fill slot (maintain aspect ratio, crop excess)
  - [x] 9.4 Render assigned images clipped within slot boundaries using Konva clipping
  - [x] 9.5 Update canvas when image is assigned to a slot

- [x] 10. Image Panning (Drag) Functionality

  - [x] 10.1 Add drag handlers to ImageLayer component for panning images within slots
  - [x] 10.2 Implement drag constraints to keep image within slot boundaries
  - [x] 10.3 Update transform state (x, y) during drag operations
  - [x] 10.4 Ensure smooth drag performance with proper event handling

- [x] 11. Image Selection and Visual Feedback

  - [x] 11.1 Implement image selection on click (only one image selected at a time)
  - [x] 11.2 Add visual feedback for selected image (different border color)
  - [x] 11.3 Implement deselection (click empty canvas or another slot)
  - [x] 11.4 Add highlighted border for active slot (hover/ready for drop state)

- [x] 12. Selection Handles and Scaling

  - [x] 12.1 Create selection handles component (corner and edge handles as small squares/circles)
  - [x] 12.2 Render selection handles on selected image (8 handles: 4 corners + 4 edges)
  - [x] 12.3 Implement corner handle drag for proportional scaling
  - [x] 12.4 Implement edge handle drag for single-axis scaling
  - [x] 12.5 Constrain scaling to keep image within slot boundaries
  - [x] 12.6 Update transform state (scaleX, scaleY) during scaling operations

- [x] 13. Error Handling and Toast Notifications

  - [x] 13.1 Install and configure toast notification library (ShadCN toast or similar)
  - [x] 13.2 Implement error handling for invalid file types in drag-and-drop
  - [x] 13.3 Show toast notification "Invalid file type. Please drop JPEG or PNG images." (auto-dismiss after 3 seconds)
  - [x] 13.4 Handle image loading errors gracefully

- [x] 14. Export Functionality

  - [x] 14.1 Create `lib/imageUtils.ts` export helper function
  - [x] 14.2 Implement full-resolution image loading (3840×2160) on export
  - [x] 14.3 Render canvas at full resolution for export
  - [x] 14.4 Generate JPEG using stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.95 })
  - [x] 14.5 Create download link with filename format: frametv-mat-{timestamp}.jpg
  - [x] 14.6 Trigger automatic download and cleanup
  - [x] 14.7 Add loading state/indicator during export process

- [x] 15. Export Button Component

  - [x] 15.1 Create Export Button component in top bar (right side)
  - [x] 15.2 Style button using ShadCN Button component with minimal design
  - [x] 15.3 Connect button click handler to export functionality
  - [x] 15.4 Add disabled state during export process

- [x] 16. Performance Optimization and Polish
  - [x] 16.1 Implement preview resolution optimization (use lower resolution images for preview, full resolution only on export)
  - [x] 16.2 Optimize canvas rendering to prevent unnecessary re-renders
  - [x] 16.3 Test performance with 3-4 images per template
  - [x] 16.4 Verify smooth interactions on MacBook Pro 2015 with Chrome
  - [x] 16.5 Clean up any console warnings or errors
