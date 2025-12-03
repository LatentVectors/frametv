# Fix Slot Editor Aspect Ratio and Mirror Behavior

## Overview

This sprint fixes two issues in the slot editor:

1. **Aspect ratio distortion**: Images are being stretched/compressed in slots, and the crop rectangle warps during rotation
2. **Mirror axis**: Mirror currently flips through the image's axis (changing what's visible), should flip through the slot's axis (flipping the cropped output)

## Design Principle: WYSIWYG

**"What You See Is What You Get"** - The visual representation in the editor modal, main canvas preview, and exported JPEG must all show identical results. A user should be able to trust that what they see in any view is exactly what will appear in the final output.

This principle guides all implementation decisions:

- Mirror preview in modal = mirror in canvas = mirror in export
- Crop rectangle in modal = actual crop applied everywhere
- No hidden transformations or post-processing surprises

## Root Cause Analysis

### Aspect Ratio Distortion

The aspect ratio issues stem from coordinate system inconsistencies:

1. **SlotEditorModal displayCrop mismatch**: In `SlotEditorModal.tsx` (lines 228-236), the `displayCrop` calculation incorrectly uses `stageSize` dimensions as the reference frame:

   ```javascript
   const bbox = { width: stageSize.width, height: stageSize.height };
   return {
     x: (localState.cropX / 100) * bbox.width,
     ...
   };
   ```

   However, crop percentages are stored relative to the **rotated image's bounding box**, not the stage size. When the stage doesn't perfectly match the bounding box aspect ratio (due to container constraints), this causes distortion.

   **Note:** The `displayScale` calculation already exists (lines 211-215) and is correct. The fix is to wire it into `displayCrop` properly.

2. **Stage size doesn't preserve bounding box aspect ratio exactly**: The stage sizing logic (lines 183-208) scales to fit the container but may introduce floating-point imprecision or edge cases where the aspect ratio isn't perfectly preserved.

3. **ImageLayer potential stretch**: In `ImageLayer.tsx` (lines 173-179), the rendered image is set to fill the slot dimensions exactly. If the cropped image's native aspect ratio differs from the slot's aspect ratio (due to upstream calculation errors), the image will be stretched.

### Mirror Axis Issue

The current mirror implementation applies the flip to the source image before rotation and cropping:

```
1. Load image
2. Flip image horizontally around image's vertical center ← Mirror here
3. Rotate the flipped image
4. Crop from rotated result
5. Display in slot
```

This means when mirror is toggled, the user sees a completely different portion of the image (the crop region now selects from the flipped source). The expected behavior is that the same cropped content is displayed, but flipped horizontally.

**Current Implementation Mismatch:**

There is an inconsistency between how mirror is applied in different parts of the codebase:

- **SlotEditorModal** (line 795): Already uses `scaleX={localState.mirrorX ? -1 : 1}` as a visual flip
- **ImageLayer** and **Export**: Use `renderImage()` which applies mirror to the source data before rotation

These produce **different visual results** when the image is rotated AND mirrored. This sprint unifies the behavior by moving mirror to be a display-time transform everywhere.

## Solution Approach

**Keep percentage-based storage + Fix display pipeline + Slot-axis mirror**

This approach:

- **Preserves what's working**: The percentage-based storage model is mathematically sound and resolution-independent
- **Fixes the actual bugs**: The issues are in the display/transformation code, not the storage model
- **Simplifies the mirror operation**: Moving mirror to be applied last (slot-axis) is conceptually cleaner
- **Reduces complexity**: Removes mirror from the geometric transform pipeline entirely

### Rendering Pipeline (Corrected)

```
Source Image → Rotate → Crop (locked to slot AR) → Scale to slot → Mirror (if enabled)
```

Mirror is applied as a final display transform, not as part of the geometric pipeline.

## Technical Specification

### 1. Display Coordinate Pipeline (SlotEditorModal)

When displaying the crop rectangle in the modal editor, use this transformation sequence:

1. **Calculate bounding box** from original image dimensions and rotation:

   ```typescript
   const boundingBox = calculateBoundingBox(imageWidth, imageHeight, rotation);
   ```

2. **Calculate uniform display scale** to fit bounding box in stage:

   ```typescript
   const displayScale = Math.min(
     stageSize.width / boundingBox.width,
     stageSize.height / boundingBox.height
   );
   ```

3. **Convert percentage crop to bounding box pixels**:

   ```typescript
   const cropPixels = {
     x: (cropX / 100) * boundingBox.width,
     y: (cropY / 100) * boundingBox.height,
     width: (cropWidth / 100) * boundingBox.width,
     height: (cropHeight / 100) * boundingBox.height,
   };
   ```

4. **Scale to display coordinates** using uniform scale:
   ```typescript
   const displayCrop = {
     x: cropPixels.x * displayScale,
     y: cropPixels.y * displayScale,
     width: cropPixels.width * displayScale,
     height: cropPixels.height * displayScale,
   };
   ```

This ensures the crop rectangle maintains its correct aspect ratio regardless of container size.

### 2. Slot-Axis Mirror Implementation

**Current behavior (remove):**

- Mirror is applied in `renderImage.ts` before rotation
- Mirror flips source image around its own vertical center
- Crop region selects from flipped image → different content shown

**New behavior (implement):**

- Remove mirror from `renderImage.ts` geometric transform pipeline
- Apply mirror as final display transform via `scaleX: -1` on the rendered output
- Crop region always selects same content → same content shown, but flipped

**Changes:**

1. **renderImage.ts**: Remove `mirrorX` from the `renderImage()` function entirely. Remove from interface and implementation. It should only handle rotation and cropping.

2. **ImageLayer.tsx**: Apply mirror as a Konva transform with position adjustment:

   ```typescript
   <KonvaImage
     ...
     x={mirrorX ? previewSlotX + previewSlotWidth : previewSlotX}
     scaleX={mirrorX ? -1 : 1}
   />
   ```

   Also remove `mirrorX` from the `renderImage()` call since the parameter no longer exists.

3. **SlotEditorModal.tsx**: Already has `scaleX={localState.mirrorX ? -1 : 1}` (line 795). The current centering via `offsetX={(image.width * displayScale) / 2}` should work correctly with scaleX flip since Konva applies scale around the offset point. Verify this works during testing; adjust offset only if needed.

4. **CanvasEditor.tsx** (export): Apply mirror to the final rendered image in export, not to the source before processing. Also remove `mirrorX` from the `renderImageToSize()` call.

### 3. Drag Interaction Fixes

Update **all** drag handlers in `SlotEditorModal.tsx` to use the corrected coordinate transformation.

**Current broken code** (lines 299-300):

```typescript
const dx = ((x - cropDragStart.x) / stageSize.width) * 100;
const dy = ((y - cropDragStart.y) / stageSize.height) * 100;
```

**Fixed code:**

1. **Add a helper function** to avoid duplicating coordinate conversion logic:

   ```typescript
   /**
    * Convert a display coordinate delta to a percentage delta.
    * Used by all drag handlers to ensure consistent coordinate transformation.
    */
   const displayDeltaToPercentage = useCallback(
     (displayDeltaX: number, displayDeltaY: number) => {
       return {
         dx: (displayDeltaX / displayScale / boundingBox.width) * 100,
         dy: (displayDeltaY / displayScale / boundingBox.height) * 100,
       };
     },
     [displayScale, boundingBox]
   );
   ```

2. **Use the helper in all drag handlers**:

   ```typescript
   // In handleCropDragMove:
   const { dx, dy } = displayDeltaToPercentage(
     x - cropDragStart.x,
     y - cropDragStart.y
   );
   ```

