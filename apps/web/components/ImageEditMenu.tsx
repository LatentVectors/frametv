'use client';

import { ImageAssignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { FlipHorizontal, RotateCcw } from 'lucide-react';

interface ImageEditMenuProps {
  assignment: ImageAssignment;
  onUpdate: (updates: Partial<ImageAssignment>) => void;
}

export function ImageEditMenu({ assignment, onUpdate }: ImageEditMenuProps) {
  const brightness = assignment.brightness ?? 0;
  const contrast = assignment.contrast ?? 0;
  const saturation = assignment.saturation ?? 0;
  const mirrorX = assignment.mirrorX ?? false;

  const handleReset = () => {
    onUpdate({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      mirrorX: false,
    });
  };

  const hasAdjustments = brightness !== 0 || contrast !== 0 || saturation !== 0 || mirrorX;

  return (
    <div className="w-64 p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Edit Image</h3>
        {hasAdjustments && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Mirror Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Mirror</label>
        <Button
          variant={mirrorX ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ mirrorX: !mirrorX })}
          className="w-full"
        >
          <FlipHorizontal className="h-4 w-4 mr-2" />
          Flip Horizontal
        </Button>
      </div>

      {/* Brightness Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Brightness</label>
          <span className="text-xs text-muted-foreground">{brightness}</span>
        </div>
        <Slider
          value={[brightness]}
          onValueChange={([value]) => onUpdate({ brightness: value })}
          min={-100}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      {/* Contrast Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Contrast</label>
          <span className="text-xs text-muted-foreground">{contrast}</span>
        </div>
        <Slider
          value={[contrast]}
          onValueChange={([value]) => onUpdate({ contrast: value })}
          min={-100}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      {/* Saturation Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Saturation</label>
          <span className="text-xs text-muted-foreground">{saturation}</span>
        </div>
        <Slider
          value={[saturation]}
          onValueChange={([value]) => onUpdate({ saturation: value })}
          min={-100}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  );
}

