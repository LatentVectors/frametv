'use client';

import { Group, Image as KonvaImage } from 'react-konva';
import { ImageAssignment, Slot as SlotType } from '@/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PREVIEW_MAX_IMAGE_WIDTH, PREVIEW_MAX_IMAGE_HEIGHT } from '@/lib/config';
import { useEffect, useState, memo, useMemo, useCallback, useRef } from 'react';
import { createPreviewImage } from '@/lib/imageUtils';
import { applyTemperatureTintAttributes } from '@/lib/filters/temperatureTint';
import { applyMonochromeAttributes, MonochromeFilter } from '@/lib/filters/monochrome';
import Konva from 'konva';

interface ImageLayerProps {
  assignment: ImageAssignment;
  slot: SlotType;
  scaleX: number;
  scaleY: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onDoubleClick?: () => void;
  onTransformUpdate?: (x: number, y: number) => void;
  onScaleUpdate?: (scaleX: number, scaleY: number) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function ImageLayer({
  assignment,
  slot,
  scaleX,
  scaleY,
  isSelected = false,
  onSelect,
  onDoubleClick,
  onTransformUpdate,
  onScaleUpdate,
  onMouseEnter,
  onMouseLeave,
}: ImageLayerProps) {
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<any>(null);

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

  // Apply filters when filter properties change
  useEffect(() => {
    if (!imageRef.current) return;
    
    const filters: any[] = [];
    
    // Global master switch
    const filtersEnabled = assignment.filtersEnabled ?? true;
    
    // Individual enabled flags (default to true)
    const brightnessEnabled = assignment.brightnessEnabled ?? true;
    const contrastEnabled = assignment.contrastEnabled ?? true;
    const saturationEnabled = assignment.saturationEnabled ?? true;
    const hueEnabled = assignment.hueEnabled ?? true;
    const temperatureEnabled = assignment.temperatureEnabled ?? true;
    const tintEnabled = assignment.tintEnabled ?? true;
    
    // Apply brightness filter (only if globally enabled, individually enabled, and has value)
    const shouldApplyBrightness = filtersEnabled && brightnessEnabled && 
      assignment.brightness !== undefined && assignment.brightness !== 0;
    if (shouldApplyBrightness) {
      filters.push(Konva.Filters.Brighten);
    }
    
    // Apply contrast filter
    const shouldApplyContrast = filtersEnabled && contrastEnabled && 
      assignment.contrast !== undefined && assignment.contrast !== 0;
    if (shouldApplyContrast) {
      filters.push(Konva.Filters.Contrast);
    }
    
    // Apply HSL filter (for saturation and hue)
    const shouldApplySaturation = filtersEnabled && saturationEnabled && 
      assignment.saturation !== undefined && assignment.saturation !== 0;
    const shouldApplyHue = filtersEnabled && hueEnabled && 
      assignment.hue !== undefined && assignment.hue !== 0;
    if (shouldApplySaturation || shouldApplyHue) {
      filters.push(Konva.Filters.HSL);
    }
    
    // Apply temperature/tint filter
    const shouldApplyTemperature = filtersEnabled && temperatureEnabled && 
      assignment.temperature !== undefined && assignment.temperature !== 0;
    const shouldApplyTint = filtersEnabled && tintEnabled && 
      assignment.tint !== undefined && assignment.tint !== 0;
    const temperatureTintFilter =
      (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).TemperatureTint;
    if ((shouldApplyTemperature || shouldApplyTint) && temperatureTintFilter) {
      filters.push(temperatureTintFilter);
    }
    
    // Apply monochrome filter
    const shouldApplyMonochrome = filtersEnabled && 
      assignment.monochromeColor !== undefined && assignment.monochromeColor !== '';
    const monochromeFilter =
      (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).Monochrome;
    if (shouldApplyMonochrome && monochromeFilter) {
      filters.push(monochromeFilter);
    }
    
    imageRef.current.filters(filters);
    
    // Set filter values (only if enabled)
    if (shouldApplyBrightness) {
      // Brighten filter expects values from -1 to 1
      imageRef.current.brightness(assignment.brightness! / 100);
    }
    
    if (shouldApplyContrast) {
      // Contrast filter expects values from -100 to 100
      imageRef.current.contrast(assignment.contrast!);
    }
    
    if (shouldApplySaturation) {
      // HSL saturation expects values from -2 to 10 (we'll map -100 to 100 to -2 to 2)
      imageRef.current.saturation(assignment.saturation! / 50);
    }
    
    if (shouldApplyHue) {
      // HSL hue expects values from 0 to 359 (degrees)
      imageRef.current.hue(assignment.hue!);
    }
    
    // Apply temperature and tint (only pass values if enabled)
    const tempValue = shouldApplyTemperature ? (assignment.temperature ?? 0) : 0;
    const tintValue = shouldApplyTint ? (assignment.tint ?? 0) : 0;
    applyTemperatureTintAttributes(imageRef.current, tempValue, tintValue);
    
    // Apply monochrome color
    applyMonochromeAttributes(imageRef.current, shouldApplyMonochrome ? (assignment.monochromeColor ?? '') : '');
    
    imageRef.current.cache();
    imageRef.current.getLayer()?.batchDraw();
  }, [
    assignment.brightness,
    assignment.contrast,
    assignment.saturation,
    assignment.hue,
    assignment.temperature,
    assignment.tint,
    assignment.monochromeColor,
    assignment.filtersEnabled,
    assignment.brightnessEnabled,
    assignment.contrastEnabled,
    assignment.saturationEnabled,
    assignment.hueEnabled,
    assignment.temperatureEnabled,
    assignment.tintEnabled,
  ]);

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
  
  // Get crop values (stored as percentages 0-100 relative to image)
  const hasCrop = useMemo(() => 
    assignment.cropX !== undefined && 
    assignment.cropY !== undefined && 
    assignment.cropWidth !== undefined && 
    assignment.cropHeight !== undefined &&
    (assignment.cropX !== 0 || assignment.cropY !== 0 || 
     assignment.cropWidth !== 100 || assignment.cropHeight !== 100),
    [assignment.cropX, assignment.cropY, assignment.cropWidth, assignment.cropHeight]
  );
  
  // Crop bounds in percentage (0-100) - default to full image
  const cropX = useMemo(() => assignment.cropX ?? 0, [assignment.cropX]);
  const cropY = useMemo(() => assignment.cropY ?? 0, [assignment.cropY]);
  const cropWidth = useMemo(() => assignment.cropWidth ?? 100, [assignment.cropWidth]);
  const cropHeight = useMemo(() => assignment.cropHeight ?? 100, [assignment.cropHeight]);
  
  // Rotation angle in degrees
  const rotation = useMemo(() => assignment.rotation ?? 0, [assignment.rotation]);
  
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
  
  // Calculate crop dimensions in preview image pixels
  const cropConfig = useMemo(() => {
    if (!previewImage) return null;
    
    // Convert percentage crop to preview image pixels
    const previewCropX = (cropX / 100) * previewImage.width;
    const previewCropY = (cropY / 100) * previewImage.height;
    const previewCropWidth = (cropWidth / 100) * previewImage.width;
    const previewCropHeight = (cropHeight / 100) * previewImage.height;
    
    return {
      x: previewCropX,
      y: previewCropY,
      width: previewCropWidth,
      height: previewCropHeight,
    };
  }, [previewImage, cropX, cropY, cropWidth, cropHeight]);
  
  // Calculate image dimensions using preview image and adjusted scales
  // When crop is applied, we scale based on the cropped portion size
  const imageWidth = useMemo(() => {
    if (!previewImage) return 0;
    if (hasCrop && cropConfig) {
      // When cropped, the displayed size is based on the crop region scaled up
      return cropConfig.width * previewScaleX;
    }
    return previewImage.width * previewScaleX;
  }, [previewImage, hasCrop, cropConfig, previewScaleX]);
  
  const imageHeight = useMemo(() => {
    if (!previewImage) return 0;
    if (hasCrop && cropConfig) {
      return cropConfig.height * previewScaleY;
    }
    return previewImage.height * previewScaleY;
  }, [previewImage, hasCrop, cropConfig, previewScaleY]);

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

  /**
   * Handle image double-click - open editor modal
   */
  const handleImageDblClick = useCallback((e: any) => {
    e.cancelBubble = true;
    if (onDoubleClick) {
      onDoubleClick();
    }
  }, [onDoubleClick]);

  /**
   * Handle mouse wheel zoom - only when image is selected
   */
  const handleWheel = useCallback((e: any) => {
    // Only allow zoom when image is selected
    if (!isSelected) return;
    
    e.evt.preventDefault();
    
    if (!onScaleUpdate || !onTransformUpdate) return;

    // Calculate minimum scale that fills the slot
    const minScaleX = slotWidth / originalWidth;
    const minScaleY = slotHeight / originalHeight;
    const minScale = Math.max(minScaleX, minScaleY);
    
    // Set maximum scale (3x the minimum)
    const maxScale = minScale * 3;
    
    // Calculate zoom step (10% per wheel tick)
    const zoomStep = 0.1;
    const delta = e.evt.deltaY > 0 ? -zoomStep : zoomStep;
    
    // Calculate new scale (maintaining aspect ratio)
    const currentScale = assignment.scaleX;
    let newScale = currentScale * (1 + delta);
    
    // Constrain scale between min and max
    newScale = Math.max(minScale, Math.min(maxScale, newScale));
    
    if (newScale === currentScale) return;
    
    // If at minimum scale, center the image
    if (newScale === minScale) {
      const scaledWidth = originalWidth * newScale;
      const scaledHeight = originalHeight * newScale;
      const centeredX = (slotWidth - scaledWidth) / 2;
      const centeredY = (slotHeight - scaledHeight) / 2;
      
      onScaleUpdate(newScale, newScale);
      onTransformUpdate(centeredX, centeredY);
    } else {
      // Zoom towards cursor position
      // Get pointer position relative to the stage
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      
      if (pointerPos) {
        // Convert pointer position to canvas coordinates
        const pointerCanvasX = pointerPos.x / scaleX;
        const pointerCanvasY = pointerPos.y / scaleY;
        
        // Calculate pointer position relative to slot
        const pointerSlotX = pointerCanvasX - slotX;
        const pointerSlotY = pointerCanvasY - slotY;
        
        // Calculate the point under the pointer in image coordinates (before scaling)
        const imagePointX = (pointerSlotX - assignment.x) / currentScale;
        const imagePointY = (pointerSlotY - assignment.y) / currentScale;
        
        // Calculate new position to keep the same point under the pointer
        const newX = pointerSlotX - imagePointX * newScale;
        const newY = pointerSlotY - imagePointY * newScale;
        
        // Constrain position to keep image within slot
        const scaledWidth = originalWidth * newScale;
        const scaledHeight = originalHeight * newScale;
        
        const minX = Math.min(0, slotWidth - scaledWidth);
        const maxX = Math.max(0, slotWidth - scaledWidth);
        const minY = Math.min(0, slotHeight - scaledHeight);
        const maxY = Math.max(0, slotHeight - scaledHeight);
        
        const constrainedX = Math.max(minX, Math.min(maxX, newX));
        const constrainedY = Math.max(minY, Math.min(maxY, newY));
        
        onScaleUpdate(newScale, newScale);
        onTransformUpdate(constrainedX, constrainedY);
      } else {
        // Fallback: just update scale without adjusting position
        onScaleUpdate(newScale, newScale);
      }
    }
  }, [
    isSelected,
    assignment.scaleX,
    assignment.x,
    assignment.y,
    originalWidth,
    originalHeight,
    slotWidth,
    slotHeight,
    slotX,
    slotY,
    scaleX,
    scaleY,
    onScaleUpdate,
    onTransformUpdate
  ]);

  if (!previewImage) {
    return null;
  }

  // Handle horizontal mirroring
  const mirrorX = assignment.mirrorX ?? false;
  const imageScaleX = mirrorX ? -1 : 1;
  
  // Calculate center point for rotation
  // When rotation is applied, we rotate around the center of the displayed image
  const imageCenterX = previewWidth / 2;
  const imageCenterY = previewHeight / 2;
  
  // Calculate offset for mirroring and rotation
  // For mirroring, we need to offset by the full width
  // For rotation, we set the offset to the center
  const hasRotation = rotation !== 0;
  let offsetX = 0;
  let offsetY = 0;
  
  if (hasRotation) {
    // When rotating, offset to center so rotation happens around center
    offsetX = imageCenterX;
    offsetY = imageCenterY;
  }
  
  // For mirroring with rotation, we need to handle differently
  if (mirrorX && !hasRotation) {
    offsetX = previewWidth;
  } else if (mirrorX && hasRotation) {
    // When both mirroring and rotating, the center offset already handles positioning
    // but we need to flip the scaleX
  }
  
  // Adjust position when using offset for rotation
  // The position needs to be offset to account for the rotation center
  const adjustedPreviewX = hasRotation ? previewX + imageCenterX : previewX;
  const adjustedPreviewY = hasRotation ? previewY + imageCenterY : previewY;

  return (
    <Group
      clipX={previewSlotX}
      clipY={previewSlotY}
      clipWidth={previewSlotWidth}
      clipHeight={previewSlotHeight}
    >
      <KonvaImage
        ref={imageRef}
        image={previewImage}
        x={adjustedPreviewX}
        y={adjustedPreviewY}
        width={previewWidth}
        height={previewHeight}
        scaleX={imageScaleX}
        offsetX={offsetX}
        offsetY={offsetY}
        rotation={rotation}
        crop={hasCrop && cropConfig ? cropConfig : undefined}
        draggable={true}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleImageClick}
        onTap={handleImageClick}
        onDblClick={handleImageDblClick}
        onDblTap={handleImageDblClick}
        onWheel={handleWheel}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    </Group>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(ImageLayer);

