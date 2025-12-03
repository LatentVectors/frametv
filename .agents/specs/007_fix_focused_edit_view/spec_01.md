# Sprint 007: Fix Focused Edit View (SlotEditorModal)

## Overview

This sprint addresses critical issues with the full-screen slot editing modal (`SlotEditorModal.tsx`). The modal currently does not apply image filters in real-time, has inconsistent crop behavior, and lacks feature parity with the main editor panel. The goal is to ensure the modal provides identical editing capabilities and visual feedback as the main editor view.

**Breaking Changes**: This sprint introduces a new crop coordinate system relative to the rotated bounding box and removes the legacy `x`, `y`, `scaleX`, `scaleY` positioning fields. All existing gallery images and image assignments will be cleared at the end of this sprint for a fresh start. This is acceptable as we are in rapid MVP development with only test data.

## Non-Goals

The following are explicitly out of scope for this sprint:

- Backwards compatibility with existing image assignments
- Data migration scripts or legacy data handling
- Edge handles for crop resize (corners only)
- Preset rotation buttons (90°, 180°, etc.)
- Undo/redo functionality within the modal
- Keyboard shortcuts for adjustments

## Problems Identified

1. **Filters not applied in modal**: Moving sliders has no visual effect on the image preview
2. **Black & White preset doesn't remove all color**: Saturation at -100 via Konva's HSL filter doesn't produce true grayscale
3. **Sepia preset doesn't remove all color**: The temperature/saturation combination doesn't create authentic sepia tones
4. **Crop aspect ratio not locked to slot**: Crop rectangle can be resized to arbitrary aspect ratios
5. **Modal shows only cropped area**: Full image with grayed-out regions outside crop is not visible
6. **Missing eye icons and reset icons**: Individual filter enable/disable and reset controls are absent
7. **Cancel button placement**: Cancel is on left, should be next to Save on right
8. **Crop rectangle behavior with rotation**: Needs to stay axis-aligned and shrink when rotation would push it outside image bounds

## Technical Decisions

### 1. Filter Application in Modal - Use Konva Rendering

**Decision**: Refactor `SlotEditorModal.tsx` to use Konva `Stage`/`Layer`/`Image` structure instead of raw HTML Canvas.

**Rationale**: The main editor uses Konva's filter system (`Brighten`, `Contrast`, `HSL`, `TemperatureTint`, `Monochrome`). Using the same rendering approach ensures identical filter behavior. The current raw canvas approach bypasses all filter logic.

**Implementation**:

- Replace `<canvas>` element with Konva `Stage` component
- Apply filters using the same Konva filter array approach as `ImageLayer.tsx`
- Create shared filter application utilities (see Architecture section)

### 2. Dedicated Black & White and Sepia Filters

**Decision**: Implement new custom Konva filter implementations that process pixel data directly.

**Files to create**:

- `apps/web/lib/filters/blackWhite.ts` - Grayscale using luminance formula `(0.299*R + 0.587*G + 0.114*B)`
- `apps/web/lib/filters/sepia.ts` - Standard sepia matrix transformation

**Rationale**: The monochrome filter works well because it directly manipulates pixel data. The HSL-based approach for Black & White doesn't produce true grayscale.

**Black & White Filter Logic**:

```
luminance = 0.299 * R + 0.587 * G + 0.114 * B
output R = G = B = luminance
```

**Sepia Filter Logic** (standard matrix):

```
outputR = min(255, (R * 0.393) + (G * 0.769) + (B * 0.189))
outputG = min(255, (R * 0.349) + (G * 0.686) + (B * 0.168))
outputB = min(255, (R * 0.272) + (G * 0.534) + (B * 0.131))
```

### 3. Filter Preset Implementation

**Decision**: Presets activate dedicated filters using boolean flags, independent of slider values.

**Deprecation Note**: The existing `FilterPreset` type (`'none' | 'blackWhite' | 'sepia' | 'monochrome'`) in `SlotEditorModal.tsx` is removed and replaced with three independent boolean flags. This provides more explicit state management and cleaner persistence.

**Implementation**:

When "Black & White" is clicked:

- Set `blackWhiteEnabled: true` on the assignment
- Apply the `BlackWhite` Konva filter in the filter chain
- Saturation slider remains at its current value but its color effect is overridden by the B&W filter
- Clicking B&W again sets `blackWhiteEnabled: false`

