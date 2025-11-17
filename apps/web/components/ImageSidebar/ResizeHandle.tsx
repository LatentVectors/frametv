'use client';

import React from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

/**
 * ResizeHandle Component
 * Thin vertical drag handle on the right edge of the sidebar
 * Allows users to resize the sidebar by dragging
 */
export function ResizeHandle({ onMouseDown, isResizing }: ResizeHandleProps) {
  return (
    <div
      className={`absolute top-0 right-0 bottom-0 w-2 cursor-col-resize z-20 hover:bg-gray-300 transition-colors ${
        isResizing ? 'bg-gray-400' : 'bg-transparent'
      }`}
      onMouseDown={onMouseDown}
      style={{
        cursor: 'col-resize',
      }}
    />
  );
}

