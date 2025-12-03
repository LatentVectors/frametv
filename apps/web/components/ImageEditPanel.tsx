'use client';

import { useState, useCallback, useMemo } from 'react';
import { ImageAssignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlipHorizontal, RotateCcw, Eye, EyeOff, Sun, ChevronDown, ChevronUp, Palette, Contrast } from 'lucide-react';
import { AdjustmentSlider } from '@/components/AdjustmentSlider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Custom adjustment icons matching Photoshop's design
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
    {/* Green on left (negative), Magenta on right (positive) - matches Photoshop convention */}
    <circle cx="8" cy="8" r="6" fill="#10b981" />
    <path d="M8 2 A 6 6 0 0 1 8 14 Z" fill="#ec4899" />
  </svg>
);

// Sepia icon - warm brown tone
const SepiaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#8B4513" opacity="0.8" />
    <rect x="4" y="4" width="8" height="8" rx="1" fill="#D2691E" />
  </svg>
);

// Monochrome colors
const MONOCHROME_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
  '#8b5cf6', '#ec4899', '#78716c', '#1f2937', '#f5f5f4', '#6366f1'
];

type FilterPreset = 'none' | 'blackWhite' | 'sepia' | 'monochrome';

interface ImageEditPanelProps {
  assignment: ImageAssignment | null;
  onUpdate: (updates: Partial<ImageAssignment>) => void;
  disabled?: boolean;
}