When "Sepia" is clicked:

- Set `sepiaEnabled: true` on the assignment
- Apply the `Sepia` Konva filter in the filter chain
- Temperature/saturation/brightness sliders remain at their values but sepia filter overrides color
- Clicking Sepia again sets `sepiaEnabled: false`

**Preset Mutual Exclusivity**: Black & White, Sepia, and Monochrome presets are mutually exclusive. Activating one deactivates the others. When activating a preset:

- Setting `blackWhiteEnabled: true` automatically sets `sepiaEnabled: false` and `monochromeEnabled: false`
- Setting `sepiaEnabled: true` automatically sets `blackWhiteEnabled: false` and `monochromeEnabled: false`
- Setting `monochromeEnabled: true` automatically sets `blackWhiteEnabled: false` and `sepiaEnabled: false`

**Slider Interaction with Active Presets**: When a color preset (B&W, Sepia, Monochrome) is active:

- Sliders that have no visible effect should be visually disabled (grayed out)
- A tooltip on disabled sliders should explain: "No effect while [preset name] is active"
- The underlying values continue to be stored and will take effect when the preset is deactivated
- Brightness and Contrast sliders remain active (they affect the final output even with color presets)
- Saturation, Hue, Temperature, and Tint sliders are disabled when any color preset is active
- The Monochrome color picker is disabled when B&W or Sepia is active (with tooltip: "No effect while [preset name] is active")
- The `monochromeColor` value is preserved when switching presets; only the `monochromeEnabled` flag changes

### 4. Filter Application Order

**Decision**: Apply filters in standard photo editing order.

**Filter Chain Order**:

1. Brightness
2. Contrast
3. Saturation / HSL (including Hue)
4. Temperature / Tint
5. Black & White OR Sepia OR Monochrome (mutually exclusive color effects - applied last)

**Rationale**: Color effect filters (B&W, Sepia, Monochrome) are applied last so they operate on the fully adjusted image.

### 5. Rendering Pipeline - Rotate First, Then Crop

**Decision**: The image is always rotated first, then cropped. This is the consistent rendering order across all views.

**Rendering Pipeline**:

1. Load original image
2. Apply horizontal mirror if `mirrorX: true` (flip around vertical axis)
3. Rotate image by specified angle (rotation applied around image center)
4. Apply crop to the rotated result
5. Apply filters to the cropped result
6. Scale to output dimensions

**Implementation Split**:

- Steps 1-4 (geometric transforms): Handled by `renderImage()` utility, returns a canvas
- Steps 5-6 (filters + scale): Handled by Konva with filter array applied to the pre-transformed canvas

This split allows the complex geometry math to be isolated in one utility while leveraging Konva's efficient filter system.

**Mirror Behavior**: Mirroring is applied before rotation. This means if an image is mirrored and then rotated 45°, the mirrored version is what gets rotated. This matches typical photo editing software behavior.

**Note**: This differs from the current implementation which crops before rotating. The coordinate system change requires updating `ImageLayer.tsx` and `CanvasEditor.tsx` export logic.

### 6. Crop Coordinate System

**Decision**: Crop coordinates are expressed as percentages (0-100) of the rotated image's axis-aligned bounding box.

**Coordinate System**:

- `rotation`: degrees (-180 to 180)
- `cropX`, `cropY`: position of crop rectangle's top-left corner as percentage of bounding box dimensions
- `cropWidth`, `cropHeight`: size of crop rectangle as percentage of bounding box dimensions

**Bounding Box Calculation**:
When an image with dimensions (W, H) is rotated by angle θ:

```
boundingBoxWidth = |W × cos(θ)| + |H × sin(θ)|
boundingBoxHeight = |W × sin(θ)| + |H × cos(θ)|
```

The crop percentages are relative to this bounding box, which changes as rotation changes.

### 7. Shared Rendering Utility

**Decision**: Create a shared utility that encapsulates the rotate-then-crop-then-filter pipeline for use in multiple contexts.

**File to create**: `apps/web/lib/renderImage.ts`

**Purpose**: This utility provides a single source of truth for the rendering pipeline. It is used by:

1. **Modal preview**: Called to generate the filtered image displayed in the Konva Stage
2. **Main editor `ImageLayer`**: Called to render the image with all transforms and filters
3. **Export in `CanvasEditor`**: Called to generate the final full-resolution output

