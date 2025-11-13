# **Frame TV Mat Editor – MVP Requirements (Updated)**

## **1. Overview**

The Frame TV Mat Editor is a **Mac-only web tool** that allows users to compose digital mats for the Samsung Frame TV. Users will select a mat template and **drag local images from Finder directly into specific slots**. They can pan and scale images within the slot and export the composition as a JPEG at full Frame TV resolution.

The MVP focuses on **direct slot assignment, drag-drop from Finder, template selection, per-slot image transformation, and export**.

### **1.1 Sprint Scope**

This sprint implements the complete MVP from scratch:

- Set up Next.js project with TypeScript, TailwindCSS, and ShadCN UI
- Implement four hard-coded mat templates with percentage-based slot layouts
- Build canvas editor using react-konva with drag-and-drop image assignment
- Implement image transformation (pan and scale) with visual selection handles
- Add export functionality to generate 3840×2160 JPEG files
- Configure margins and gaps via constants file (default 4% each)

### **1.2 User Stories**

**US-1: Template Selection**

- As a user, I want to select from four mat templates (Single Image, Two Images, Triptych, Wide + Two Stacked Squares) so that I can choose the layout that fits my images.
- Acceptance: Template selector dropdown displays all four options; selecting a template updates the canvas and clears previous images.

**US-2: Image Assignment**

- As a user, I want to drag images from Finder directly onto specific slots so that I can assign images to exact positions in my mat.
- Acceptance: Dragging an image file onto a slot assigns it only to that slot; image is centered and scaled to fill the slot; invalid file types show error toast.

**US-3: Image Transformation**

- As a user, I want to pan and scale images within their slots using drag handles so that I can position images exactly as I want them.
- Acceptance: Clicking an image shows selection handles; dragging image body pans it; dragging handles scales it; only one image can be selected at a time.

**US-4: Export Composition**

- As a user, I want to export my completed mat as a 3840×2160 JPEG file so that I can use it on my Frame TV.
- Acceptance: Export button generates JPEG at full resolution; file downloads with timestamp-based filename; export process shows loading indicator.

---

## **2. Target Platform**

- **Mac-only**, tested on MacBook Pro 2015.
- Desktop-first; optimized for **Finder drag-and-drop**.
- Browser-based (Chrome).
- Canvas internal coordinate space: **3840×2160** (16:9).
- Preview canvas auto-scales to fit viewport while maintaining 16:9 aspect ratio, with max width of 90% viewport width. Scale factor calculated dynamically. Minimum preview resolution: **960×540**.

---

## **3. Stack / Architecture**

| Layer              | Technology                                                   | Purpose                                                                                                                                 |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Framework | **Next.js + TypeScript**                                     | App structure, page routing, type safety                                                                                                |
| UI Styling         | **TailwindCSS + ShadCN UI**                                  | Template selector, buttons, layout, responsive UI                                                                                       |
| Canvas Layer       | **react-konva / Konva.js**                                   | Canvas rendering, image drag-drop, slot clipping, transformations                                                                       |
| State Management   | React `useState`                                             | Track template, images per slot, transform state                                                                                        |
| File Handling      | HTML5 Drag-and-Drop API                                      | Load images from Mac Finder without server. Supports JPEG and PNG primarily; other HTML5 Image API formats supported if minimal effort. |
| Export             | `stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.95 })` | Flatten canvas and download JPEG                                                                                                        |
| Distribution       | Local web app                                                | Open via `npm run dev`; Mac-only MVP                                                                                                    |

---

## **4. Functional Requirements**

### **4.1 Template Selection**

- Users can select one of four **hard-coded mat templates**:

  - Single Image
  - Two Images (Wide + Narrow) (2/3 | 1/3)
  - Triptych (Equal width)
  - Wide + Two Stacked Squares (Wide is a horizontal "landscape" approximately 2/3 with the staked squares taking up the 1/3 column)

- Switching templates updates the canvas slots and **resets all assigned images**.

---

### **4.2 Slots and Image Assignment**

- Each template defines a set of **slots** (rectangles) using percentage-based coordinates for scalability.
- **Slot identification:** Each slot has a unique string ID:
  - Single Image: `"single-1"`
  - Two Images: `"two-wide-1"`, `"two-narrow-2"`
  - Triptych: `"triptych-1"`, `"triptych-2"`, `"triptych-3"`
  - Wide + Two Stacked Squares: `"wide-stack-wide-1"`, `"wide-stack-square-2"`, `"wide-stack-square-3"`
