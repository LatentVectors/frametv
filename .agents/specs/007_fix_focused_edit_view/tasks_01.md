# Spec Tasks

## Task Order

**Start together (no dependencies):** 1, 2, 7
**Then:** 3 (needs 2), 4 (needs 1), 6 (needs 2)
**Then:** 5 (needs 4), 8 (needs 3, 5), 9 (needs 3, 4)
**Then:** 10 (needs 9), 12 (needs 3, 4)
**Then:** 11 (needs 6, 7, 10)
**Finally:** 13 (needs all)

---

## Tasks

- [x] 1. Update Types and Create New Filter Implementations

  - [x] 1.1 Update `ImageAssignment` type in `apps/web/types/index.ts`: remove `x`, `y`, `scaleX`, `scaleY` fields
  - [x] 1.2 Add new fields to `ImageAssignment`: `blackWhiteEnabled`, `sepiaEnabled`, `monochromeEnabled` (all boolean, default false)
  - [x] 1.3 Create `apps/web/lib/filters/blackWhite.ts` - Konva filter using luminance formula `(0.299*R + 0.587*G + 0.114*B)`
  - [x] 1.4 Create `apps/web/lib/filters/sepia.ts` - Konva filter using standard sepia matrix transformation
  - [x] 1.5 Register both filters with Konva (follow pattern from `monochrome.ts`)

- [x] 2. Create Crop Geometry Utilities

  - [x] 2.1 Create `apps/web/lib/cropGeometry.ts` with `calculateBoundingBox(width, height, rotation)` function
  - [x] 2.2 Implement `getRotatedImagePolygon(width, height, rotation)` - returns 4 corner coordinates in bounding box space
  - [x] 2.3 Implement `isPointInPolygon(point, polygon)` using ray casting algorithm
  - [x] 2.4 Implement `isValidCropPosition(cropRect, polygon)` - checks all 4 corners are inside
  - [x] 2.5 Implement `constrainCropToValidArea(cropRect, polygon, aspectRatio)` with binary search
  - [x] 2.6 Implement `getMaxCropAtAspectRatio(polygon, aspectRatio)` - returns maximum valid crop dimensions and position
  - [x] 2.7 Implement `minimumCropAtCenter(polygon, aspectRatio)` fallback function

- [x] 3. Create Shared Rendering Utility

  - [x] 3.1 Create `apps/web/lib/renderImage.ts` with `RenderImageParams` and `RenderResult` interfaces
  - [x] 3.2 Implement `renderImage()` function: mirror → rotate → crop pipeline
  - [x] 3.3 Handle bounding box calculation for rotated images
  - [x] 3.4 Implement crop extraction from rotated canvas using percentage coordinates
  - [x] 3.5 Return canvas with geometric transforms applied (no filters)

- [x] 4. Create Shared Filter Application Utility

  - [x] 4.1 Create `apps/web/lib/filters/applyFilters.ts` with function signature
  - [x] 4.2 Implement filter chain order: Brightness → Contrast → HSL → Temperature/Tint → Color preset
  - [x] 4.3 Handle `filtersEnabled` master toggle (skip all filters when false)
  - [x] 4.4 Handle individual `*Enabled` flags for each filter
  - [x] 4.5 Handle mutually exclusive presets (B&W, Sepia, Monochrome)
  - [x] 4.6 Apply filter attributes to Konva.Image node and return filter array

- [x] 5. Create useImageFilters Hook

  - [x] 5.1 Create `apps/web/hooks/useImageFilters.ts`
  - [x] 5.2 Accept assignment values as input
  - [x] 5.3 Return array of Konva filters in correct order based on enabled states
  - [x] 5.4 Return function to apply filter attributes to a Konva.Image node
  - [x] 5.5 Memoize filter array to prevent unnecessary re-renders

- [x] 6. Create useAdjustmentState Hook

  - [x] 6.1 Create `apps/web/hooks/useAdjustmentState.ts` with signature accepting `initialAssignment`, `imageDimensions`, `slotAspectRatio`
  - [x] 6.2 Initialize state from assignment with all filter values, enabled flags, presets, transforms, and crop
  - [x] 6.3 Implement `updateValue(field, value)` for single field updates
  - [x] 6.4 Implement `toggleEnabled(field)` for individual filter toggles
  - [x] 6.5 Implement `togglePreset(preset)` with mutual exclusivity logic
  - [x] 6.6 Implement `resetField(field)` and `resetAll()` using `getMaxCropAtAspectRatio` for crop reset
  - [x] 6.7 Implement `getAssignment()` to return complete ImageAssignment for saving

