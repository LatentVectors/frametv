# Spec Tasks

Tasks for implementing the Slot Editor Aspect Ratio and Mirror Behavior fixes as specified in `spec_02.md`.
Tasks 1-2: Remove mirror from geometric pipeline → callers get TypeScript errors → fix callers
Tasks 3-4: Add mirror as display transform → mirror works again in preview and export
Tasks 5-6: Fix coordinate calculations → aspect ratio distortion fixed
Task 7: Verify modal preview → WYSIWYG verified

## Tasks

- [x] 1. Remove `mirrorX` from geometric transform pipeline in `renderImage.ts`

  - [x] 1.1 Remove `mirrorX` from the `RenderImageParams` interface (delete the property and its JSDoc comment)
  - [x] 1.2 Remove `mirrorX` from the destructuring in `renderImage()` function (line 61)
  - [x] 1.3 Delete the mirror block: `if (mirrorX) { rotatedCtx.scale(-1, 1); }` (lines 83-86)
  - [x] 1.4 Update the file's JSDoc header comment to clarify that mirror is NOT handled here and is applied at display time via `scaleX=-1`
  - [x] 1.5 Update `RenderResult` interface JSDoc to remove "mirrored" from the description

- [x] 2. Update callers to remove `mirrorX` parameter from render calls

  - [x] 2.1 In `ImageLayer.tsx`: Remove `mirrorX` from the `renderImage()` call (lines 92-100)
  - [x] 2.2 In `ImageLayer.tsx`: Remove `mirrorX` from the useEffect dependency array (line 103)
  - [x] 2.3 In `CanvasEditor.tsx`: Remove `mirrorX: assignment.mirrorX ?? false` from the `renderImageToSize()` call (lines 468-480)

- [x] 3. Add scaleX mirror transform to `ImageLayer.tsx`

  - [x] 3.1 The existing `mirrorX` useMemo can remain (line 82) - it's already extracting from assignment
  - [x] 3.2 Update the `KonvaImage` component to add `scaleX={mirrorX ? -1 : 1}` prop
  - [x] 3.3 Update the `KonvaImage` x prop to: `x={mirrorX ? previewSlotX + previewSlotWidth : previewSlotX}`
  - [x] 3.4 Verify the component still renders correctly with the Group clipping

- [x] 4. Add scaleX mirror transform to `CanvasEditor.tsx` export function

  - [x] 4.1 After creating the `konvaImage` (around line 497), add a conditional block to apply mirror
  - [x] 4.2 When `assignment.mirrorX` is true: call `konvaImage.scaleX(-1)`
  - [x] 4.3 When `assignment.mirrorX` is true: call `konvaImage.x(slotX + slotWidth)` to adjust position for flip

- [x] 5. Fix coordinate calculations in `SlotEditorModal.tsx`

  - [x] 5.1 Add `boundingBox` useMemo that computes from loaded `image` dimensions (not `imageDimensions` prop), with fallback `{ width: 1, height: 1 }` when image is null
  - [x] 5.2 Update `displayScale` useMemo to derive from `boundingBox` instead of recalculating bounding box internally
  - [x] 5.3 Replace the `displayCrop` useMemo to use the correct pipeline: percentage → bounding box pixels → display coordinates (multiply by `displayScale`)
  - [x] 5.4 Add `displayDeltaToPercentage` helper function using `useCallback` that converts display deltas to percentage deltas via `boundingBox` and `displayScale`

- [x] 6. Fix drag handlers in `SlotEditorModal.tsx`

  - [x] 6.1 In `handleCropDragMove`: Replace the dx/dy calculation (lines 299-300) to use `displayDeltaToPercentage` helper
  - [x] 6.2 In the `move` drag type handler: Verify the new dx/dy values work correctly with existing logic
  - [x] 6.3 In the resize handlers (nw, ne, sw, se): Update `draggedX` and `draggedY` calculations to use the helper for delta conversion
  - [x] 6.4 Remove any remaining references to `stageSize.width` or `stageSize.height` in percentage conversion calculations
  - [x] 6.5 Test that crop rectangle movement and resizing work correctly at various rotation angles

- [ ] 7. Verify mirror preview in `SlotEditorModal.tsx`
  - [ ] 7.1 Confirm the existing `scaleX={localState.mirrorX ? -1 : 1}` on the KonvaImage (line 795) works correctly with the centered positioning
  - [ ] 7.2 If mirror preview doesn't flip correctly around center, adjust the `x` position or `offsetX` based on mirror state
  - [ ] 7.3 Verify the crop rectangle overlay displays correctly when mirror is toggled (it should NOT move or change)
