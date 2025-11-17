'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Configuration for the resizable sidebar
 */
interface UseResizableSidebarConfig {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number) => void;
}

/**
 * Return value from useResizableSidebar hook
 */
interface UseResizableSidebarReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Custom hook for resizable sidebar functionality
 * Handles mouse events for drag-to-resize behavior
 * 
 * @param config - Configuration options
 * @returns Object with width, isResizing state, and handleMouseDown function
 */
export function useResizableSidebar({
  minWidth = 200,
  maxWidth = 600,
  defaultWidth = 300,
  onWidthChange,
}: UseResizableSidebarConfig = {}): UseResizableSidebarReturn {
  
  // State for current width and resizing status
  const [width, setWidth] = useState<number>(defaultWidth);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  
  // Ref to store the starting X position when dragging starts
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(defaultWidth);

  /**
   * Handle mouse move during resize
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    // Calculate the delta from start position
    const deltaX = e.clientX - startXRef.current;
    
    // Calculate new width
    let newWidth = startWidthRef.current + deltaX;
    
    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    setWidth(newWidth);
    
    // Call the optional callback
    if (onWidthChange) {
      onWidthChange(newWidth);
    }
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  /**
   * Handle mouse up to end resizing
   */
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
    }
  }, [isResizing]);

  /**
   * Handle mouse down on resize handle to start resizing
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  /**
   * Add and remove event listeners for mouse move and mouse up
   */
  useEffect(() => {
    if (isResizing) {
      // Add event listeners when resizing starts
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Add cursor style to body to show resize cursor everywhere during drag
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      // Remove cursor style when resizing ends
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}