**Function signature**:

```typescript
interface RenderImageParams {
  image: HTMLImageElement;
  rotation: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  mirrorX: boolean;
}

interface RenderResult {
  canvas: HTMLCanvasElement; // Rotated, cropped, mirrored image (no filters)
  width: number;
  height: number;
}

function renderImage(params: RenderImageParams): RenderResult;
```

**Rationale**: Filters are applied separately via Konva after this utility renders the geometric transforms. This allows Konva's filter system to operate on a pre-transformed image consistently across all views. The utility handles the complex rotate-then-crop coordinate math in one place.

### 8. Valid Crop Area Calculation

**Decision**: Use computational geometry to constrain crop placement within the rotated image.

**Problem**: When an image is rotated, the axis-aligned bounding box has "empty corners" where no image pixels exist. The crop rectangle must stay within the actual image pixels, not just the bounding box.

**Solution**: The valid crop area is the convex polygon formed by the 4 corners of the rotated image. The crop rectangle (which is axis-aligned) must be fully contained within this polygon.

**File to create**: `apps/web/lib/cropGeometry.ts`

**Algorithm Details**:

#### Point-in-Polygon Test (for checking if crop corners are valid)

Use the ray casting algorithm: cast a horizontal ray from the point and count intersections with polygon edges. Odd count = inside, even count = outside.

```
function isPointInPolygon(point, polygon):
  intersections = 0
  for each edge (p1, p2) in polygon:
    if ray from point intersects edge:
      intersections++
  return intersections % 2 == 1
```

#### Rotated Image Polygon Coordinates

Given image dimensions (W, H) and rotation θ, the 4 corners in bounding box coordinates are:

```
centerX = boundingBoxWidth / 2
centerY = boundingBoxHeight / 2

// Original corners relative to image center
corners = [(-W/2, -H/2), (W/2, -H/2), (W/2, H/2), (-W/2, H/2)]

// Rotate each corner and translate to bounding box coordinates
for each (x, y) in corners:
  rotatedX = x * cos(θ) - y * sin(θ) + centerX
  rotatedY = x * sin(θ) + y * cos(θ) + centerY
```

#### Constraining Crop to Valid Area

When crop rectangle is invalid (corners outside polygon):

1. **For move operations**: Find the nearest valid position by projecting the crop center onto the valid region
2. **For resize operations**: Binary search to find the largest valid size that fits at the current position while maintaining aspect ratio

```
function constrainCropToValidArea(cropRect, polygon, aspectRatio):
  if isValidCrop(cropRect, polygon):
    return cropRect

  // Binary search for maximum valid scale (more precise than linear stepping)
  center = cropRect.center
  low = 0.01  // Minimum 1% of original size
  high = 1.0

  while (high - low) > 0.001:  // Precision to 0.1%
    mid = (low + high) / 2
    scaled = scaleFromCenter(cropRect, mid)
    if isValidCrop(scaled, polygon):
      low = mid  // Can go larger
    else:
      high = mid  // Must go smaller

  scaled = scaleFromCenter(cropRect, low)
  if isValidCrop(scaled, polygon):
    return scaled

  // Fallback: minimum crop centered in polygon
  return minimumCropAtCenter(polygon, aspectRatio)

function minimumCropAtCenter(polygon, aspectRatio):
  // Find centroid of the polygon
  centroid = polygonCentroid(polygon)

  // Return a small crop (5% of bounding box) at the centroid
  // This ensures we always have a valid crop even in extreme cases
  minSize = min(boundingBoxWidth, boundingBoxHeight) * 0.05
  if aspectRatio > 1:
    return { x: centroid.x - minSize/2, y: centroid.y - minSize/(2*aspectRatio),
             width: minSize, height: minSize/aspectRatio }
  else:
    return { x: centroid.x - minSize*aspectRatio/2, y: centroid.y - minSize/2,
             width: minSize*aspectRatio, height: minSize }
```

#### Maximum Crop Bounds

To find the maximum crop size at a given aspect ratio:

1. Start with the full bounding box
2. Binary search: reduce size until all 4 corners are inside the polygon
3. Center the result within the valid area

**Functions to implement**:

- `calculateBoundingBox(width, height, rotation)` - Returns bounding box dimensions
- `getRotatedImagePolygon(width, height, rotation)` - Returns 4 corner coordinates in bounding box space
- `isPointInPolygon(point, polygon)` - Returns boolean
- `isValidCropPosition(cropRect, polygon)` - Checks all 4 corners are inside
- `constrainCropToValidArea(cropRect, polygon, aspectRatio)` - Returns adjusted crop
- `getMaxCropAtAspectRatio(polygon, aspectRatio)` - Returns maximum valid crop dimensions and position

### 9. Rotation Change Behavior

**Decision**: When rotation changes, automatically shrink and reposition crop if needed.

**Algorithm**:

1. User changes rotation value
2. Calculate new bounding box dimensions
3. Calculate new valid crop polygon
4. Check if current crop rectangle is still valid
5. If not valid:
   - Preserve the crop center point (in relative terms)
   - Shrink crop proportionally (maintaining slot aspect ratio) until it fits
   - If center is outside valid area, move to nearest valid center position
6. Update crop coordinates to reflect new bounding box percentages
7. Instant resize with no animation or notification

### 9a. Initial Crop for Newly Assigned Images

**Decision**: When an image is first assigned to a slot, initialize crop to the maximum valid area at the slot's aspect ratio.

**Algorithm**:

1. Calculate the rotated image polygon (with default rotation = 0°)
2. Use `getMaxCropAtAspectRatio(polygon, slotAspectRatio)` to find maximum crop
3. Set initial crop values: `cropX`, `cropY`, `cropWidth`, `cropHeight` to center the maximum crop
4. All other values initialize to defaults (see Type Updates section)

**Rationale**: This ensures the image fills as much of the slot as possible while maintaining correct aspect ratio from the start.

### 10. Modal Image Display

**Decision**: Render the complete rotated image with overlays.

**Visual Layers** (bottom to top):

1. **Checkerboard pattern background**: Visible in empty corners of the bounding box where no image pixels exist (clearly indicates "no image here")
2. **Rotated image**: The full image, rotated, centered in the bounding box
3. **Dark overlay**: Semi-transparent (rgba(0,0,0,0.5)) covering areas outside the crop rectangle but inside the image
4. **Crop rectangle**: Visible border with corner handles for resizing

**Checkerboard Specification**:

- Pattern size: 10×10 pixels per square
- Colors: `#e0e0e0` (light gray) and `#ffffff` (white)
- Purpose: Clearly distinguishes "no image content" areas from actual image content

**Behavior**:

- Full image (rotated) is displayed, scaled to fit within available modal container space
- Checkerboard pattern in empty corners clearly shows where there's no image content
- Dark overlay on valid image areas outside crop shows what will be excluded
- Crop rectangle shows exactly what will appear in the slot

### 11. Modal Rendering Layers (Konva Structure)

**Decision**: Use a multi-layer Konva structure for the modal preview.

**Konva Stage Structure**:

```
Stage
├── Layer: Background
│   └── Rect (checkerboard pattern via fillPatternImage)
├── Layer: Image
│   └── Image (rotated, with filters applied, cached)
├── Layer: Overlay
│   └── Shape (custom draw function for dark overlay with crop cutout)
└── Layer: Crop UI
    ├── Rect (crop border, stroke only)
    └── Rect × 4 (corner handles)
```

**Implementation Notes**:

- **Background layer**: Create a small checkerboard pattern canvas (e.g., 20×20 pixels) and use it as `fillPatternImage` on a Rect covering the full stage
- **Image layer**: Apply `renderImage()` result, then apply Konva filters, call `cache()` on the Image node
- **Overlay layer**: Use a custom Shape with `sceneFunc` that draws a filled rect over the entire image area, then uses `globalCompositeOperation: 'destination-out'` to cut out the crop area
- **Crop UI layer**: Separate layer so handles remain crisp and not affected by image filters

**Performance**: Only re-cache the Image layer when filter values change. Crop UI updates don't require re-caching.

### 12. Modal Interaction Model - Crop-Centric

**Decision**: All framing adjustments are accomplished by manipulating the crop rectangle. There is no separate zoom/pan mode.

**Interaction Model**:

- **Shrink crop**: Makes selected area appear larger in final output (effective zoom in)
- **Expand crop**: Shows more of the image in final output (effective zoom out)
- **Move crop**: Drag the crop rectangle to reframe (effective pan)
- **Resize**: Drag corner handles (maintains slot aspect ratio)

