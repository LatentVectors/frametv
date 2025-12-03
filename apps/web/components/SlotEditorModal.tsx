'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Shape, Group } from 'react-konva';
import Konva from 'konva';
import { ImageAssignment, Slot } from '@/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdjustmentSlider } from '@/components/AdjustmentSlider';
import { useAdjustmentState, PresetType, FilterEnabledField } from '@/hooks/useAdjustmentState';
import { 
  FlipHorizontal, 
  RotateCcw, 
  Sun, 
  Palette,
} from 'lucide-react';
import { 
  calculateBoundingBox, 
  getRotatedImagePolygon,
  isValidCropPosition,
  constrainCropToValidArea,
  cropToPercentage,
  percentageToCrop,
  scaleCropFromCenter,
  fitCropToAspectRatio,
  CropRect,
  Polygon,
} from '@/lib/cropGeometry';
import { applyFilters } from '@/lib/filters/applyFilters';
import { getSlotAspectRatio } from '@/lib/slotGeometry';

// Custom adjustment icons
const ContrastIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.3" />
    <path d="M8 2 A 6 6 0 0 1 8 14 Z" fill="currentColor" />
  </svg>
);

const SaturationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="satGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#808080" />
        <stop offset="50%" stopColor="#ff0000" />
        <stop offset="100%" stopColor="#00ff00" />
      </linearGradient>
    </defs>
    <rect x="3" y="6" width="10" height="4" rx="2" fill="url(#satGradient)" />
  </svg>
);

const HueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hueGradient">
        <stop offset="0%" stopColor="#ff0000" />
        <stop offset="16.66%" stopColor="#ffff00" />
        <stop offset="33.33%" stopColor="#00ff00" />
        <stop offset="50%" stopColor="#00ffff" />
        <stop offset="66.66%" stopColor="#0000ff" />
        <stop offset="83.33%" stopColor="#ff00ff" />
        <stop offset="100%" stopColor="#ff0000" />
      </linearGradient>
    </defs>
    <circle cx="8" cy="8" r="6" fill="none" stroke="url(#hueGradient)" strokeWidth="3" />
  </svg>
);

const TemperatureIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill="#3b82f6" />
    <path d="M8 2 A 6 6 0 0 1 8 14 Z" fill="#f59e0b" />
  </svg>
);

const TintIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill="#10b981" />
    <path d="M8 2 A 6 6 0 0 1 8 14 Z" fill="#ec4899" />
  </svg>
);

const RotationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2V1M8 2C10.7614 2 13 4.23858 13 7C13 9.76142 10.7614 12 8 12C5.23858 12 3 9.76142 3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6 2L8 0L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8" cy="7" r="2" fill="currentColor"/>
  </svg>
);

/**
 * Updated props interface per spec section 13
 */
interface SlotEditorModalProps {
  assignment: ImageAssignment;
  slot: Slot;
  imageDimensions: { width: number; height: number };
  onSave: (updatedAssignment: ImageAssignment) => void;
  onCancel: () => void;
}

// MONOCHROME COLORS
const MONOCHROME_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
  '#8b5cf6', '#ec4899', '#78716c', '#1f2937', '#f5f5f4', '#6366f1'
];

/**
 * Create a checkerboard pattern canvas for the background
 */
function createCheckerboardPattern(): HTMLCanvasElement {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 20;
  patternCanvas.height = 20;
  const ctx = patternCanvas.getContext('2d')!;
  
  // Draw the checkerboard pattern (10x10 per square)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 20, 20);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, 10, 10);
  ctx.fillRect(10, 10, 10, 10);
  
  return patternCanvas;
}

const STAGE_PADDING = 32;
const MIN_CROP_PERCENT = 5;