export function ImageEditPanel({ assignment, onUpdate, disabled = false }: ImageEditPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const brightness = assignment?.brightness ?? 0;
  const contrast = assignment?.contrast ?? 0;
  const saturation = assignment?.saturation ?? 0;
  const hue = assignment?.hue ?? 0;
  const temperature = assignment?.temperature ?? 0;
  const tint = assignment?.tint ?? 0;
  const mirrorX = assignment?.mirrorX ?? false;
  const monochromeColor = assignment?.monochromeColor;

  const filtersEnabled = assignment?.filtersEnabled ?? true;
  const brightnessEnabled = assignment?.brightnessEnabled ?? true;
  const contrastEnabled = assignment?.contrastEnabled ?? true;
  const saturationEnabled = assignment?.saturationEnabled ?? true;
  const hueEnabled = assignment?.hueEnabled ?? true;
  const temperatureEnabled = assignment?.temperatureEnabled ?? true;
  const tintEnabled = assignment?.tintEnabled ?? true;

  // Determine active preset - presets are mutually exclusive
  const activePreset = useMemo((): FilterPreset => {
    if (monochromeColor) return 'monochrome';
    // Check for exact Black & White values
    if (saturation === -100 && temperature === 0 && brightness === 0 && !monochromeColor) {
      return 'blackWhite';
    }
    // Check for exact Sepia values
    if (temperature === 30 && saturation === -50 && brightness === 10 && !monochromeColor) {
      return 'sepia';
    }
    return 'none';
  }, [monochromeColor, saturation, temperature, brightness]);

  const handleGlobalReset = () => {
    onUpdate({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      temperature: 0,
      tint: 0,
      mirrorX: false,
      monochromeColor: undefined,
    });
  };

  // Filter preset handlers - each preset is exclusive
  const handleBlackWhitePreset = useCallback(() => {
    if (activePreset === 'blackWhite') {
      // If already active, clear the preset
      onUpdate({
        saturation: 0,
        monochromeColor: undefined,
      });
    } else {
      // Activate Black & White: sets saturation to -100, clears other preset values
      onUpdate({
        saturation: -100,
        temperature: 0,
        brightness: 0,
        monochromeColor: undefined,
      });
    }
  }, [activePreset, onUpdate]);

  const handleSepiaPreset = useCallback(() => {
    if (activePreset === 'sepia') {
      // If already active, clear the preset
      onUpdate({
        temperature: 0,
        saturation: 0,
        brightness: 0,
        monochromeColor: undefined,
      });
    } else {
      // Activate Sepia: sets temperature, saturation, brightness
      onUpdate({
        temperature: 30,
        saturation: -50,
        brightness: 10,
        monochromeColor: undefined,
      });
    }
  }, [activePreset, onUpdate]);

  const handleMonochromePreset = useCallback((color: string) => {
    // Activate Monochrome with the chosen color, reset saturation
    onUpdate({
      monochromeColor: color,
      saturation: 0,
      temperature: 0,
      brightness: 0,
    });
  }, [onUpdate]);

  const handleClearMonochrome = useCallback(() => {
    onUpdate({ monochromeColor: undefined });
  }, [onUpdate]);

  const handlePresetChange = useCallback((value: string) => {
    if (value === 'none') {
      // Clear all presets
      onUpdate({
        saturation: 0,
        temperature: 0,
        brightness: 0,
        monochromeColor: undefined,
      });
    } else if (value === 'blackWhite') {
      // Activate Black & White: sets saturation to -100, clears other preset values
      onUpdate({
        saturation: -100,
        temperature: 0,
        brightness: 0,
        monochromeColor: undefined,
      });
    } else if (value === 'sepia') {
      // Activate Sepia: sets temperature, saturation, brightness
      onUpdate({
        temperature: 30,
        saturation: -50,
        brightness: 10,
        monochromeColor: undefined,
      });
    } else if (value === 'monochrome') {
      // Activate Monochrome with the current color or default
      handleMonochromePreset(monochromeColor || '#3b82f6');
    }
  }, [onUpdate, monochromeColor, handleMonochromePreset]);

  const handleGlobalToggle = () => {
    onUpdate({ filtersEnabled: !filtersEnabled });
  };

  const hasAdjustments = assignment ? (
    brightness !== 0 || contrast !== 0 || saturation !== 0 || 
    hue !== 0 || temperature !== 0 || tint !== 0 || mirrorX || monochromeColor
  ) : false;

  return (
    <div className="w-full border-t bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header - Always visible */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <h3 className="font-semibold text-lg">Image Adjustments</h3>
            {!assignment && (
              <span className="text-sm text-muted-foreground">
                (Select an image slot to edit)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGlobalToggle}
              disabled={disabled}
              className="h-8"
              title={filtersEnabled ? "Disable all filters" : "Enable all filters"}
            >
              {filtersEnabled ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Filters On
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2 text-muted-foreground" />
                  Filters Off
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGlobalReset}
              disabled={disabled || !hasAdjustments}
              className="h-8"
              title="Reset all"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>

        {/* Collapsible content */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 pb-6">
            {/* Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Mirror and Filter Presets */}
              <TooltipProvider>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24 flex-shrink-0">Transform</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={mirrorX ? "default" : "outline"}
                          size="icon"
                          onClick={() => onUpdate({ mirrorX: !mirrorX })}
                          disabled={disabled}
                          className="h-7 w-7"
                        >
                          <FlipHorizontal className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Flip Horizontal</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Filter Presets */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24 flex-shrink-0">Preset</label>
                    <Select
                      value={activePreset}
                      onValueChange={handlePresetChange}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-7 w-auto min-w-[140px]">
                        <SelectValue placeholder="Preset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="blackWhite">Black & White</SelectItem>
                        <SelectItem value="sepia">Sepia</SelectItem>
                        <SelectItem value="monochrome">Monochrome</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Color swatch only appears when monochrome is selected */}
                    {activePreset === 'monochrome' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="w-7 h-7 rounded border-2 border-foreground flex items-center justify-center"
                            style={{ backgroundColor: monochromeColor || '#3b82f6' }}
                            disabled={disabled}
                          >
                            <Palette className="h-3.5 w-3.5 text-white drop-shadow" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium">Select Monochrome Color</label>
                            <div className="grid grid-cols-6 gap-1">
                              {MONOCHROME_COLORS.map((color) => (
                                <button
                                  key={color}
                                  className={`w-6 h-6 rounded border-2 ${
                                    monochromeColor === color ? 'border-foreground' : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleMonochromePreset(color)}
                                />
                              ))}
                            </div>
                            <Input
                              type="color"
                              value={monochromeColor || '#3b82f6'}
                              onChange={(e) => handleMonochromePreset(e.target.value)}
                              className="h-8 w-full cursor-pointer"
                            />
                            {monochromeColor && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearMonochrome}
                                className="w-full h-7 text-xs"
                              >
                                Clear Monochrome
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </TooltipProvider>

              {/* Column 2: Brightness, Contrast, Saturation */}
              <div className="space-y-3">
                <AdjustmentSlider
                  label="Brightness"
                  icon={<Sun className="h-4 w-4" />}
                  value={brightness}
                  enabled={brightnessEnabled}
                  globalEnabled={filtersEnabled}
                  min={-100}
                  max={100}
                  disabled={disabled}
                  onValueChange={(value) => onUpdate({ brightness: value })}
                  onToggle={() => onUpdate({ brightnessEnabled: !brightnessEnabled })}
                  onReset={() => onUpdate({ brightness: 0 })}
                />

                <AdjustmentSlider
                  label="Contrast"
                  icon={<ContrastIcon />}
                  value={contrast}
                  enabled={contrastEnabled}
                  globalEnabled={filtersEnabled}
                  min={-100}
                  max={100}
                  disabled={disabled}
                  onValueChange={(value) => onUpdate({ contrast: value })}
                  onToggle={() => onUpdate({ contrastEnabled: !contrastEnabled })}
                  onReset={() => onUpdate({ contrast: 0 })}
                />

                <AdjustmentSlider
                  label="Saturation"
                  icon={<SaturationIcon />}
                  value={saturation}
                  enabled={saturationEnabled}
                  globalEnabled={filtersEnabled}
                  min={-100}
                  max={100}
                  disabled={disabled}
                  onValueChange={(value) => onUpdate({ saturation: value })}
                  onToggle={() => onUpdate({ saturationEnabled: !saturationEnabled })}
                  onReset={() => onUpdate({ saturation: 0 })}
                />
              </div>

              {/* Column 3: Hue, Temperature, Tint */}
              <div className="space-y-3">
                <AdjustmentSlider
                  label="Hue"
                  icon={<HueIcon />}
                  value={hue}
                  enabled={hueEnabled}
                  globalEnabled={filtersEnabled}
                  min={-180}
                  max={180}
                  disabled={disabled}
                  onValueChange={(value) => onUpdate({ hue: value })}
                  onToggle={() => onUpdate({ hueEnabled: !hueEnabled })}
                  onReset={() => onUpdate({ hue: 0 })}
                />

                <AdjustmentSlider
                  label="Temperature"
                  icon={<TemperatureIcon />}
                  value={temperature}
                  enabled={temperatureEnabled}
                  globalEnabled={filtersEnabled}
                  min={-100}
                  max={100}
                  disabled={disabled}
                  onValueChange={(value) => onUpdate({ temperature: value })}
                  onToggle={() => onUpdate({ temperatureEnabled: !temperatureEnabled })}
                  onReset={() => onUpdate({ temperature: 0 })}
                />

                <AdjustmentSlider
                  label="Tint"
                  icon={<TintIcon />}
                  value={tint}
                  enabled={tintEnabled}
                  globalEnabled={filtersEnabled}
                  min={-100}
                  max={100}
                  disabled={disabled}
                  onValueChange={(value) => onUpdate({ tint: value })}
                  onToggle={() => onUpdate({ tintEnabled: !tintEnabled })}
                  onReset={() => onUpdate({ tint: 0 })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