**Rationale**: The crop rectangle represents exactly what will be shown in the slot. By keeping the entire image always visible with non-cropped areas indicated, the user can see where the slot content sits in relation to the entire image.

**No separate zoom/pan controls**: Mouse wheel zoom and drag-to-pan for the view itself are removed. The full rotated image always fits in the available modal space.

**Terminology Note**: This is "output framing" not traditional zoom/pan. The preview always shows the full image at a fixed scale; the crop rectangle determines what portion appears in the final slot.

### 13. Modal Initial State - Seamless Transition

**Decision**: When the modal opens, the crop rectangle position and size must exactly match what was shown in the main editor view.

**Required Modal Props**:

```typescript
interface SlotEditorModalProps {
  assignment: ImageAssignment;
  slot: Slot; // Full slot object for dimensions and context
  imageDimensions: { width: number; height: number }; // Original image dimensions
  onSave: (updatedAssignment: ImageAssignment) => void;
  onCancel: () => void;
}
```

**Changes from Current Implementation**:

- `onUpdate(Partial<ImageAssignment>)` → `onSave(ImageAssignment)`: Modal maintains full local state and submits complete assignment on save
- `onClose` → `onCancel`: Renamed for clarity, discards local changes
- Added `imageDimensions`: Required for crop geometry calculations

**Slot Aspect Ratio**: The modal calculates `slotAspectRatio = slot.width / slot.height` and uses this for all crop constraint operations. The crop rectangle is always locked to this aspect ratio.

**Crop Resize Behavior**: When dragging a corner handle:

- The **opposite corner is anchored** (stays fixed)
- Aspect ratio is maintained by constraining to the slot's aspect ratio
- Only corner handles are supported (no edge handles)

**Behavior**:

- On modal open, read the current `rotation`, `cropX`, `cropY`, `cropWidth`, `cropHeight` from the assignment
- Display the full rotated image with the crop rectangle positioned exactly as stored
- The transition from main editor to modal should be seamless - no visual jump or change
- All filter values and enabled states also carry over from the assignment

**Rationale**: This maintains visual continuity and allows the user to understand that the modal is simply a more detailed view of the same editing they were doing in the main view.

### 14. Shared AdjustmentSlider Component

**Decision**: Extract and refactor the existing `SliderControl` component from `ImageEditPanel.tsx` into a shared `AdjustmentSlider` component.

**Current state**: `ImageEditPanel.tsx` contains an inline `SliderControl` component (lines 467-562) with the needed functionality.

**Action**: Extract this component to `apps/web/components/AdjustmentSlider.tsx` and update both `ImageEditPanel.tsx` and `SlotEditorModal.tsx` to use it.

**Component interface**:

```typescript
interface AdjustmentSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  enabled: boolean;
  globalEnabled: boolean; // Master filter toggle
  min: number;
  max: number;
  step?: number;
  disabled?: boolean; // For preset override (grays out slider)
  disabledTooltip?: string; // Tooltip when disabled by preset
  onValueChange: (value: number) => void;
  onToggle: () => void; // Eye icon - toggles enable/disable
  onReset: () => void; // Reset icon - resets to 0
}
```

**Features**:

- Icon for adjustment type
- Slider control
- Numeric input field
- Eye icon button (toggles individual filter on/off)
- Reset icon button (resets that specific adjustment to 0/default)
- Disabled state with tooltip for preset override scenarios

### 15. Cancel Button Placement

**Decision**: Move Cancel button to right side, next to Save button.

**Current layout**:

```
[Cancel]                    [Save]
```

**New layout**:

```
                  [Cancel] [Save]
```

### 16. Architecture - Shared Hooks and Utilities

**Decision**: Extract shared logic into hooks and utilities while keeping `ImageLayer.tsx` and `SlotEditorModal.tsx` as separate components.

**Files to create/modify**:

1. `apps/web/hooks/useImageFilters.ts` - Manages filter state and Konva filter array generation

   - Takes assignment values as input
   - Returns array of Konva filters to apply in correct order
   - Returns function to apply filter attributes to a Konva.Image node

