'use client';

import { ImageAssignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { FlipHorizontal, RotateCcw, Eye, EyeOff, Sun } from 'lucide-react';

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
      <linearGradient id="satGradientMenu" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#808080" />
        <stop offset="50%" stopColor="#ff0000" />
        <stop offset="100%" stopColor="#00ff00" />
      </linearGradient>
    </defs>
    <rect x="3" y="6" width="10" height="4" rx="2" fill="url(#satGradientMenu)" />
  </svg>
);

const HueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hueGradientMenu">
        <stop offset="0%" stopColor="#ff0000" />
        <stop offset="16.66%" stopColor="#ffff00" />
        <stop offset="33.33%" stopColor="#00ff00" />
        <stop offset="50%" stopColor="#00ffff" />
        <stop offset="66.66%" stopColor="#0000ff" />
        <stop offset="83.33%" stopColor="#ff00ff" />
        <stop offset="100%" stopColor="#ff0000" />
      </linearGradient>
    </defs>
    <circle cx="8" cy="8" r="6" fill="none" stroke="url(#hueGradientMenu)" strokeWidth="3" />
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

interface ImageEditMenuProps {
  assignment: ImageAssignment;
  onUpdate: (updates: Partial<ImageAssignment>) => void;
}

export function ImageEditMenu({ assignment, onUpdate }: ImageEditMenuProps) {
  const brightness = assignment.brightness ?? 0;
  const contrast = assignment.contrast ?? 0;
  const saturation = assignment.saturation ?? 0;
  const hue = assignment.hue ?? 0;
  const temperature = assignment.temperature ?? 0;
  const tint = assignment.tint ?? 0;
  const mirrorX = assignment.mirrorX ?? false;

  const filtersEnabled = assignment.filtersEnabled ?? true;
  const brightnessEnabled = assignment.brightnessEnabled ?? true;
  const contrastEnabled = assignment.contrastEnabled ?? true;
  const saturationEnabled = assignment.saturationEnabled ?? true;
  const hueEnabled = assignment.hueEnabled ?? true;
  const temperatureEnabled = assignment.temperatureEnabled ?? true;
  const tintEnabled = assignment.tintEnabled ?? true;

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

  const hasAdjustments = brightness !== 0 || contrast !== 0 || saturation !== 0 || hue !== 0 || temperature !== 0 || tint !== 0 || mirrorX;

  return (
    <div className="w-80 p-4 space-y-2.5 max-h-[600px] overflow-y-auto">
      {/* Header with global controls */}
      <div className="flex items-center justify-between mb-2 sticky top-0 bg-background z-10 pb-2">
        <h3 className="font-semibold text-sm">Edit Image</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGlobalToggle}
            className="h-7 w-7 p-0"
            title={filtersEnabled ? "Disable all filters" : "Enable all filters"}
          >
            {filtersEnabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGlobalReset}
            disabled={!hasAdjustments}
            className="h-7 text-xs"
            title="Reset all"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Mirror Toggle */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium w-20 flex-shrink-0 text-xs">Mirror</label>
        <Button
          variant={mirrorX ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ mirrorX: !mirrorX })}
          className="h-6 flex-1"
        >
          <FlipHorizontal className="h-3 w-3 mr-2" />
          Flip Horizontal
        </Button>
      </div>

      {/* Brightness Slider */}
      <SliderControl
        label="Brightness"
        icon={<Sun className="h-3.5 w-3.5" />}
        value={brightness}
        enabled={brightnessEnabled}
        globalEnabled={filtersEnabled}
        min={-100}
        max={100}
        onValueChange={(value) => onUpdate({ brightness: value })}
        onToggle={() => onUpdate({ brightnessEnabled: !brightnessEnabled })}
        onReset={() => onUpdate({ brightness: 0 })}
      />

      {/* Contrast Slider */}
      <SliderControl
        label="Contrast"
        icon={<ContrastIcon />}
        value={contrast}
        enabled={contrastEnabled}
        globalEnabled={filtersEnabled}
        min={-100}
        max={100}
        onValueChange={(value) => onUpdate({ contrast: value })}
        onToggle={() => onUpdate({ contrastEnabled: !contrastEnabled })}
        onReset={() => onUpdate({ contrast: 0 })}
      />

      {/* Saturation Slider */}
      <SliderControl
        label="Saturation"
        icon={<SaturationIcon />}
        value={saturation}
        enabled={saturationEnabled}
        globalEnabled={filtersEnabled}
        min={-100}
        max={100}
        onValueChange={(value) => onUpdate({ saturation: value })}
        onToggle={() => onUpdate({ saturationEnabled: !saturationEnabled })}
        onReset={() => onUpdate({ saturation: 0 })}
      />

      {/* Hue Slider */}
      <SliderControl
        label="Hue"
        icon={<HueIcon />}
        value={hue}
        enabled={hueEnabled}
        globalEnabled={filtersEnabled}
        min={-180}
        max={180}
        onValueChange={(value) => onUpdate({ hue: value })}
        onToggle={() => onUpdate({ hueEnabled: !hueEnabled })}
        onReset={() => onUpdate({ hue: 0 })}
      />

      {/* Temperature Slider */}
      <SliderControl
        label="Temperature"
        icon={<TemperatureIcon />}
        value={temperature}
        enabled={temperatureEnabled}
        globalEnabled={filtersEnabled}
        min={-100}
        max={100}
        onValueChange={(value) => onUpdate({ temperature: value })}
        onToggle={() => onUpdate({ temperatureEnabled: !temperatureEnabled })}
        onReset={() => onUpdate({ temperature: 0 })}
      />

      {/* Tint Slider */}
      <SliderControl
        label="Tint"
        icon={<TintIcon />}
        value={tint}
        enabled={tintEnabled}
        globalEnabled={filtersEnabled}
        min={-100}
        max={100}
        onValueChange={(value) => onUpdate({ tint: value })}
        onToggle={() => onUpdate({ tintEnabled: !tintEnabled })}
        onReset={() => onUpdate({ tint: 0 })}
      />
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
  onValueChange,
  onToggle,
  onReset,
}: SliderControlProps) {
  const isActive = globalEnabled && enabled;
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
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" title={label}>
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
        className="w-12 h-6 text-xs text-center"
        disabled={!isActive}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-6 w-6 p-0 flex-shrink-0"
        title={enabled ? `Disable ${label}` : `Enable ${label}`}
      >
        {enabled ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        disabled={!hasValue}
        className="h-6 w-6 p-0 flex-shrink-0"
        title={`Reset ${label}`}
      >
        <RotateCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}