export function SlotEditorModal({ 
  assignment, 
  slot, 
  imageDimensions,
  onSave, 
  onCancel 
}: SlotEditorModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageNodeRef = useRef<Konva.Image | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [checkerboardPattern, setCheckerboardPattern] = useState<HTMLCanvasElement | null>(null);
  
  // Calculate slot aspect ratio using true canvas pixels
  const slotAspectRatio = useMemo(() => getSlotAspectRatio(slot), [slot]);
  
  // Task 11.1: Use the adjustment state hook for local state management
  const {
    state: localState,
    updateValue,
    toggleEnabled,
    togglePreset,
    toggleMirror,
    resetAll: hookResetAll,
    getAssignment,
  } = useAdjustmentState(assignment, imageDimensions, slotAspectRatio);

  // Crop drag state
  const [cropDragType, setCropDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropStartPixels, setCropStartPixels] = useState<CropRect | null>(null);
  
  // Task 11.8: Debounce refs for filter updates (16ms with requestAnimationFrame)
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Create checkerboard pattern on mount
  useEffect(() => {
    setCheckerboardPattern(createCheckerboardPattern());
  }, []);

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setLoadError(null);
    };
    img.onerror = () => {
      setLoadError('Failed to load image');
    };
    img.src = assignment.imageUrl;
  }, [assignment.imageUrl]);

  // Update stage size based on container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !image) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxWidth = rect.width - 40;
      const maxHeight = rect.height - 40;
      
      // Calculate bounding box for rotated image
      const bbox = calculateBoundingBox(image.width, image.height, localState.rotation);
      const bboxAspectRatio = bbox.width / bbox.height;
      
      let width = maxWidth;
      let height = width / bboxAspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * bboxAspectRatio;
      }
      
      setStageSize({ width, height });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [image, localState.rotation]);

  // Task 5.1: Compute bounding box from loaded image dimensions (not props)
  // This is the source of truth for all coordinate conversions
  const boundingBox = useMemo(() => {
    if (!image) return { width: 1, height: 1 }; // Fallback to avoid division by zero
    return calculateBoundingBox(image.width, image.height, localState.rotation);
  }, [image, localState.rotation]);

  // Task 5.2: Derive displayScale from boundingBox
  const displayScale = useMemo(
    () =>
      Math.min(
        stageSize.width / boundingBox.width,
        stageSize.height / boundingBox.height
      ),
    [stageSize, boundingBox]
  );

  // Task 5.3: Calculate crop rectangle in display coordinates using correct pipeline:
  // percentage → bounding box pixels → display coordinates (multiply by displayScale)
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

  const stageWidth = stageSize.width + STAGE_PADDING * 2;
  const stageHeight = stageSize.height + STAGE_PADDING * 2;
  const stageCursor = cropDragType ? 'grabbing' : 'grab';

  // Get current assignment state for filter application
  const currentAssignment = useMemo((): ImageAssignment => ({
    ...assignment,
    ...localState,
  }), [assignment, localState]);

  // Task 11.8: Debounced filter application (16ms) with requestAnimationFrame
  useEffect(() => {
    if (!imageNodeRef.current) return;
    
    // Clear any pending debounce
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Debounce filter updates by 16ms (~60fps)
    filterDebounceRef.current = setTimeout(() => {
      // Use requestAnimationFrame for smooth frame timing
      rafIdRef.current = requestAnimationFrame(() => {
        const node = imageNodeRef.current;
        if (!node) return;
        
        applyFilters(node, currentAssignment);
        node.cache();
        node.getLayer()?.batchDraw();
      });
    }, 16);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [currentAssignment]);

  /**
   * Task 5.4: Convert a display coordinate delta to a percentage delta.
   * Used by all drag handlers to ensure consistent coordinate transformation.
   */

  // Handle crop drag start
  const handleCropDragStart = useCallback((type: 'move' | 'nw' | 'ne' | 'sw' | 'se', x: number, y: number) => {
    setCropDragType(type);
    setCropDragStart({ x, y });
    setCropStartPixels(
      percentageToCrop(
        {
          x: localState.cropX,
          y: localState.cropY,
          width: localState.cropWidth,
          height: localState.cropHeight,
        },
        boundingBox
      )
    );
  }, [localState.cropX, localState.cropY, localState.cropWidth, localState.cropHeight, boundingBox]);

  // Handle crop drag move
  const handleCropDragMove = useCallback((stageX: number, stageY: number) => {
    if (!cropDragType || !cropStartPixels || !image) return;

    const localX = stageX - STAGE_PADDING;
    const localY = stageY - STAGE_PADDING;
    const clampedX = Math.min(Math.max(localX, 0), stageSize.width);
    const clampedY = Math.min(Math.max(localY, 0), stageSize.height);

    const polygon = getRotatedImagePolygon(image.width, image.height, localState.rotation);
    const pointerBounding = {
      x: clampedX / displayScale,
      y: clampedY / displayScale,
    };

    let nextCrop: CropRect = cropStartPixels;

    if (cropDragType === 'move') {
      const deltaX = (clampedX - cropDragStart.x) / displayScale;
      const deltaY = (clampedY - cropDragStart.y) / displayScale;

      nextCrop = {
        ...cropStartPixels,
        x: cropStartPixels.x + deltaX,
        y: cropStartPixels.y + deltaY,
      };

      nextCrop.x = Math.max(0, Math.min(nextCrop.x, boundingBox.width - nextCrop.width));
      nextCrop.y = Math.max(0, Math.min(nextCrop.y, boundingBox.height - nextCrop.height));

      if (!isValidCropPosition(nextCrop, polygon)) {
        nextCrop = constrainCropToValidArea(nextCrop, polygon, slotAspectRatio);
      }
    } else {
      const oppositeCornerMap: Record<'nw' | 'ne' | 'sw' | 'se', 'nw' | 'ne' | 'sw' | 'se'> = {
        nw: 'se',
        ne: 'sw',
        sw: 'ne',
        se: 'nw',
      };

      const anchorCorner = oppositeCornerMap[cropDragType];
      const anchorPoint = (() => {
        switch (anchorCorner) {
          case 'nw':
            return { x: cropStartPixels.x, y: cropStartPixels.y };
          case 'ne':
            return { x: cropStartPixels.x + cropStartPixels.width, y: cropStartPixels.y };
          case 'sw':
            return { x: cropStartPixels.x, y: cropStartPixels.y + cropStartPixels.height };
          case 'se':
          default:
            return {
              x: cropStartPixels.x + cropStartPixels.width,
              y: cropStartPixels.y + cropStartPixels.height,
            };
        }
      })();

      let draft: CropRect = {
        x: Math.min(pointerBounding.x, anchorPoint.x),
        y: Math.min(pointerBounding.y, anchorPoint.y),
        width: Math.abs(anchorPoint.x - pointerBounding.x),
        height: Math.abs(anchorPoint.y - pointerBounding.y),
      };

      draft = fitCropToAspectRatio(draft, slotAspectRatio, anchorCorner);

      const minWidthPx = (MIN_CROP_PERCENT / 100) * boundingBox.width;
      const minHeightPx = minWidthPx / slotAspectRatio;
      if (draft.width < minWidthPx) {
        switch (anchorCorner) {
          case 'nw':
            draft = { x: anchorPoint.x, y: anchorPoint.y, width: minWidthPx, height: minHeightPx };
            break;
          case 'ne':
            draft = {
              x: anchorPoint.x - minWidthPx,
              y: anchorPoint.y,
              width: minWidthPx,
              height: minHeightPx,
            };
            break;
          case 'sw':
            draft = {
              x: anchorPoint.x,
              y: anchorPoint.y - minHeightPx,
              width: minWidthPx,
              height: minHeightPx,
            };
            break;
          case 'se':
          default:
            draft = {
              x: anchorPoint.x - minWidthPx,
              y: anchorPoint.y - minHeightPx,
              width: minWidthPx,
              height: minHeightPx,
            };
            break;
        }
      }

      draft.x = Math.max(0, Math.min(draft.x, boundingBox.width - draft.width));
      draft.y = Math.max(0, Math.min(draft.y, boundingBox.height - draft.height));

      if (!isValidCropPosition(draft, polygon)) {
        draft = constrainCropToValidArea(draft, polygon, slotAspectRatio);
      }

      nextCrop = draft;
    }

    const percentageCrop = cropToPercentage(nextCrop, boundingBox);
    updateValue('cropX', percentageCrop.x);
    updateValue('cropY', percentageCrop.y);
    updateValue('cropWidth', percentageCrop.width);
    updateValue('cropHeight', percentageCrop.height);
  }, [cropDragType, cropDragStart, cropStartPixels, image, localState.rotation, stageSize.width, stageSize.height, displayScale, boundingBox, slotAspectRatio, updateValue]);

  // Handle crop drag end
  const handleCropDragEnd = useCallback(() => {
    setCropDragType(null);
    setCropStartPixels(null);
  }, []);

  // Stage mouse handlers
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    const x = pos.x - STAGE_PADDING;
    const y = pos.y - STAGE_PADDING;
    const handleSize = 15;
    
    if (
      x < -handleSize ||
      y < -handleSize ||
      x > stageSize.width + handleSize ||
      y > stageSize.height + handleSize
    ) {
      return;
    }

    const cropX = displayCrop.x;
    const cropY = displayCrop.y;
    const cropW = displayCrop.width;
    const cropH = displayCrop.height;
    
    if (Math.abs(x - cropX) < handleSize && Math.abs(y - cropY) < handleSize) {
      handleCropDragStart('nw', x, y);
    } else if (Math.abs(x - (cropX + cropW)) < handleSize && Math.abs(y - cropY) < handleSize) {
      handleCropDragStart('ne', x, y);
    } else if (Math.abs(x - cropX) < handleSize && Math.abs(y - (cropY + cropH)) < handleSize) {
      handleCropDragStart('sw', x, y);
    } else if (Math.abs(x - (cropX + cropW)) < handleSize && Math.abs(y - (cropY + cropH)) < handleSize) {
      handleCropDragStart('se', x, y);
    } else if (x > cropX && x < cropX + cropW && y > cropY && y < cropY + cropH) {
      handleCropDragStart('move', x, y);
    }
  }, [displayCrop, handleCropDragStart, stageSize.width, stageSize.height]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!cropDragType) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    handleCropDragMove(pos.x, pos.y);
  }, [cropDragType, handleCropDragMove]);

  const handleStageMouseUp = useCallback(() => {
    handleCropDragEnd();
  }, [handleCropDragEnd]);

  const handleStageWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    if (!image) return;

    const deltaY = e.evt.deltaY;
    const scaleFactor = deltaY < 0 ? 0.95 : 1.05;

    const polygon = getRotatedImagePolygon(image.width, image.height, localState.rotation);
    const cropPixels = percentageToCrop(
      {
        x: localState.cropX,
        y: localState.cropY,
        width: localState.cropWidth,
        height: localState.cropHeight,
      },
      boundingBox
    );

    let scaled = scaleCropFromCenter(cropPixels, scaleFactor);

    const minWidthPx = (MIN_CROP_PERCENT / 100) * boundingBox.width;
    const maxWidthPx = boundingBox.width;
    const clampedWidth = Math.min(Math.max(scaled.width, minWidthPx), maxWidthPx);
    const clampedHeight = clampedWidth / slotAspectRatio;

    if (clampedWidth !== scaled.width) {
      const centerX = scaled.x + scaled.width / 2;
      const centerY = scaled.y + scaled.height / 2;
      scaled = {
        x: centerX - clampedWidth / 2,
        y: centerY - clampedHeight / 2,
        width: clampedWidth,
        height: clampedHeight,
      };
    }

    scaled = fitCropToAspectRatio(scaled, slotAspectRatio, 'center');

    scaled.x = Math.max(0, Math.min(scaled.x, boundingBox.width - scaled.width));
    scaled.y = Math.max(0, Math.min(scaled.y, boundingBox.height - scaled.height));

    if (!isValidCropPosition(scaled, polygon)) {
      scaled = constrainCropToValidArea(scaled, polygon, slotAspectRatio);
    }

    const percentageCrop = cropToPercentage(scaled, boundingBox);
    updateValue('cropX', percentageCrop.x);
    updateValue('cropY', percentageCrop.y);
    updateValue('cropWidth', percentageCrop.width);
    updateValue('cropHeight', percentageCrop.height);
  }, [image, localState.cropX, localState.cropY, localState.cropWidth, localState.cropHeight, localState.rotation, boundingBox, slotAspectRatio, updateValue]);

  // Handle rotation change with crop constraint
  const handleRotationChange = useCallback((newRotation: number) => {
    // updateValue handles crop constraint automatically when rotation changes
    updateValue('rotation', newRotation);
  }, [updateValue]);

  // Handle monochrome color change with preset activation
  const handleMonochromeColorChange = useCallback((color: string) => {
    updateValue('monochromeColor', color);
    // Activate monochrome preset and deactivate others
    if (!localState.monochromeEnabled) {
      togglePreset('monochrome');
    }
  }, [updateValue, togglePreset, localState.monochromeEnabled]);

  // Save handler - use getAssignment from hook
  const handleSave = useCallback(() => {
    onSave(getAssignment());
  }, [getAssignment, onSave]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Check for preset disabled sliders (Task 11.5)
  const isColorPresetActive = localState.blackWhiteEnabled || localState.sepiaEnabled || localState.monochromeEnabled;
  const disabledTooltip = isColorPresetActive 
    ? `No effect while ${localState.blackWhiteEnabled ? 'Black & White' : localState.sepiaEnabled ? 'Sepia' : 'Monochrome'} is active`
    : undefined;

  // Render error state
  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-4">{loadError}</div>
        <Button onClick={onCancel}>Close</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header - Task 11.6: Cancel and Save buttons on the right */}
      <div className="flex items-center justify-end px-6 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Controls */}
        <div className="w-80 bg-background/80 backdrop-blur-sm border-r border-border/50 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Mirror/Flip */}
            <div>
              <Button
                variant={localState.mirrorX ? "default" : "outline"}
                size="sm"
                onClick={toggleMirror}
                className="w-10 h-10 p-0"
                title="Flip Horizontal"
              >
                <FlipHorizontal className="h-5 w-5" />
              </Button>
            </div>

            {/* Task 11.4: Filter Presets with mutual exclusivity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Filter Presets</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={localState.blackWhiteEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePreset('blackWhite')}
                  className="h-8 text-xs"
                >
                  Black & White
                </Button>
                <Button
                  variant={localState.sepiaEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePreset('sepia')}
                  className="h-8 text-xs"
                >
                  Sepia
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant={localState.monochromeEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePreset('monochrome')}
                    className="h-8 text-xs"
                  >
                    Monochrome
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-opacity ${
                          localState.monochromeEnabled 
                            ? 'border-foreground opacity-100' 
                            : 'border-muted opacity-50 hover:opacity-75'
                        }`}
                        style={{ backgroundColor: localState.monochromeColor }}
                        title="Select Monochrome Color"
                        disabled={localState.blackWhiteEnabled || localState.sepiaEnabled}
                      >
                        <Palette className="h-4 w-4 text-white drop-shadow" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Select Monochrome Color</label>
                        <div className="grid grid-cols-6 gap-1">
                          {MONOCHROME_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded border-2 ${
                                localState.monochromeColor === color ? 'border-foreground' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => handleMonochromeColorChange(color)}
                            />
                          ))}
                        </div>
                        <Input
                          type="color"
                          value={localState.monochromeColor}
                          onChange={(e) => handleMonochromeColorChange(e.target.value)}
                          className="h-8 w-full cursor-pointer"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          
            {/* Task 11.2/11.3: Adjustments using AdjustmentSlider with eye icons and reset buttons */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Adjustments</label>
              
              <AdjustmentSlider
                label="Brightness"
                icon={<Sun className="h-4 w-4" />}
                value={localState.brightness}
                enabled={localState.brightnessEnabled}
                globalEnabled={localState.filtersEnabled}
                min={-100}
                max={100}
                onValueChange={(v) => updateValue('brightness', v)}
                onToggle={() => toggleEnabled('brightnessEnabled')}
                onReset={() => updateValue('brightness', 0)}
              />
              
              <AdjustmentSlider
                label="Contrast"
                icon={<ContrastIcon />}
                value={localState.contrast}
                enabled={localState.contrastEnabled}
                globalEnabled={localState.filtersEnabled}
                min={-100}
                max={100}
                onValueChange={(v) => updateValue('contrast', v)}
                onToggle={() => toggleEnabled('contrastEnabled')}
                onReset={() => updateValue('contrast', 0)}
              />
              
              {/* Task 11.5: Saturation disabled when color preset active */}
              <AdjustmentSlider
                label="Saturation"
                icon={<SaturationIcon />}
                value={localState.saturation}
                enabled={localState.saturationEnabled}
                globalEnabled={localState.filtersEnabled}
                min={-100}
                max={100}
                disabled={isColorPresetActive}
                disabledTooltip={disabledTooltip}
                onValueChange={(v) => updateValue('saturation', v)}
                onToggle={() => toggleEnabled('saturationEnabled')}
                onReset={() => updateValue('saturation', 0)}
              />
              
              {/* Task 11.5: Hue disabled when color preset active */}
              <AdjustmentSlider
                label="Hue"
                icon={<HueIcon />}
                value={localState.hue}
                enabled={localState.hueEnabled}
                globalEnabled={localState.filtersEnabled}
                min={-180}
                max={180}
                disabled={isColorPresetActive}
                disabledTooltip={disabledTooltip}
                onValueChange={(v) => updateValue('hue', v)}
                onToggle={() => toggleEnabled('hueEnabled')}
                onReset={() => updateValue('hue', 0)}
              />
              
              {/* Task 11.5: Temperature disabled when color preset active */}
              <AdjustmentSlider
                label="Temperature"
                icon={<TemperatureIcon />}
                value={localState.temperature}
                enabled={localState.temperatureEnabled}
                globalEnabled={localState.filtersEnabled}
                min={-100}
                max={100}
                disabled={isColorPresetActive}
                disabledTooltip={disabledTooltip}
                onValueChange={(v) => updateValue('temperature', v)}
                onToggle={() => toggleEnabled('temperatureEnabled')}
                onReset={() => updateValue('temperature', 0)}
              />
              
              {/* Task 11.5: Tint disabled when color preset active */}
              <AdjustmentSlider
                label="Tint"
                icon={<TintIcon />}
                value={localState.tint}
                enabled={localState.tintEnabled}
                globalEnabled={localState.filtersEnabled}
                min={-100}
                max={100}
                disabled={isColorPresetActive}
                disabledTooltip={disabledTooltip}
                onValueChange={(v) => updateValue('tint', v)}
                onToggle={() => toggleEnabled('tintEnabled')}
                onReset={() => updateValue('tint', 0)}
              />
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rotation</label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <RotationIcon />
                </div>
                <Slider
                  value={[localState.rotation]}
                  onValueChange={([v]) => handleRotationChange(v)}
                  min={-180}
                  max={180}
                  step={0.1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={localState.rotation.toFixed(1)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    handleRotationChange(Math.max(-180, Math.min(180, v)));
                  }}
                  min={-180}
                  max={180}
                  step={0.1}
                  className="w-16 h-8 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">°</span>
              </div>
            </div>

            {/* Reset All */}
            <div className="pt-4 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={hookResetAll}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-5 bg-black/50"
        >
          {image && checkerboardPattern && (
            <Stage
              width={stageWidth}
              height={stageHeight}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              onMouseLeave={handleStageMouseUp}
              onWheel={handleStageWheel}
              style={{ cursor: stageCursor }}
            >
              {/* Background Layer - Checkerboard pattern */}
              <Layer>
                <Rect
                  width={stageWidth}
                  height={stageHeight}
                  fillPatternImage={checkerboardPattern}
                  fillPatternRepeat="repeat"
                />
              </Layer>

              {/* Image Layer - Rotated image with filters */}
              <Layer x={STAGE_PADDING} y={STAGE_PADDING}>
                <KonvaImage
                  ref={(node) => {
                    imageNodeRef.current = node;
                    if (node) {
                      applyFilters(node, currentAssignment);
                      node.cache();
                    }
                  }}
                  image={image}
                  x={stageSize.width / 2}
                  y={stageSize.height / 2}
                  width={image.width * displayScale}
                  height={image.height * displayScale}
                  offsetX={(image.width * displayScale) / 2}
                  offsetY={(image.height * displayScale) / 2}
                  rotation={localState.rotation}
                  scaleX={localState.mirrorX ? -1 : 1}
                />
              </Layer>

              {/* Overlay Layer - Dark overlay with crop cutout */}
              <Layer>
                <Shape
                  sceneFunc={(context, shape) => {
                    const ctx = context._context;
                    
                    // Draw dark overlay over entire stage
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(0, 0, stageWidth, stageHeight);
                    
                    // Cut out the crop area using destination-out composite
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.fillStyle = 'white';
                    ctx.fillRect(
                      displayCrop.x + STAGE_PADDING,
                      displayCrop.y + STAGE_PADDING,
                      displayCrop.width,
                      displayCrop.height
                    );
                    
                    // Reset composite operation
                    ctx.globalCompositeOperation = 'source-over';
                    
                    context.fillStrokeShape(shape);
                  }}
                  listening={false}
                />
              </Layer>

              {/* Crop UI Layer - Border and corner handles */}
              <Layer x={STAGE_PADDING} y={STAGE_PADDING}>
                {/* Crop border */}
                <Rect
                  x={displayCrop.x}
                  y={displayCrop.y}
                  width={displayCrop.width}
                  height={displayCrop.height}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  listening={false}
                />
                
                {/* Rule of thirds grid */}
                {[1, 2].map((i) => (
                  <Group key={`grid-${i}`}>
                    {/* Vertical lines */}
                    <Rect
                      x={displayCrop.x + (displayCrop.width * i) / 3}
                      y={displayCrop.y}
                      width={1}
                      height={displayCrop.height}
                      fill="rgba(255, 255, 255, 0.3)"
                      listening={false}
                    />
                    {/* Horizontal lines */}
                    <Rect
                      x={displayCrop.x}
                      y={displayCrop.y + (displayCrop.height * i) / 3}
                      width={displayCrop.width}
                      height={1}
                      fill="rgba(255, 255, 255, 0.3)"
                      listening={false}
                    />
                  </Group>
                ))}
                
                {/* Corner handles */}
                {[
                  { x: displayCrop.x, y: displayCrop.y, cursor: 'nw-resize' },
                  { x: displayCrop.x + displayCrop.width, y: displayCrop.y, cursor: 'ne-resize' },
                  { x: displayCrop.x, y: displayCrop.y + displayCrop.height, cursor: 'sw-resize' },
                  { x: displayCrop.x + displayCrop.width, y: displayCrop.y + displayCrop.height, cursor: 'se-resize' },
                ].map((handle, i) => (
                  <Rect
                    key={`handle-${i}`}
                    x={handle.x - 6}
                    y={handle.y - 6}
                    width={12}
                    height={12}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={1}
                    listening={false}
                  />
                ))}
              </Layer>
            </Stage>
          )}
        </div>
      </div>
    </div>
  );
}