2. `apps/web/hooks/useAdjustmentState.ts` - Manages adjustment values with enable/disable flags for modal local state

   **Hook Signature**:

   ```typescript
   function useAdjustmentState(
     initialAssignment: ImageAssignment,
     imageDimensions: { width: number; height: number },
     slotAspectRatio: number
   ): AdjustmentStateResult;
   ```

   **State fields managed**:

   - Filter values: `brightness`, `contrast`, `saturation`, `hue`, `temperature`, `tint`
   - Filter enabled flags: `brightnessEnabled`, `contrastEnabled`, `saturationEnabled`, `hueEnabled`, `temperatureEnabled`, `tintEnabled`
   - Preset flags: `blackWhiteEnabled`, `sepiaEnabled`, `monochromeEnabled`, `monochromeColor`
   - Transforms: `rotation`, `mirrorX`
   - Crop: `cropX`, `cropY`, `cropWidth`, `cropHeight`
   - Master toggle: `filtersEnabled`

   **Functions provided**:

   - `updateValue(field, value)` - Update a single field
   - `toggleEnabled(field)` - Toggle a filter's enabled flag
   - `togglePreset(preset)` - Toggle a preset with mutual exclusivity (handles deactivating others)
   - `resetField(field)` - Reset a single field to default
   - `resetAll()` - Reset all values to defaults (uses `imageDimensions` and `slotAspectRatio` from hook params):
     - Filter values reset to 0
     - All `*Enabled` flags reset to `true` (individual filters on)
     - Preset flags (`blackWhiteEnabled`, `sepiaEnabled`, `monochromeEnabled`) reset to `false`
     - Transforms reset to identity (`rotation: 0`, `mirrorX: false`)
     - Crop reset to maximum valid area at slot aspect ratio (using `getMaxCropAtAspectRatio`)
   - `getKonvaFilters()` - Returns array of Konva filters based on current state
   - `getAssignment()` - Returns complete `ImageAssignment` for saving

   **Master Toggle Behavior** (`filtersEnabled`):

   - When `filtersEnabled: false`, NO filters are applied regardless of individual `*Enabled` flags
   - The image displays with only geometric transforms (mirror, rotation, crop)
   - When `filtersEnabled: true`, filters are applied based on their individual enabled states
   - This is a performance optimization and a quick way to see the "original" image

3. `apps/web/lib/filters/applyFilters.ts` - Shared filter application logic
   - Function to configure Konva filters on an image node
   - Used by both `ImageLayer.tsx` and `SlotEditorModal.tsx`

### 17. Individual Filter Enable/Disable in Modal

**Decision**: The modal must support toggling individual filter enable/disable (eye icon) and persist these flags back to the assignment on save.

**Implementation**:

- Modal local state includes all `*Enabled` flags (`brightnessEnabled`, `contrastEnabled`, `saturationEnabled`, `hueEnabled`, `temperatureEnabled`, `tintEnabled`)
- Eye icon on each slider toggles the corresponding enabled flag
- On Save, all enabled flags are persisted back to the `ImageAssignment`
- Filters with `enabled: false` are not applied to the preview

### 18. Rotation and Mirror Controls

**Decision**: Rotation and Mirror are transform controls, not filters. They do not have enable/disable toggles.

**Implementation**:

- Rotation slider range: -180° to 180°
- Step precision: 0.1° for fine control
- Numeric input field for exact values
- No preset rotation buttons (90°, 180°, etc.)
- 0° = no rotation, negative = counter-clockwise, positive = clockwise
- Mirror is a simple toggle button (horizontal flip)

**Reset Behavior**: The "Reset All" button resets to identity/default values:

- Rotation → 0°
- MirrorX → false
- Crop → Maximum valid area at slot aspect ratio (recalculated for rotation=0°)
- All filter values → 0
- All individual `*Enabled` flags → true
- All preset flags (`blackWhiteEnabled`, `sepiaEnabled`, `monochromeEnabled`) → false
- `filtersEnabled` → true

Transforms and crop do not have individual reset buttons; they are only reset via "Reset All". Filter values have individual reset icons on their sliders.

### 19. Performance - Filter Debouncing

**Decision**: Debounce filter updates to prevent excessive re-rendering during slider drags.

**Implementation**:

- Slider value changes trigger immediate visual feedback on the slider itself
- Konva filter re-application is debounced by 16ms (approximately one frame at 60fps)
- The Image node's `cache()` call (which is expensive) only happens after debounce settles
- Crop rectangle manipulation does NOT require filter re-caching and updates immediately
- Use `requestAnimationFrame` for the actual cache/render call to ensure smooth frame timing