3. **Apply same fix to ALL drag types**:

   - `move` - lines ~302-321
   - `nw` corner resize - lines ~323-340
   - `ne` corner resize - lines ~345-347
   - `sw` corner resize - lines ~348-350
   - `se` corner resize - lines ~336-339

   All paths that calculate `dx`/`dy` or convert display coordinates to percentages need updating.

## Files to Modify

| File                                      | Change Description                                                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/components/SlotEditorModal.tsx` | Add `boundingBox` useMemo; derive `displayScale` from it; fix `displayCrop` calculation; add `displayDeltaToPercentage` helper; update all drag handlers to use helper; verify mirror preview works via `scaleX` |
| `apps/web/components/ImageLayer.tsx`      | Remove `mirrorX` from `renderImage()` call; apply mirror via `scaleX` transform with position adjustment                                                                                                         |
| `apps/web/components/CanvasEditor.tsx`    | Remove `mirrorX` from `renderImageToSize()` call; apply mirror as final transform after creating konvaImage                                                                                                      |
| `apps/web/lib/renderImage.ts`             | Remove `mirrorX` from interface, destructuring, and implementation; update JSDoc to clarify pipeline                                                                                                             |

**No changes needed:**

- `apps/web/lib/cropGeometry.ts` - Already correct
- `apps/web/hooks/useAdjustmentState.ts` - Already correct
- `apps/web/types/index.ts` - Storage model unchanged

## Acceptance Criteria

All criteria support the WYSIWYG principle: what the user sees in any view is what they get in the final output.

1. **Slot Display**: When an image is assigned to a slot, the displayed image should fill the slot without visible stretching or compression. The image's aspect ratio should match the slot's aspect ratio exactly.

2. **Modal Crop Rectangle**: In the `SlotEditorModal`, the crop rectangle's aspect ratio must always equal the slot's aspect ratio (width/height). This must hold true at all rotation angles.

3. **Rotation Stability**: When rotating an image in the editor modal:

   - The crop rectangle's **aspect ratio** must remain constant (equal to slot AR)
   - The crop rectangle's **position and size** may change to stay within the rotated image polygon
   - The image behind the crop rectangle should not warp or change aspect ratio

4. **Mirror Behavior**: When toggling mirror:

   - The same cropped content should be displayed, but flipped horizontally
   - The crop region should NOT change
   - The left side of the cropped image appears on the right, and vice versa

5. **Round-Trip Consistency**: Saving and reopening the editor modal should display the crop rectangle in the same position and with the same aspect ratio.

6. **WYSIWYG Consistency**: The following three views must show identical visual results:

   - Editor modal preview (inside the crop rectangle)
   - Main canvas preview (in the slot)
   - Exported JPEG (at full resolution)

   This includes all transforms: rotation, crop position/size, mirror state, and filters.

## Migration

No migration needed. Any existing image assignments with the old behavior can be cleared from the database. There is no production data to preserve.

## Implementation Notes

### SlotEditorModal.tsx Key Changes

**Important:** Use the loaded `image` element's dimensions (`image.width`, `image.height`) as the source of truth, not the `imageDimensions` prop. The prop may be `{width: 0, height: 0}` if `originalWidth`/`originalHeight` are undefined in the assignment. The loaded image element always has valid dimensions.

1. **Add bounding box calculation** based on loaded image dimensions and rotation. Compute this **first**, then derive displayScale from it:

   ```typescript
   // Compute bounding box from loaded image dimensions (not props)
   const boundingBox = useMemo(() => {
     if (!image) return { width: 1, height: 1 }; // Fallback to avoid division by zero
     return calculateBoundingBox(
       image.width,
       image.height,
       localState.rotation
     );
   }, [image, localState.rotation]);
   ```

2. **Compute uniform displayScale** as the scale factor from bounding box to stage (derived from boundingBox). This replaces the existing displayScale calculation:

   ```typescript
   // Derive displayScale from boundingBox (replaces existing calculation)
   const displayScale = useMemo(
     () =>
       Math.min(
         stageSize.width / boundingBox.width,
         stageSize.height / boundingBox.height
       ),
     [stageSize, boundingBox]
   );
   ```

3. **Replace displayCrop calculation** to use bounding-box-relative coordinates:

   ```typescript
   const displayCrop = useMemo((): CropRect => {
     // Convert percentage to bounding box pixels first
     const cropPixels = {
       x: (localState.cropX / 100) * boundingBox.width,
       y: (localState.cropY / 100) * boundingBox.height,
       width: (localState.cropWidth / 100) * boundingBox.width,
       height: (localState.cropHeight / 100) * boundingBox.height,
     };
     // Then scale to display coordinates
     return {
       x: cropPixels.x * displayScale,
       y: cropPixels.y * displayScale,
       width: cropPixels.width * displayScale,
       height: cropPixels.height * displayScale,
     };
   }, [
     localState.cropX,
     localState.cropY,
     localState.cropWidth,
     localState.cropHeight,
     boundingBox,
     displayScale,
   ]);
   ```

4. **Add coordinate conversion helper** to avoid duplication in drag handlers:

   ```typescript
   /**
    * Convert a display coordinate delta to a percentage delta.
    * Used by all drag handlers to ensure consistent coordinate transformation.
    */
   const displayDeltaToPercentage = useCallback(
     (displayDeltaX: number, displayDeltaY: number) => {
       return {
         dx: (displayDeltaX / displayScale / boundingBox.width) * 100,
         dy: (displayDeltaY / displayScale / boundingBox.height) * 100,
       };
     },
     [displayScale, boundingBox]
   );
   ```

5. **Update drag handlers** to use the helper:

   ```typescript
   // In handleCropDragMove:
   const { dx, dy } = displayDeltaToPercentage(
     x - cropDragStart.x,
     y - cropDragStart.y
   );
   ```

6. **Mirror preview already exists** (line 795):

   The KonvaImage already has `scaleX={localState.mirrorX ? -1 : 1}`. The current centering logic uses:

   ```typescript
   x={stageSize.width / 2}
   offsetX={(image.width * displayScale) / 2}
   ```

   This centers the image and the scaleX flip should work correctly around that center point. **Verify this works during testing** - if the mirror preview looks wrong, adjust the x position or offset:

   ```typescript
   // Only if needed - test first:
   x={localState.mirrorX ? stageSize.width / 2 + (image.width * displayScale) / 2 : stageSize.width / 2}
   // OR adjust offsetX based on mirror state
   ```

### renderImage.ts Key Changes

1. **Remove mirror from geometric pipeline** - delete this block (lines 83-86):

   ```typescript
   // DELETE THIS BLOCK:
   if (mirrorX) {
     rotatedCtx.scale(-1, 1);
   }
   ```

2. **Remove `mirrorX` from RenderImageParams interface entirely** (cleaner than leaving dead code):

   ```typescript
   export interface RenderImageParams {
     /** The source image element */
     image: HTMLImageElement;
     /** Rotation angle in degrees (-180 to 180) */
     rotation: number;
     /** Crop X position as percentage (0-100) of rotated bounding box */
     cropX: number;
     /** Crop Y position as percentage (0-100) of rotated bounding box */
     cropY: number;
     /** Crop width as percentage (0-100) of rotated bounding box */
     cropWidth: number;
     /** Crop height as percentage (0-100) of rotated bounding box */
     cropHeight: number;
     // mirrorX removed - mirror is now applied at display time via scaleX
   }
   ```

3. **Update JSDoc header** to clarify the rendering pipeline:

   ```typescript
   /**
    * Shared Image Rendering Utility
    *
    * This utility encapsulates the rotate-then-crop rendering pipeline.
    *
    * Rendering Pipeline:
    * 1. Load original image
    * 2. Rotate image by specified angle (rotation applied around image center)
    * 3. Apply crop to the rotated result
    *
    * Note: Mirror (horizontal flip) is NOT handled here. It is applied as a
    * display-time transform via scaleX=-1 in Konva components.
    *
    * Filters are applied separately via Konva after this utility renders
    * the geometric transforms.
    */
   ```

4. **Remove `mirrorX` from function destructuring** (line 61):

   ```typescript
   // Change from:
   const { image, rotation, cropX, cropY, cropWidth, cropHeight, mirrorX } =
     params;
   // To:
   const { image, rotation, cropX, cropY, cropWidth, cropHeight } = params;
   ```

### ImageLayer.tsx Key Changes

1. **Remove mirrorX from renderImage call** (lines 92-100):

   ```typescript
   // Change from:
   const result: RenderResult = renderImage({
     image: originalImage,
     rotation,
     cropX,
     cropY,
     cropWidth,
     cropHeight,
     mirrorX, // REMOVE THIS LINE
   });

   // To:
   const result: RenderResult = renderImage({
     image: originalImage,
     rotation,
     cropX,
     cropY,
     cropWidth,
     cropHeight,
   });
   ```

2. **Apply mirror as display transform** on the KonvaImage (lines 173-186):

   ```typescript
   const mirrorX = useMemo(
     () => assignment.mirrorX ?? false,
     [assignment.mirrorX]
   );

   // Update the render:
   <KonvaImage
     ref={imageRef}
     image={renderedImage}
     x={mirrorX ? previewSlotX + previewSlotWidth : previewSlotX}
     y={previewSlotY}
     width={previewSlotWidth}
     height={previewSlotHeight}
     scaleX={mirrorX ? -1 : 1}
     onClick={handleImageClick}
     onTap={handleImageClick}
     onDblClick={handleImageDblClick}
     onDblTap={handleImageDblClick}
     onMouseEnter={onMouseEnter}
     onMouseLeave={onMouseLeave}
   />;
   ```

3. **Remove mirrorX from useEffect dependency** (line 103) since it's no longer used for rendering.

### CanvasEditor.tsx Key Changes (Export)

1. **Remove mirrorX from renderImageToSize call** (lines 468-480):

   ```typescript
   // Change from:
   const { canvas: transformedCanvas } = renderImageToSize(
     {
       image,
       rotation: assignment.rotation ?? 0,
       cropX: assignment.cropX ?? 0,
       cropY: assignment.cropY ?? 0,
       cropWidth: assignment.cropWidth ?? 100,
       cropHeight: assignment.cropHeight ?? 100,
       mirrorX: assignment.mirrorX ?? false, // REMOVE THIS LINE
     },
     Math.round(slotWidth),
     Math.round(slotHeight)
   );

   // To:
   const { canvas: transformedCanvas } = renderImageToSize(
     {
       image,
       rotation: assignment.rotation ?? 0,
       cropX: assignment.cropX ?? 0,
       cropY: assignment.cropY ?? 0,
       cropWidth: assignment.cropWidth ?? 100,
       cropHeight: assignment.cropHeight ?? 100,
     },
     Math.round(slotWidth),
     Math.round(slotHeight)
   );
   ```

2. **Apply mirror after creating konvaImage** (after line 497):

   ```typescript
   // Create image node from the pre-transformed canvas
   const konvaImage = new Konva.Image({
     image: transformedCanvas,
     x: slotX,
     y: slotY,
     width: slotWidth,
     height: slotHeight,
   });

   // Apply mirror as display transform
   if (assignment.mirrorX) {
     konvaImage.scaleX(-1);
     konvaImage.x(slotX + slotWidth); // Adjust position for flip
   }
   ```

## Rationale

- **Percentage storage retained**: Resolution-independent, mathematically sound, minimal changes to storage model
- **Slot-axis mirror**: More intuitive behavior - users expect to see the same content flipped, not different content
- **Display pipeline fix**: Root cause was coordinate system mismatch, not storage model issues
- **Separation of concerns**: Geometric transforms (rotate, crop) are separate from display transforms (mirror, scale to slot)

## Recommended Implementation Order

Implement in this order to minimize broken states during development:

1. **Start with `renderImage.ts`**

   - Remove `mirrorX` from the `RenderImageParams` interface
   - Remove `mirrorX` from function destructuring
   - Remove the `if (mirrorX) { ... }` block
   - Update JSDoc

2. **Update callers to not pass `mirrorX`**

   - `ImageLayer.tsx` - remove `mirrorX` from renderImage call
   - `CanvasEditor.tsx` - remove `mirrorX` from renderImageToSize call

   At this point, mirror will be broken (nothing applies it), but there are no TypeScript errors.

3. **Add scaleX mirror to `ImageLayer.tsx`**

   - Add `mirrorX` extraction from assignment
   - Add `scaleX={mirrorX ? -1 : 1}` to KonvaImage
   - Add x position adjustment: `x={mirrorX ? previewSlotX + previewSlotWidth : previewSlotX}`

   Now the main canvas preview shows mirror correctly.

4. **Add scaleX mirror to `CanvasEditor.tsx` export**

   - After creating konvaImage, check `assignment.mirrorX`
   - Apply `scaleX(-1)` and adjust x position

   Now export matches preview.

5. **Fix `SlotEditorModal.tsx` coordinate calculations**

   - Add `boundingBox` useMemo (computed first, using loaded image dimensions)
   - Update `displayScale` to derive from `boundingBox`
   - Update `displayCrop` to use `boundingBox → displayScale` pipeline
   - Add `displayDeltaToPercentage` helper function

6. **Fix `SlotEditorModal.tsx` drag handlers**

   - Update `handleCropDragMove` to use `displayDeltaToPercentage` helper
   - Update all resize corner handlers (nw, ne, sw, se) to use the helper

7. **Test the modal mirror preview**
   - The existing `scaleX={localState.mirrorX ? -1 : 1}` should work
   - If it doesn't flip correctly around center, adjust offset/x

## Manual QA Testing Checklist

All testing will be performed manually by a QA tester at the end of the sprint. No automated unit or integration tests will be written for this sprint.

### Core Functionality

- [ ] Assign image to slot - no stretching visible
- [ ] Open editor modal - crop rectangle has correct aspect ratio
- [ ] Rotate image in modal - crop rectangle maintains aspect ratio, image doesn't warp
- [ ] Toggle mirror in modal - image flips, crop rectangle stays in same position
- [ ] Save and reopen modal - crop rectangle in same position
- [ ] Export canvas - matches preview exactly (including mirror state)

### Rotation Edge Cases

- [ ] Test at 0° rotation (bounding box equals image dimensions)
- [ ] Test at 45° rotation (maximum bounding box expansion)
- [ ] Test at 90° rotation (swapped aspect ratio)
- [ ] Test at 180° rotation (same bounding box as 0°)

### Mirror + Rotation Combinations

- [ ] Mirror only (no rotation) - content flips horizontally
- [ ] Mirror + 45° rotation - verify consistent behavior across views
- [ ] Mirror + 90° rotation - verify left/right flip is correct
- [ ] Toggle mirror on/off at various rotations - crop rectangle should NOT move

### Crop Interaction

- [ ] Drag crop rectangle (move) at 0° rotation
- [ ] Drag crop rectangle (move) at 45° rotation
- [ ] Resize from each corner (nw, ne, sw, se) at 0° rotation
- [ ] Resize from each corner at 45° rotation - aspect ratio maintained
- [ ] Resize to minimum size (5%) - should not go smaller
- [ ] Resize to maximum size - should stay within image polygon

### Image Variations

- [ ] Landscape image in landscape slot
- [ ] Portrait image in landscape slot
- [ ] Landscape image in portrait slot
- [ ] Very wide panoramic image
- [ ] Very tall image

### WYSIWYG Verification

- [ ] Verify modal preview matches main canvas preview
- [ ] Verify main canvas preview matches exported JPEG
- [ ] Verify all three views match with mirror enabled
- [ ] Verify all three views match with rotation + mirror
