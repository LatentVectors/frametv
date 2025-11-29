'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ImageAssignment, Slot } from '@/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FlipHorizontal, 
  RotateCcw, 
  Sun, 
  Palette,
} from 'lucide-react';

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

interface SlotEditorModalProps {
  assignment: ImageAssignment;
  slot: Slot;
  onUpdate: (updates: Partial<ImageAssignment>) => void;
  onClose: () => void;
}

interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

type FilterPreset = 'none' | 'blackWhite' | 'sepia' | 'monochrome';

// MONOCHROME COLORS
const MONOCHROME_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
  '#8b5cf6', '#ec4899', '#78716c', '#1f2937', '#f5f5f4', '#6366f1'
];

export function SlotEditorModal({ assignment, slot, onUpdate, onClose }: SlotEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  
  // Local state for all editable values
  const [localState, setLocalState] = useState({
    brightness: assignment.brightness ?? 0,
    contrast: assignment.contrast ?? 0,
    saturation: assignment.saturation ?? 0,
    hue: assignment.hue ?? 0,
    temperature: assignment.temperature ?? 0,
    tint: assignment.tint ?? 0,
    mirrorX: assignment.mirrorX ?? false,
    rotation: assignment.rotation ?? 0,
    monochromeColor: assignment.monochromeColor,
    cropX: assignment.cropX ?? 0,
    cropY: assignment.cropY ?? 0,
    cropWidth: assignment.cropWidth ?? 100,
    cropHeight: assignment.cropHeight ?? 100,
  });

  // Canvas interaction state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropDragType, setCropDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });
  const [cropStartState, setCropStartState] = useState<CropState | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });

  // Calculate slot aspect ratio
  const slotAspectRatio = slot.width / slot.height;

  // Determine active preset based on current values
  // Presets are exclusive and only active if values match exactly
  const getActivePreset = useCallback((): FilterPreset => {
    // Check for Monochrome preset (has monochromeColor and saturation is 0)
    if (localState.monochromeColor && localState.saturation === 0 && 
        localState.temperature === 0 && localState.brightness === 0) {
      return 'monochrome';
    }
    // Check for Black & White preset (exact values: saturation -100, no monochromeColor, other values reset)
    if (localState.saturation === -100 && !localState.monochromeColor && 
        localState.temperature === 0 && localState.brightness === 0) {
      return 'blackWhite';
    }
    // Check for Sepia preset (exact values: temperature 30, saturation -50, brightness 10, no monochromeColor)
    if (localState.temperature === 30 && localState.saturation === -50 && 
        localState.brightness === 10 && !localState.monochromeColor) {
      return 'sepia';
    }
    return 'none';
  }, [localState.monochromeColor, localState.saturation, localState.temperature, localState.brightness]);

  const [activePreset, setActivePreset] = useState<FilterPreset>(getActivePreset());

  // Update active preset when local state changes
  useEffect(() => {
    setActivePreset(getActivePreset());
  }, [getActivePreset]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      // Initialize crop to fill slot if not set
      if (assignment.cropWidth === undefined) {
        const imgAspect = img.width / img.height;
        let cropW, cropH;
        
        if (imgAspect > slotAspectRatio) {
          cropH = 100;
          cropW = (slotAspectRatio / imgAspect) * 100;
        } else {
          cropW = 100;
          cropH = (imgAspect / slotAspectRatio) * 100;
        }
        
        setLocalState(prev => ({
          ...prev,
          cropX: (100 - cropW) / 2,
          cropY: (100 - cropH) / 2,
          cropWidth: cropW,
          cropHeight: cropH,
        }));
      }
    };
    img.src = assignment.imageUrl;
  }, [assignment.imageUrl, assignment.cropWidth, slotAspectRatio]);

  // Update canvas size based on container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxWidth = rect.width - 40;
      const maxHeight = rect.height - 40;
      
      let width = maxWidth;
      let height = width / slotAspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * slotAspectRatio;
      }
      
      setCanvasSize({ width, height });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [slotAspectRatio]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const baseScale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const scale = baseScale * zoom;
    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;
    const imgX = (canvas.width - imgWidth) / 2 + pan.x;
    const imgY = (canvas.height - imgHeight) / 2 + pan.y;
    
    ctx.save();
    
    // Apply rotation around center
    if (localState.rotation !== 0) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((localState.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }
    
    // Apply mirror
    if (localState.mirrorX) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(image, imgX, imgY, imgWidth, imgHeight);
    ctx.restore();
    
    // Draw crop overlay (always visible)
    const cropX = (localState.cropX / 100) * imgWidth + imgX;
    const cropY = (localState.cropY / 100) * imgHeight + imgY;
    const cropW = (localState.cropWidth / 100) * imgWidth;
    const cropH = (localState.cropHeight / 100) * imgHeight;
    
    // Semi-transparent overlay outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, cropY);
      ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - (cropY + cropH));
      ctx.fillRect(0, cropY, cropX, cropH);
      ctx.fillRect(cropX + cropW, cropY, canvas.width - (cropX + cropW), cropH);
      
    // Crop border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropX, cropY, cropW, cropH);
      
    // Rule of thirds grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cropX + (cropW * i) / 3, cropY);
      ctx.lineTo(cropX + (cropW * i) / 3, cropY + cropH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropX, cropY + (cropH * i) / 3);
      ctx.lineTo(cropX + cropW, cropY + (cropH * i) / 3);
      ctx.stroke();
    }
    
    // Corner handles
    const handleSize = 12;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + cropW - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + cropW - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);
  }, [image, zoom, pan, localState, canvasSize]);

  // Mouse handlers for crop/pan
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
      const baseScale = Math.max(canvas.width / image.width, canvas.height / image.height);
      const scale = baseScale * zoom;
      const imgWidth = image.width * scale;
      const imgHeight = image.height * scale;
      const imgX = (canvas.width - imgWidth) / 2 + pan.x;
      const imgY = (canvas.height - imgHeight) / 2 + pan.y;
      
    const cropX = (localState.cropX / 100) * imgWidth + imgX;
    const cropY = (localState.cropY / 100) * imgHeight + imgY;
    const cropW = (localState.cropWidth / 100) * imgWidth;
    const cropH = (localState.cropHeight / 100) * imgHeight;
      
      const handleSize = 15;
      
    // Check corner handles first
      if (Math.abs(x - cropX) < handleSize && Math.abs(y - cropY) < handleSize) {
        setCropDragType('nw');
      } else if (Math.abs(x - (cropX + cropW)) < handleSize && Math.abs(y - cropY) < handleSize) {
        setCropDragType('ne');
      } else if (Math.abs(x - cropX) < handleSize && Math.abs(y - (cropY + cropH)) < handleSize) {
        setCropDragType('sw');
      } else if (Math.abs(x - (cropX + cropW)) < handleSize && Math.abs(y - (cropY + cropH)) < handleSize) {
        setCropDragType('se');
      } else if (x > cropX && x < cropX + cropW && y > cropY && y < cropY + cropH) {
        setCropDragType('move');
    } else {
      // Pan mode
      setIsDragging(true);
      setDragStart({ x: x - pan.x, y: y - pan.y });
      return;
      }
      
        setCropDragStart({ x, y });
    setCropStartState({
      x: localState.cropX,
      y: localState.cropY,
      width: localState.cropWidth,
      height: localState.cropHeight,
    });
  }, [image, zoom, pan, localState]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      setPan({ x: x - dragStart.x, y: y - dragStart.y });
      return;
    }
    
    if (!cropDragType || !cropStartState) return;
    
      const baseScale = Math.max(canvas.width / image.width, canvas.height / image.height);
      const scale = baseScale * zoom;
      const imgWidth = image.width * scale;
      const imgHeight = image.height * scale;
      
      const dx = ((x - cropDragStart.x) / imgWidth) * 100;
      const dy = ((y - cropDragStart.y) / imgHeight) * 100;
      
      if (cropDragType === 'move') {
        let newX = cropStartState.x + dx;
        let newY = cropStartState.y + dy;
      newX = Math.max(0, Math.min(100 - localState.cropWidth, newX));
      newY = Math.max(0, Math.min(100 - localState.cropHeight, newY));
      setLocalState(prev => ({ ...prev, cropX: newX, cropY: newY }));
      } else {
        let newCrop = { ...cropStartState };
        const aspectDelta = Math.max(Math.abs(dx), Math.abs(dy) * slotAspectRatio);
        const signX = cropDragType.includes('e') ? 1 : -1;
        const dw = signX * (dx > 0 ? aspectDelta : -aspectDelta);
        const dh = dw / slotAspectRatio;
        
        if (cropDragType === 'nw') {
          newCrop.x = cropStartState.x - dw;
          newCrop.y = cropStartState.y - dh;
          newCrop.width = cropStartState.width + dw;
          newCrop.height = cropStartState.height + dh;
        } else if (cropDragType === 'ne') {
          newCrop.y = cropStartState.y - dh;
          newCrop.width = cropStartState.width + dw;
          newCrop.height = cropStartState.height + dh;
        } else if (cropDragType === 'sw') {
          newCrop.x = cropStartState.x - dw;
          newCrop.width = cropStartState.width + dw;
          newCrop.height = cropStartState.height + dh;
        } else if (cropDragType === 'se') {
          newCrop.width = cropStartState.width + dw;
          newCrop.height = cropStartState.height + dh;
        }
        
        newCrop.width = Math.max(10, Math.min(100, newCrop.width));
        newCrop.height = newCrop.width / slotAspectRatio;
        newCrop.x = Math.max(0, Math.min(100 - newCrop.width, newCrop.x));
        newCrop.y = Math.max(0, Math.min(100 - newCrop.height, newCrop.y));
        
      setLocalState(prev => ({
        ...prev,
        cropX: newCrop.x,
        cropY: newCrop.y,
        cropWidth: newCrop.width,
        cropHeight: newCrop.height,
      }));
    }
  }, [isDragging, dragStart, cropDragType, cropDragStart, cropStartState, zoom, image, localState.cropWidth, localState.cropHeight, slotAspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setCropDragType(null);
    setCropStartState(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  // Preset handlers - exclusive toggle behavior
  const handleBlackWhitePreset = () => {
    if (activePreset === 'blackWhite') {
      // If already active, clear the preset
      handleClearPreset();
    } else {
      // Activate Black & White: sets saturation to -100, clears other preset values
      setLocalState(prev => ({
        ...prev,
        saturation: -100,
        temperature: 0,
        brightness: 0,
        monochromeColor: undefined,
      }));
    }
  };

  const handleSepiaPreset = () => {
    if (activePreset === 'sepia') {
      // If already active, clear the preset
      handleClearPreset();
    } else {
      // Activate Sepia: sets temperature, saturation, brightness
      setLocalState(prev => ({
        ...prev,
        temperature: 30,
        saturation: -50,
        brightness: 10,
        monochromeColor: undefined,
      }));
    }
  };

  const handleMonochromePreset = (color: string) => {
    if (activePreset === 'monochrome' && localState.monochromeColor === color) {
      // If same color is already active, clear the preset
      handleClearPreset();
    } else {
      // Activate Monochrome with the chosen color, reset saturation and other preset values
      setLocalState(prev => ({
        ...prev,
        saturation: 0,
        temperature: 0,
        brightness: 0,
        monochromeColor: color,
      }));
    }
  };

  const handleClearPreset = () => {
    setLocalState(prev => ({
      ...prev,
      saturation: 0,
      temperature: 0,
      brightness: 0,
      monochromeColor: undefined,
    }));
  };

  // Reset all - clears all adjustments, rotation, mirror, and active preset
  const handleResetAll = () => {
    setLocalState(prev => ({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      temperature: 0,
      tint: 0,
      mirrorX: false,
      rotation: 0,
      monochromeColor: undefined,
      cropX: prev.cropX, // Keep crop
      cropY: prev.cropY,
      cropWidth: prev.cropWidth,
      cropHeight: prev.cropHeight,
    }));
  };

  // Save
  const handleSave = () => {
    onUpdate({
      brightness: localState.brightness,
      contrast: localState.contrast,
      saturation: localState.saturation,
      hue: localState.hue,
      temperature: localState.temperature,
      tint: localState.tint,
      mirrorX: localState.mirrorX,
      rotation: localState.rotation,
      monochromeColor: localState.monochromeColor,
      cropX: localState.cropX,
      cropY: localState.cropY,
      cropWidth: localState.cropWidth,
      cropHeight: localState.cropHeight,
    });
    onClose();
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Check if there are any changes from original state
  const hasChanges = 
    localState.brightness !== (assignment.brightness ?? 0) ||
    localState.contrast !== (assignment.contrast ?? 0) ||
    localState.saturation !== (assignment.saturation ?? 0) ||
    localState.hue !== (assignment.hue ?? 0) ||
    localState.temperature !== (assignment.temperature ?? 0) ||
    localState.tint !== (assignment.tint ?? 0) ||
    localState.mirrorX !== (assignment.mirrorX ?? false) ||
    localState.rotation !== (assignment.rotation ?? 0) ||
    localState.monochromeColor !== assignment.monochromeColor ||
    localState.cropX !== (assignment.cropX ?? 0) ||
    localState.cropY !== (assignment.cropY ?? 0) ||
    localState.cropWidth !== (assignment.cropWidth ?? 100) ||
    localState.cropHeight !== (assignment.cropHeight ?? 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Minimal Header - Cancel (left) and Save (right) only */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Fixed width ~320px */}
        <div className="w-80 bg-background/80 backdrop-blur-sm border-r border-border/50 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Mirror/Flip - Icon-only button at top */}
            <div>
              <Button
                variant={localState.mirrorX ? "default" : "outline"}
                size="sm"
                onClick={() => setLocalState(prev => ({ ...prev, mirrorX: !prev.mirrorX }))}
                className="w-10 h-10 p-0"
                title="Flip Horizontal"
              >
                <FlipHorizontal className="h-5 w-5" />
              </Button>
            </div>

            {/* Filter Presets - Exclusive toggle behavior */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Filter Presets</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activePreset === 'blackWhite' ? "default" : "outline"}
                  size="sm"
                  onClick={handleBlackWhitePreset}
                  className="h-8 text-xs"
                >
                  Black & White
                </Button>
                <Button
                  variant={activePreset === 'sepia' ? "default" : "outline"}
                  size="sm"
                  onClick={handleSepiaPreset}
                  className="h-8 text-xs"
                >
                  Sepia
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant={activePreset === 'monochrome' ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (activePreset === 'monochrome') {
                        handleClearPreset();
                      } else {
                        handleMonochromePreset(localState.monochromeColor || '#3b82f6');
                      }
                    }}
                    className="h-8 text-xs"
                  >
                    Monochrome
                  </Button>
                  {/* Always-visible color swatch for Monochrome */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-opacity ${
                          activePreset === 'monochrome' 
                            ? 'border-foreground opacity-100' 
                            : 'border-muted opacity-50 hover:opacity-75'
                        }`}
                        style={{ backgroundColor: localState.monochromeColor || '#3b82f6' }}
                        title="Select Monochrome Color"
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
                              onClick={() => handleMonochromePreset(color)}
                            />
                          ))}
                        </div>
                        <Input
                          type="color"
                          value={localState.monochromeColor || '#3b82f6'}
                          onChange={(e) => handleMonochromePreset(e.target.value)}
                          className="h-8 w-full cursor-pointer"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
          </div>
          
            {/* Detailed Adjustments - Brightness, Contrast, Saturation, Hue, Temperature, Tint */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Adjustments</label>
              
              <AdjustmentSlider
                label="Brightness"
                icon={<Sun className="h-4 w-4" />}
                value={localState.brightness}
                onChange={(v) => setLocalState(prev => ({ ...prev, brightness: v }))}
                min={-100}
                max={100}
              />
              
              <AdjustmentSlider
                label="Contrast"
                icon={<ContrastIcon />}
                value={localState.contrast}
                onChange={(v) => setLocalState(prev => ({ ...prev, contrast: v }))}
                min={-100}
                max={100}
              />
              
              <AdjustmentSlider
                label="Saturation"
                icon={<SaturationIcon />}
                value={localState.saturation}
                onChange={(v) => setLocalState(prev => ({ ...prev, saturation: v }))}
                min={-100}
                max={100}
              />
              
              <AdjustmentSlider
                label="Hue"
                icon={<HueIcon />}
                value={localState.hue}
                onChange={(v) => setLocalState(prev => ({ ...prev, hue: v }))}
                min={-180}
                max={180}
              />
              
              <AdjustmentSlider
                label="Temperature"
                icon={<TemperatureIcon />}
                value={localState.temperature}
                onChange={(v) => setLocalState(prev => ({ ...prev, temperature: v }))}
                min={-100}
                max={100}
              />
              
              <AdjustmentSlider
                label="Tint"
                icon={<TintIcon />}
                value={localState.tint}
                onChange={(v) => setLocalState(prev => ({ ...prev, tint: v }))}
                min={-100}
                max={100}
              />
            </div>

            {/* Rotation - Slider + numeric input (range -180.0 to 180.0, step 0.1) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rotation</label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <RotationIcon />
                </div>
                <Slider
                  value={[localState.rotation]}
                  onValueChange={([v]) => setLocalState(prev => ({ ...prev, rotation: v }))}
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
                    setLocalState(prev => ({ ...prev, rotation: Math.max(-180, Math.min(180, v)) }));
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
                onClick={handleResetAll}
                disabled={!hasChanges}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>
          </div>
        </div>

        {/* Main Area - Canvas filling remaining space */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-5 bg-black/50"
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="cursor-move shadow-2xl rounded"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>
      </div>
    </div>
  );
}

// Adjustment slider component
interface AdjustmentSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}

function AdjustmentSlider({ label, icon, value, onChange, min, max }: AdjustmentSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" title={label}>
        {icon}
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="flex-1"
      />
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const newVal = parseInt(e.target.value, 10);
          if (!isNaN(newVal)) onChange(Math.max(min, Math.min(max, newVal)));
        }}
        min={min}
        max={max}
        className="w-14 h-7 text-xs text-center px-1"
      />
    </div>
  );
}