- **Drag-and-drop per slot:**

  - Users can drag an image file from Finder directly onto a **specific slot**.
  - The image is assigned to that slot only;
  - Slots can remain empty until the user drops an image.
  - On drop, image is **centered and scaled to fill** the slot (maintains aspect ratio, crops excess rather than showing empty space).

- **Slot clipping:** images must be constrained within the slot boundaries.
- **Visual feedback:**
  - Active slot (hover/ready for drop): highlighted border
  - Selected image: different border color + selection handles (corner/edge drag handles for scaling)

---

### **4.3 Image Transformation**

- **Draggable:** user can drag the image body to move it inside its slot.
- **Scalable:** user can scale the image using corner/edge drag handles on the selected image. Handles appear as small squares/circles at corners and midpoints of edges. Dragging corner handles scales proportionally; dragging edge handles scales along one axis.
- **Selection:** Only one image can be transformed at a time. Clicking an image selects it and shows selection handles. Clicking empty canvas or another slot deselects the current image.
- **No rotation** in MVP.
- Transformations apply to the image **only within the slot**.

---

### **4.4 Export**

- Users can export the canvas as **JPEG 3840×2160**.
- Flatten all slots and images; output a single image file.
- Export filename format: `frametv-mat-{timestamp}.jpg` (e.g., `frametv-mat-20241215-143022.jpg`).
- Download automatically triggers via HTML `<a>` element.
- Export uses full-resolution images (3840×2160); preview uses lower resolution for performance.

---

### **4.5 UI Elements**