- [x] 7. Extract AdjustmentSlider Component

  - [x] 7.1 Create `apps/web/components/AdjustmentSlider.tsx` with props interface from spec
  - [x] 7.2 Implement slider with icon, numeric input, eye icon toggle, and reset button
  - [x] 7.3 Add disabled state with tooltip support for preset override scenarios
  - [x] 7.4 Update `apps/web/components/ImageEditPanel.tsx` to import and use `AdjustmentSlider`
  - [x] 7.5 Verify ImageEditPanel functionality unchanged after extraction

- [x] 8. Refactor ImageLayer to Use New Pipeline

  - [x] 8.1 Update `apps/web/components/ImageLayer.tsx` to use `renderImage()` for geometric transforms
  - [x] 8.2 Replace inline filter logic with `useImageFilters` hook
  - [x] 8.3 Update to use new crop coordinate system (relative to rotated bounding box)
  - [x] 8.4 Add support for `blackWhiteEnabled`, `sepiaEnabled`, `monochromeEnabled` filters
  - [x] 8.5 Verify rendering matches expected output with all filter combinations

- [x] 9. SlotEditorModal - Konva Stage Structure

  - [x] 9.1 Replace raw canvas with Konva `Stage`/`Layer` structure in `SlotEditorModal.tsx`
  - [x] 9.2 Create Background layer with checkerboard pattern (10×10 px, colors `#e0e0e0`/`#ffffff`)
  - [x] 9.3 Create Image layer using `renderImage()` output with filters applied and cached
  - [x] 9.4 Create Overlay layer with custom Shape for dark overlay with crop cutout
  - [x] 9.5 Create Crop UI layer with crop border rect and 4 corner handles
  - [x] 9.6 Update modal props interface: add `imageDimensions`, change `onUpdate` to `onSave`, `onClose` to `onCancel`

- [x] 10. SlotEditorModal - Crop Interaction

  - [x] 10.1 Implement crop rectangle drag-to-move with constraint to valid polygon area
  - [x] 10.2 Implement corner handle resize with opposite corner anchored and aspect ratio locked
  - [x] 10.3 Integrate `constrainCropToValidArea()` for move operations
  - [x] 10.4 Integrate `isValidCropPosition()` validation during resize
  - [x] 10.5 Implement rotation change behavior: auto-shrink crop when it becomes invalid
  - [x] 10.6 Remove mouse wheel zoom and drag-to-pan for the view (crop-centric model only)

- [x] 11. SlotEditorModal - Controls and UI

  - [x] 11.1 Integrate `useAdjustmentState` hook for local state management
  - [x] 11.2 Replace inline slider controls with `AdjustmentSlider` components
  - [x] 11.3 Add eye icon toggles and reset buttons to all filter sliders
  - [x] 11.4 Implement preset buttons (B&W, Sepia, Monochrome) with mutual exclusivity
  - [x] 11.5 Disable saturation/hue/temperature/tint sliders when color preset active (with tooltip)
  - [x] 11.6 Move Cancel button to right side next to Save button
  - [x] 11.7 Remove `FilterPreset` type, use boolean flags instead
  - [x] 11.8 Implement debounced filter updates (16ms) with `requestAnimationFrame`

- [x] 12. Update CanvasEditor Export Logic

  - [x] 12.1 Update `apps/web/components/CanvasEditor.tsx` to use `renderImage()` for geometric transforms
  - [x] 12.2 Use `applyFilters()` utility for filter application in export
  - [x] 12.3 Update modal invocation to pass new props (`imageDimensions`, `onSave`, `onCancel`)
  - [x] 12.4 Handle save callback to persist complete `ImageAssignment`
  - [x] 12.5 Update initial crop calculation for newly assigned images using `getMaxCropAtAspectRatio()`

- [ ] 13. Post-Sprint Cleanup and Verification
  - [ ] 13.1 Clear all records from gallery_images and image_assignments tables in database
  - [ ] 13.2 Clear any cached assignment data from browser local storage
  - [ ] 13.3 Verify application starts cleanly with no images or assignments
  - [ ] 13.4 Test complete flow: assign image → edit in modal → save → verify in main editor → export
  - [ ] 13.5 Verify all filter combinations work correctly (B&W, Sepia, Monochrome with other adjustments)
  - [ ] 13.6 Verify crop behavior with rotation: crop auto-shrinks when rotation makes it invalid
