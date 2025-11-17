'use client';

import { useState } from 'react';
import { ImageAssignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { FlipHorizontal, RotateCcw, Eye, EyeOff, Sun, ChevronDown, ChevronUp } from 'lucide-react';

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
    <circle cx="8" cy="8" r="6" fill="#ec4899" />
    <path d="M8 2 A 6 6 0 0 1 8 14 Z" fill="#10b981" />
  </svg>
);

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

  const filtersEnabled = assignment?.filtersEnabled ?? true;
  const brightnessEnabled = assignment?.brightnessEnabled ?? true;
  const contrastEnabled = assignment?.contrastEnabled ?? true;
  const saturationEnabled = assignment?.saturationEnabled ?? true;
  const hueEnabled = assignment?.hueEnabled ?? true;
  const temperatureEnabled = assignment?.temperatureEnabled ?? true;
  const tintEnabled = assignment?.tintEnabled ?? true;

  const handleGlobalReset = () => {
    onUpdate({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      temperature: 0,
      tint: 0,
      mirrorX: false,
    });
  };

  const handleGlobalToggle = () => {
    onUpdate({ filtersEnabled: !filtersEnabled });
  };

  const hasAdjustments = assignment ? (brightness !== 0 || contrast !== 0 || saturation !== 0 || hue !== 0 || temperature !== 0 || tint !== 0 || mirrorX) : false;

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
              {/* Column 1: Mirror */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium w-24 flex-shrink-0">Mirror</label>
                  <Button
                    variant={mirrorX ? "default" : "outline"}
                    size="sm"
                    onClick={() => onUpdate({ mirrorX: !mirrorX })}
                    disabled={disabled}
                    className="h-7"
                  >
                    <FlipHorizontal className="h-3.5 w-3.5 mr-2" />
                    Flip Horizontal
                  </Button>
                </div>
              </div>

              {/* Column 2: Brightness, Contrast, Saturation */}
              <div className="space-y-3">
                <SliderControl
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

                <SliderControl
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

                <SliderControl
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
                <SliderControl
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

                <SliderControl
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

                <SliderControl
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

interface SliderControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  enabled: boolean;
  globalEnabled: boolean;
  min: number;
  max: number;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  onToggle: () => void;
  onReset: () => void;
}

function SliderControl({
  label,
  icon,
  value,
  enabled,
  globalEnabled,
  min,
  max,
  disabled = false,
  onValueChange,
  onToggle,
  onReset,
}: SliderControlProps) {
  const isActive = globalEnabled && enabled && !disabled;
  const hasValue = value !== 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onValueChange(newValue);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (isNaN(newValue)) {
      onValueChange(0);
    } else {
      onValueChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  return (
    <div className={`flex items-center gap-2 ${!isActive ? 'opacity-50' : ''}`}>
      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" title={label}>
        {icon}
      </div>
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onValueChange(newValue)}
        min={min}
        max={max}
        step={1}
        className="flex-1"
        disabled={!isActive}
      />
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        min={min}
        max={max}
        className="w-14 h-7 text-xs text-center"
        disabled={!isActive}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={disabled}
        className="h-7 w-7 p-0 flex-shrink-0"
        title={enabled ? `Disable ${label}` : `Enable ${label}`}
      >
        {enabled ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        disabled={disabled || !hasValue}
        className="h-7 w-7 p-0 flex-shrink-0"
        title={`Reset ${label}`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