- **Layout:** Top bar with Template Selector (left) and Export Button (right). Canvas centered below, taking remaining space. Minimal, clean layout.
- **Template Selector**: ShadCN `Select` dropdown to pick a mat.
- **Canvas / Stage**:

  - Shows slot outlines (dashed border).
  - Background color: pure white (#FFFFFF).
  - Assigned images appear clipped in their slot.
  - Drag-and-scale interactions apply only to the image in that slot.

- **Export Button**: triggers JPEG download.

---

## **5. Data Structures**

- Each slot is uniquely identifiable via string ID (see section 4.2).
- **Slot type:** `{ id: string, x: number, y: number, width: number, height: number }` where coordinates are percentages (0-100).
- **ImageAssignment type:** `{ slotId: string, imageUrl: string, x: number, y: number, scaleX: number, scaleY: number }` where transform coordinates are relative to slot (pixels or percentage).
- Transform state tracks: `x`, `y`, `scaleX`, `scaleY` relative to slot coordinates. Initial transform on drop: `x = slotWidth/2 - imageWidth/2`, `y = slotHeight/2 - imageHeight/2`, `scaleX` and `scaleY` calculated to fill slot while maintaining aspect ratio.

---

## **6. Event Flow**

1. **Template selection:**

   - User selects a mat template → editor renders slots → clears previous images.

2. **Drag-and-drop to specific slot:**

   - User drags image from Finder → drops on desired slot → image assigned only to that slot → image centered and scaled to fill slot → rendered clipped inside slot.
   - Slot hit detection: Use Konva's hit detection to determine which slot rectangle contains the drop coordinates. If drop occurs outside any slot, ignore the drop (no error message).
   - Image loading: Use `URL.createObjectURL()` to create object URLs from dropped File objects for efficient memory usage.
   - If invalid file type dropped: show toast notification "Invalid file type. Please drop JPEG or PNG images." (dismisses after 3 seconds).

3. **Image manipulation:**

   - User drags / scales image → updates canvas.

4. **Export:**

   - User clicks **Export JPEG** → load full-resolution images (3840×2160) if not already loaded → render canvas at full resolution → flatten canvas → convert to JPEG via `stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.95 })` → create download link → trigger download → cleanup.
   - Export process should show loading state/indicator during full-resolution image loading and rendering.

---

## **7. Slot Layouts (Percentage-Based)**

All templates use percentage-based coordinates for scalability. Margins and gaps are configurable via a constants/configuration file (default: 4% each). Margins are equal on all sides; gaps between slots are equal.

### **7.1 Configuration**

- **Margin:** 4% (configurable, applies to all sides equally)
- **Gap:** 4% (configurable, applies between all slots equally)
- Stored in configuration file (e.g., `lib/config.ts` or `constants.ts`)

### **7.2 Template Definitions**

**Template 1: Single Image**

- 1 slot covering entire canvas minus margins
- Slot ID: `"single-1"`
- Coordinates: `x: 4%, y: 4%, width: 92%, height: 92%`

**Template 2: Two Images (Wide + Narrow)**

- 2 slots: left wide (2/3 of usable width), right narrow (1/3 of usable width)
- Slot IDs: `"two-wide-1"`, `"two-narrow-2"`
- Usable width = 92% (100% - 8% margins), gap = 4%
- Left slot width = (92% - 4% gap) × 2/3 = 58.67%
- Right slot width = (92% - 4% gap) × 1/3 = 29.33%
- Left slot: `x: 4%, y: 4%, width: 58.67%, height: 92%`
- Right slot: `x: 66.67%, y: 4%, width: 29.33%, height: 92%` (4% + 58.67% + 4% gap = 66.67%)

**Template 3: Triptych**

- 3 equal vertical columns
- Slot IDs: `"triptych-1"`, `"triptych-2"`, `"triptych-3"`
- Usable width = 92%, two gaps = 8%
- Each column width = (92% - 8% gaps) / 3 = 28%
- Column 1: `x: 4%, y: 4%, width: 28%, height: 92%`
- Column 2: `x: 36%, y: 4%, width: 28%, height: 92%` (4% + 28% + 4% gap = 36%)
- Column 3: `x: 68%, y: 4%, width: 28%, height: 92%` (36% + 28% + 4% gap = 68%)

**Template 4: Wide + Two Stacked Squares**

- Left wide slot (~2/3 of usable width), right column with two stacked squares (~1/3 of usable width)
- Slot IDs: `"wide-stack-wide-1"`, `"wide-stack-square-2"`, `"wide-stack-square-3"`
- Usable width = 92%, gap = 4%
- Left slot width = (92% - 4% gap) × 2/3 = 58.67%
- Right column width = (92% - 4% gap) × 1/3 = 29.33%
- Usable height = 92%, gap between squares = 4%
- Each square height = (92% - 4% gap) / 2 = 44%
- Left wide slot: `x: 4%, y: 4%, width: 58.67%, height: 92%`
- Top square: `x: 66.67%, y: 4%, width: 29.33%, height: 44%` (prefer perfect squares; slight rectangularity allowed if needed for gap alignment)
- Bottom square: `x: 66.67%, y: 52%, width: 29.33%, height: 44%` (4% + 44% + 4% gap = 52%)

**Note:** Exact percentage calculations account for margins (4% each side = 8% total) and gaps (4% between slots). Each slot represented in code with `x, y, width, height` (percentages) and `id` (string).

---

## **8. Constraints / Out of Scope**

- Margins and gaps are configurable via constants file but fixed per session (default 4% each, equal for all templates). No dynamic calculation or per-template variation in MVP.
- No shadows, bevels, or mat textures. Matte around the images will just be a solid single color: pure white (#FFFFFF).
- No undo/redo.
- No batch export of multiple images.
- No mobile or Windows support.
- No image rotation.
- No saving/loading projects. Finished images will just be downloaded to the user's downloads directory.
- Only local file drag-drop from Mac Finder.

---

## **9. Non-Functional Requirements**

- Smooth performance for 3–4 images per template.
- Preview uses lower resolution images for performance (minimum 960×540). Export always uses full-resolution images (3840×2160) loaded on-demand.
- Code structured in React + TypeScript for **future extensibility** (dynamic layouts, overlays, batch export, etc.).
- Standard Next.js repository structure (app router).

---

## **10. Success Criteria (MVP)**

- User can select **any template** from the dropdown.
- User can **drag and drop images into specific slots** only.
- User can **pan and scale** images inside slots.
- Slots remain clipped to their boundaries.
- User can **export final composition** as 3840×2160 JPEG.
- App is **stable and smooth** on MacBook Pro 2015 with Chrome.

---

## **11. File Structure**

Standard Next.js app router structure:

```
app/
  page.tsx                    # Main editor page
components/
  TemplateSelector.tsx        # ShadCN Select dropdown for template selection
  CanvasEditor.tsx            # Main canvas component (react-konva Stage)
  Slot.tsx                    # Individual slot component/clipping logic
  ImageLayer.tsx              # Image rendering within slot with transforms
lib/
  config.ts                   # Configuration constants (margins, gaps)
  templates.ts                # Template definitions with slot layouts
  imageUtils.ts               # Image loading, export helpers
types/
  index.ts                    # TypeScript types (ImageAssignment, Slot, etc.)
```

## **12. Visual Design**

Clean, minimal layout and style that lets you focus on the mats and the images. This is about editing images, so we want to keep everything very simple and minimalist to put the attention on the images. Modern, minimalist aesthetic throughout.
