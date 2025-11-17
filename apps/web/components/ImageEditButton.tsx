'use client';

import { CSSProperties } from 'react';
import { ImageAssignment } from '@/types';
import { Settings } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ImageEditMenu } from './ImageEditMenu';

interface ImageEditButtonProps {
  assignment: ImageAssignment;
  onUpdate: (updates: Partial<ImageAssignment>) => void;
  style?: React.CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  visible?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ImageEditButton({
  assignment,
  onUpdate,
  style,
  onMouseEnter,
  onMouseLeave,
  visible = false,
  onOpenChange,
}: ImageEditButtonProps) {
  const containerStyle: CSSProperties = {
    ...style,
    pointerEvents: visible ? "auto" : "none",
  };

  return (
    <div
      className={`absolute transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={containerStyle}
      onClick={(e) => {
        // Prevent click from propagating to canvas
        e.stopPropagation();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Popover onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Settings className="h-4 w-4 text-gray-700" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <ImageEditMenu assignment={assignment} onUpdate={onUpdate} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