### 20. Export Logic in CanvasEditor

**Decision**: Update `CanvasEditor.tsx` export to use the shared rendering pipeline.

**Export Pipeline**:

1. For each slot with an assigned image:
   - Call `renderImage()` with the assignment's transform values (mirror, rotation, crop)
   - This produces a canvas with the geometric transforms applied
2. Create an offscreen Konva Stage at export resolution
3. Add the rendered canvas as a Konva.Image
4. Apply filters using the same `applyFilters()` utility used in preview
5. Call `cache()` to bake filters into the image
6. Draw the cached result to the export canvas at the slot position

**Export Function**:

```typescript
async function exportSlotImage(
  image: HTMLImageElement,
  assignment: ImageAssignment,
  outputWidth: number,
  outputHeight: number
): Promise<HTMLCanvasElement> {
  // 1. Apply geometric transforms
  const { canvas: transformedCanvas } = renderImage({
    image,
    rotation: assignment.rotation,
    cropX: assignment.cropX,
    cropY: assignment.cropY,
    cropWidth: assignment.cropWidth,
    cropHeight: assignment.cropHeight,
    mirrorX: assignment.mirrorX,
  });

  // 2. Apply filters via offscreen Konva
  const offscreenStage = new Konva.Stage({
    container: document.createElement("div"),
    width: outputWidth,
    height: outputHeight,
  });
  const layer = new Konva.Layer();
  const konvaImage = new Konva.Image({
    image: transformedCanvas,
    width: outputWidth,
    height: outputHeight,
  });

  // 3. Apply filters only if master toggle is enabled
  if (assignment.filtersEnabled) {
    applyFilters(konvaImage, assignment);
    konvaImage.cache();
  }

  layer.add(konvaImage);
  offscreenStage.add(layer);

  // 4. Export to canvas
  return offscreenStage.toCanvas({ pixelRatio: 1 });
}
```

**Resolution Handling**: Export uses the slot's actual pixel dimensions from the layout. The export multiplier (e.g., 2x for higher resolution output) is already handled by the existing export logic in `CanvasEditor.tsx` and is outside the scope of this sprint's changes.

## Files to Create

| File                                       | Purpose                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| `apps/web/lib/filters/blackWhite.ts`       | Black & White Konva filter                              |
| `apps/web/lib/filters/sepia.ts`            | Sepia Konva filter                                      |
| `apps/web/lib/renderImage.ts`              | Shared rotate-then-crop rendering utility               |
| `apps/web/lib/cropGeometry.ts`             | Crop constraint geometry calculations                   |
| `apps/web/components/AdjustmentSlider.tsx` | Shared slider component (extracted from ImageEditPanel) |
| `apps/web/hooks/useImageFilters.ts`        | Filter management hook                                  |
| `apps/web/hooks/useAdjustmentState.ts`     | Adjustment state management hook                        |
| `apps/web/lib/filters/applyFilters.ts`     | Shared filter application utility                       |

## Files to Modify

