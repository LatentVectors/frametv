'use client';

import { Group, Image as KonvaImage, Rect } from 'react-konva';
import { ImageAssignment, Slot as SlotType } from '@/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PREVIEW_MAX_IMAGE_WIDTH, PREVIEW_MAX_IMAGE_HEIGHT } from '@/lib/config';
import { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { createPreviewImage } from '@/lib/imageUtils';

interface ImageLayerProps {
  assignment: ImageAssignment;
  slot: SlotType;
  scaleX: number;
  scaleY: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onTransformUpdate?: (x: number, y: number) => void;
  onScaleUpdate?: (scaleX: number, scaleY: number) => void;
}

function ImageLayer({
  assignment,
  slot,
  scaleX,
  scaleY,
  isSelected = false,
  onSelect,
  onTransformUpdate,
  onScaleUpdate,
}: ImageLayerProps) {
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);

  // Load preview image (lower resolution for performance)
  useEffect(() => {
    let cancelled = false;
    
    createPreviewImage(
      assignment.imageUrl,
      PREVIEW_MAX_IMAGE_WIDTH,
      PREVIEW_MAX_IMAGE_HEIGHT
    )
      .then((img) => {
        if (!cancelled) {
          setPreviewImage(img);
        }
      })
      .catch(() => {
        // Silently handle preview image creation errors
        // Fallback to loading original image if preview fails
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (!cancelled) {
            setPreviewImage(img);
          }
        };
        img.src = assignment.imageUrl;
      });

    return () => {
      cancelled = true;
    };
  }, [assignment.imageUrl]);

  // Convert slot percentage coordinates to canvas pixel coordinates
  const slotX = useMemo(() => (slot.x / 100) * CANVAS_WIDTH, [slot.x]);
  const slotY = useMemo(() => (slot.y / 100) * CANVAS_HEIGHT, [slot.y]);
  const slotWidth = useMemo(() => (slot.width / 100) * CANVAS_WIDTH, [slot.width]);
  const slotHeight = useMemo(() => (slot.height / 100) * CANVAS_HEIGHT, [slot.height]);

  // Calculate image dimensions in canvas space
  // Scale factors are relative to original image dimensions
  // We need to adjust for preview image if dimensions differ
  const originalWidth = useMemo(() => assignment.originalWidth ?? (previewImage?.width ?? 0), [assignment.originalWidth, previewImage?.width]);
  const originalHeight = useMemo(() => assignment.originalHeight ?? (previewImage?.height ?? 0), [assignment.originalHeight, previewImage?.height]);
  
  // Calculate effective scale factors for preview image
  // The assignment scales are relative to original dimensions
  // Convert to preview image scale: scale_preview = (originalWidth * scale) / previewWidth
  const previewScaleX = useMemo(() => {
    if (!previewImage) return 0;
    return (originalWidth * assignment.scaleX) / previewImage.width;
  }, [originalWidth, assignment.scaleX, previewImage]);
  const previewScaleY = useMemo(() => {
    if (!previewImage) return 0;
    return (originalHeight * assignment.scaleY) / previewImage.height;
  }, [originalHeight, assignment.scaleY, previewImage]);
  
  // Calculate image dimensions using preview image and adjusted scales
  const imageWidth = useMemo(() => (previewImage?.width ?? 0) * previewScaleX, [previewImage?.width, previewScaleX]);
  const imageHeight = useMemo(() => (previewImage?.height ?? 0) * previewScaleY, [previewImage?.height, previewScaleY]);

  // Calculate image position and scale
  // Transform coordinates are relative to the slot
  const imageX = useMemo(() => slotX + assignment.x, [slotX, assignment.x]);
  const imageY = useMemo(() => slotY + assignment.y, [slotY, assignment.y]);

  // Convert to preview coordinates
  const previewX = useMemo(() => imageX * scaleX, [imageX, scaleX]);
  const previewY = useMemo(() => imageY * scaleY, [imageY, scaleY]);
  const previewWidth = useMemo(() => imageWidth * scaleX, [imageWidth, scaleX]);
  const previewHeight = useMemo(() => imageHeight * scaleY, [imageHeight, scaleY]);
  const previewSlotX = useMemo(() => slotX * scaleX, [slotX, scaleX]);
  const previewSlotY = useMemo(() => slotY * scaleY, [slotY, scaleY]);
  const previewSlotWidth = useMemo(() => slotWidth * scaleX, [slotWidth, scaleX]);
  const previewSlotHeight = useMemo(() => slotHeight * scaleY, [slotHeight, scaleY]);

  /**
   * Handle drag move event - constrain image within slot boundaries
   * Constrain Konva position directly during drag for smooth performance
   */
  const handleDragMove = useCallback((e: any) => {
    // Get new position in preview coordinates
    const newPreviewX = e.target.x();
    const newPreviewY = e.target.y();

    // Convert preview coordinates to canvas coordinates
    const newCanvasX = newPreviewX / scaleX;
    const newCanvasY = newPreviewY / scaleY;

    // Convert to slot-relative coordinates
    let newX = newCanvasX - slotX;
    let newY = newCanvasY - slotY;

    // Constrain image within slot boundaries
    // Image can move within slot, but edges must not exceed slot boundaries
    // If image is larger than slot, allow negative x/y to enable panning
    const minX = Math.min(0, slotWidth - imageWidth);
    const maxX = Math.max(0, slotWidth - imageWidth);
    const minY = Math.min(0, slotHeight - imageHeight);
    const maxY = Math.max(0, slotHeight - imageHeight);

    // Clamp values to keep image within slot
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    // Update Konva position directly to constrain during drag
    // This provides immediate visual feedback without triggering re-renders
    const constrainedPreviewX = (slotX + newX) * scaleX;
    const constrainedPreviewY = (slotY + newY) * scaleY;
    e.target.x(constrainedPreviewX);
    e.target.y(constrainedPreviewY);
  }, [slotX, slotY, slotWidth, slotHeight, imageWidth, imageHeight, scaleX, scaleY]);

  /**
   * Handle drag end event - ensure final position is constrained
   */
  const handleDragEnd = useCallback((e: any) => {
    if (!onTransformUpdate) return;

    // Get final position in preview coordinates
    const finalPreviewX = e.target.x();
    const finalPreviewY = e.target.y();

    // Convert preview coordinates to canvas coordinates
    const finalCanvasX = finalPreviewX / scaleX;
    const finalCanvasY = finalPreviewY / scaleY;

    // Convert to slot-relative coordinates
    let finalX = finalCanvasX - slotX;
    let finalY = finalCanvasY - slotY;

    // Constrain image within slot boundaries
    // Image can move within slot, but edges must not exceed slot boundaries
    // If image is larger than slot, allow negative x/y to enable panning
    const minX = Math.min(0, slotWidth - imageWidth);
    const maxX = Math.max(0, slotWidth - imageWidth);
    const minY = Math.min(0, slotHeight - imageHeight);
    const maxY = Math.max(0, slotHeight - imageHeight);

    // Clamp values to keep image within slot
    finalX = Math.max(minX, Math.min(maxX, finalX));
    finalY = Math.max(minY, Math.min(maxY, finalY));

    // Update transform state with final constrained position
    onTransformUpdate(finalX, finalY);

    // Reset Konva position to match constrained values
    // This ensures visual consistency
    const constrainedPreviewX = (slotX + finalX) * scaleX;
    const constrainedPreviewY = (slotY + finalY) * scaleY;
    e.target.x(constrainedPreviewX);
    e.target.y(constrainedPreviewY);
  }, [slotX, slotY, slotWidth, slotHeight, imageWidth, imageHeight, scaleX, scaleY, onTransformUpdate]);

  /**
   * Handle image click - select this image
   */
  const handleImageClick = useCallback((e: any) => {
    e.cancelBubble = true; // Prevent stage click from firing
    if (onSelect) {
      onSelect();
    }
  }, [onSelect]);

  if (!previewImage) {
    return null;
  }

  return (
    <Group
      clipX={previewSlotX}
      clipY={previewSlotY}
      clipWidth={previewSlotWidth}
      clipHeight={previewSlotHeight}
    >
      <KonvaImage
        image={previewImage}
        x={previewX}
        y={previewY}
        width={previewWidth}
        height={previewHeight}
        draggable={true}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleImageClick}
        onTap={handleImageClick}
      />
      {/* Selection border */}
      {isSelected && (
        <Rect
          x={previewX}
          y={previewY}
          width={previewWidth}
          height={previewHeight}
          stroke="#3b82f6"
          strokeWidth={2}
          fill="transparent"
          listening={false}
        />
      )}
      {/* Selection handles */}
      {isSelected && (
        <SelectionHandles
          imageX={previewX}
          imageY={previewY}
          imageWidth={previewWidth}
          imageHeight={previewHeight}
          slotX={previewSlotX}
          slotY={previewSlotY}
          slotWidth={previewSlotWidth}
          slotHeight={previewSlotHeight}
          originalImageWidth={originalWidth}
          originalImageHeight={originalHeight}
          currentScaleX={assignment.scaleX}
          currentScaleY={assignment.scaleY}
          currentX={assignment.x}
          currentY={assignment.y}
          canvasScaleX={scaleX}
          canvasScaleY={scaleY}
          slotCanvasX={slotX}
          slotCanvasY={slotY}
          slotCanvasWidth={slotWidth}
          slotCanvasHeight={slotHeight}
          onScaleUpdate={onScaleUpdate}
          onTransformUpdate={onTransformUpdate}
        />
      )}
    </Group>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(ImageLayer);

