'use client';

import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';

export interface AdjustmentSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  enabled: boolean;
  globalEnabled: boolean; // Master filter toggle
  min: number;
  max: number;
  step?: number;
  disabled?: boolean; // For preset override (grays out slider)
  disabledTooltip?: string; // Tooltip when disabled by preset
  onValueChange: (value: number) => void;
  onToggle: () => void; // Eye icon - toggles enable/disable
  onReset: () => void; // Reset icon - resets to 0
}

export function AdjustmentSlider({
  label,
  icon,
  value,
  enabled,
  globalEnabled,
  min,
  max,
  step = 1,
  disabled = false,
  disabledTooltip,
  onValueChange,
  onToggle,
  onReset,
}: AdjustmentSliderProps) {
  // Slider is active only when globally enabled, individually enabled, and not disabled by preset
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

  // Wrapper component for tooltip support when disabled by preset
  const SliderWrapper = ({ children }: { children: React.ReactNode }) => {
    if (disabled && disabledTooltip) {
      return (
        <div className="relative group flex-1">
          {children}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded text-xs text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
            {disabledTooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
          </div>
        </div>
      );
    }
    return <div className="flex-1">{children}</div>;
  };

  return (
    <div className={`flex items-center gap-1.5 ${!isActive ? 'opacity-50' : ''}`}>
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" title={label}>
        {icon}
      </div>
      <SliderWrapper>
        <Slider
          value={[value]}
          onValueChange={([newValue]) => onValueChange(newValue)}
          min={min}
          max={max}
          step={step}
          className="flex-1"
          disabled={!isActive}
        />
      </SliderWrapper>
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        min={min}
        max={max}
        className="w-12 h-6 text-xs text-center px-1"
        disabled={!isActive}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={disabled}
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
        disabled={disabled || !hasValue}
        className="h-6 w-6 p-0 flex-shrink-0"
        title={`Reset ${label}`}
      >
        <RotateCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}