| File                                      | Changes                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/web/components/SlotEditorModal.tsx` | Major refactor: use Konva, add full controls, crop-centric interaction, checkerboard background, remove FilterPreset |
| `apps/web/components/ImageEditPanel.tsx`  | Extract `SliderControl` to shared `AdjustmentSlider`, update imports                                                 |
| `apps/web/components/ImageLayer.tsx`      | Refactor to use shared hooks/utilities, update to rotate-then-crop pipeline                                          |
| `apps/web/components/CanvasEditor.tsx`    | Update export logic for rotate-then-crop pipeline, add new filter support, update modal props                        |
| `apps/web/types/index.ts`                 | Remove `x`, `y`, `scaleX`, `scaleY`; add `blackWhiteEnabled`, `sepiaEnabled`, `monochromeEnabled`                    |

## Relevant Existing Files

- `apps/web/components/SlotEditorModal.tsx` - Current modal implementation (826 lines)
- `apps/web/components/ImageEditPanel.tsx` - Main editor panel with sliders, contains `SliderControl` component (564 lines)
- `apps/web/components/ImageLayer.tsx` - Image rendering with Konva filters (553 lines)
- `apps/web/components/CanvasEditor.tsx` - Canvas container, handles modal state (851 lines)
- `apps/web/lib/filters/monochrome.ts` - Reference implementation for custom Konva filter
- `apps/web/lib/filters/temperatureTint.ts` - Existing custom filter
- `apps/web/types/index.ts` - ImageAssignment type definition

## Type Updates

The `ImageAssignment` type in `apps/web/types/index.ts` needs these changes:

**Fields to REMOVE** (deprecated):

- `x`: number - Legacy position field, replaced by crop system
- `y`: number - Legacy position field, replaced by crop system
- `scaleX`: number - Legacy scale field, replaced by crop system
- `scaleY`: number - Legacy scale field, replaced by crop system

**Existing fields (verify present)**:

- `slotId`: string - Slot identifier
- `imageUrl`: string - Image source URL
- `originalWidth`, `originalHeight`: number (optional) - Original image dimensions
- `brightness`, `contrast`, `saturation`, `hue`, `temperature`, `tint`: number values
- `brightnessEnabled`, `contrastEnabled`, `saturationEnabled`, `hueEnabled`, `temperatureEnabled`, `tintEnabled`: boolean flags
- `mirrorX`: boolean
- `rotation`: number (degrees, -180 to 180)
- `monochromeColor`: string (hex color)
- `cropX`, `cropY`, `cropWidth`, `cropHeight`: percentage values (0-100) relative to rotated bounding box
- `filtersEnabled`: boolean (master toggle)

**New fields to add**:

- `blackWhiteEnabled`: boolean - When true, apply Black & White filter
- `sepiaEnabled`: boolean - When true, apply Sepia filter
- `monochromeEnabled`: boolean - When true, apply Monochrome filter using `monochromeColor`

**Default Values for New Fields**:

| Field               | Default Value | Rationale                                    |
| ------------------- | ------------- | -------------------------------------------- |
| `blackWhiteEnabled` | `false`       | No color preset active by default            |
| `sepiaEnabled`      | `false`       | No color preset active by default            |
| `monochromeEnabled` | `false`       | No color preset active by default            |
| `monochromeColor`   | `"#4A90D9"`   | Pleasant blue default when user activates it |

**Default Values for All Assignment Fields** (for reference):

| Field            | Default Value | Notes                                       |
| ---------------- | ------------- | ------------------------------------------- |
| `brightness`     | `0`           | No adjustment                               |
| `contrast`       | `0`           | No adjustment                               |
| `saturation`     | `0`           | No adjustment                               |
| `hue`            | `0`           | No adjustment                               |
| `temperature`    | `0`           | No adjustment                               |
| `tint`           | `0`           | No adjustment                               |
| `*Enabled` flags | `true`        | Individual filters enabled by default       |
| `filtersEnabled` | `true`        | Master filter toggle on by default          |
| `rotation`       | `0`           | No rotation                                 |
| `mirrorX`        | `false`       | No mirror                                   |
| `cropX`          | Calculated    | Set via `getMaxCropAtAspectRatio()` on init |
| `cropY`          | Calculated    | Set via `getMaxCropAtAspectRatio()` on init |
| `cropWidth`      | Calculated    | Set via `getMaxCropAtAspectRatio()` on init |
| `cropHeight`     | Calculated    | Set via `getMaxCropAtAspectRatio()` on init |

**Note on crop fields**: The coordinate system is changing. `cropX`, `cropY`, `cropWidth`, `cropHeight` will now be relative to the rotated bounding box, not the original image. All existing gallery images and assignments will be cleared at the end of this sprint.

## Error Handling

**Image Loading Failure**:

- If image fails to load in modal, display error state with "Failed to load image" message and Cancel button only
- Log error to console for debugging

**Extreme Aspect Ratios**:

- Slot aspect ratios are constrained by the template system and won't be extreme
- If somehow an extreme ratio is encountered, the crop geometry functions handle it gracefully

**No Valid Crop Area**:

- In the theoretical case where no valid crop exists (extreme rotation), fall back to `minimumCropAtCenter()` which always returns a valid small crop at the polygon centroid

## Post-Sprint Cleanup

After all implementation is complete and verified working:

1. **Clear database**: Delete all records from the `gallery_images` and `image_assignments` tables (or equivalent)
2. **Clear local storage**: Remove any cached assignment data from browser local storage
3. **Verify fresh start**: Confirm the application starts cleanly with no images or assignments

This cleanup ensures no legacy data with the old coordinate system remains in the system.
