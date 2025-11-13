'use client';

import { Rect } from 'react-konva';
import { Slot as SlotType } from '@/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/config';
import { memo, useMemo } from 'react';

interface SlotProps {
  slot: SlotType;
  scaleX: number;
  scaleY: number;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e?: any) => void;
}

function Slot({
  slot,
  scaleX,
  scaleY,
  isHovered = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: SlotProps) {
  // Convert percentage-based coordinates to pixel coordinates
  const x = useMemo(() => (slot.x / 100) * CANVAS_WIDTH * scaleX, [slot.x, scaleX]);
  const y = useMemo(() => (slot.y / 100) * CANVAS_HEIGHT * scaleY, [slot.y, scaleY]);
  const width = useMemo(() => (slot.width / 100) * CANVAS_WIDTH * scaleX, [slot.width, scaleX]);
  const height = useMemo(() => (slot.height / 100) * CANVAS_HEIGHT * scaleY, [slot.height, scaleY]);

  // Determine border color based on hover state
  const strokeColor = useMemo(() => isHovered ? '#3b82f6' : '#9ca3af', [isHovered]);
  const strokeWidth = useMemo(() => isHovered ? 2 : 1, [isHovered]);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      dash={[5, 5]} // Dashed border
      fill="transparent"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onTap={onClick}
    />
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(Slot);

