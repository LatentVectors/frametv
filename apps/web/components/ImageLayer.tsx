'use client';

import { Group, Image as KonvaImage } from 'react-konva';
import { ImageAssignment, Slot as SlotType } from '@/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/config';
import { useEffect, useState, memo, useMemo, useCallback, useRef } from 'react';
import { renderImage, RenderResult } from '@/lib/renderImage';
import { useImageFilters, hasActiveFilters } from '@/hooks/useImageFilters';
import Konva from 'konva';

interface ImageLayerProps {
  assignment: ImageAssignment;
  slot: SlotType;
  scaleX: number;
  scaleY: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onDoubleClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * ImageLayer component renders an image within a slot using the new
 * rotate-then-crop pipeline.
 *
 * Rendering Pipeline:
 * 1. Load original image
 * 2. Apply geometric transforms via renderImage() (mirror → rotate → crop)
 * 3. Display transformed canvas in Konva.Image filling the slot
 * 4. Apply filters via useImageFilters hook
 *
 * The crop coordinates (cropX, cropY, cropWidth, cropHeight) are relative to
 * the rotated image's bounding box, not the original image.
 */
function ImageLayer({
  assignment,
  slot,
  scaleX,
  scaleY,
  isSelected = false,
  onSelect,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
}: ImageLayerProps) {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [renderedImage, setRenderedImage] = useState<HTMLCanvasElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);

  // Get filters from the useImageFilters hook
  const { filters, applyAttributes } = useImageFilters(assignment);

  // Load original image
  useEffect(() => {
    let cancelled = false;
    
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (!cancelled) {
        setOriginalImage(img);
          }
        };
    img.onerror = () => {
      // Silently handle image load errors
      console.error('Failed to load image:', assignment.imageUrl);
    };
        img.src = assignment.imageUrl;

    return () => {
      cancelled = true;
    };
  }, [assignment.imageUrl]);

  // Get crop values with defaults
  const cropX = useMemo(() => assignment.cropX ?? 0, [assignment.cropX]);
  const cropY = useMemo(() => assignment.cropY ?? 0, [assignment.cropY]);
  const cropWidth = useMemo(() => assignment.cropWidth ?? 100, [assignment.cropWidth]);
  const cropHeight = useMemo(() => assignment.cropHeight ?? 100, [assignment.cropHeight]);
  const rotation = useMemo(() => assignment.rotation ?? 0, [assignment.rotation]);
  const mirrorX = useMemo(() => assignment.mirrorX ?? false, [assignment.mirrorX]);

  // Render the image with geometric transforms when dependencies change
  useEffect(() => {
    if (!originalImage) {
      setRenderedImage(null);
      return;
    }

    // Use renderImage utility to apply rotate → crop
    const result: RenderResult = renderImage({
      image: originalImage,
      rotation,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
    });

    setRenderedImage(result.canvas);
  }, [originalImage, rotation, cropX, cropY, cropWidth, cropHeight]);

  // Apply filters when filter properties or rendered image change
  useEffect(() => {
    const node = imageRef.current;
    if (!node || !renderedImage) return;

    // Apply filters from the hook
    node.filters(filters);
    applyAttributes(node);

    // Only cache if there are active filters (caching is expensive)
    if (hasActiveFilters(assignment)) {
      node.cache();
    } else {
      node.clearCache();
    }

    node.getLayer()?.batchDraw();
  }, [filters, applyAttributes, renderedImage, assignment]);

  // Convert slot percentage coordinates to canvas pixel coordinates
  const slotX = useMemo(() => (slot.x / 100) * CANVAS_WIDTH, [slot.x]);
  const slotY = useMemo(() => (slot.y / 100) * CANVAS_HEIGHT, [slot.y]);
  const slotWidth = useMemo(() => (slot.width / 100) * CANVAS_WIDTH, [slot.width]);
  const slotHeight = useMemo(() => (slot.height / 100) * CANVAS_HEIGHT, [slot.height]);

  // Convert to preview coordinates
  const previewSlotX = useMemo(() => slotX * scaleX, [slotX, scaleX]);
  const previewSlotY = useMemo(() => slotY * scaleY, [slotY, scaleY]);
  const previewSlotWidth = useMemo(() => slotWidth * scaleX, [slotWidth, scaleX]);
  const previewSlotHeight = useMemo(() => slotHeight * scaleY, [slotHeight, scaleY]);

  /**
   * Handle image click - select this image
   */
  const handleImageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true; // Prevent stage click from firing
    if (onSelect) {
      onSelect();
    }
    },
    [onSelect]
  );

  /**
   * Handle image double-click - open editor modal
   */
  const handleImageDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (onDoubleClick) {
      onDoubleClick();
    }
    },
    [onDoubleClick]
  );

  if (!renderedImage) {
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
      />
    </Group>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(ImageLayer);
