'use client';

import { Group, Circle } from 'react-konva';
import { useRef } from 'react';

interface SelectionHandlesProps {
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  slotX: number;
  slotY: number;
  slotWidth: number;
  slotHeight: number;
  originalImageWidth: number;
  originalImageHeight: number;
  currentScaleX: number;
  currentScaleY: number;
  currentX: number;
  currentY: number;
  canvasScaleX: number;
  canvasScaleY: number;
  slotCanvasX: number;
  slotCanvasY: number;
  slotCanvasWidth: number;
  slotCanvasHeight: number;
  onScaleUpdate?: (scaleX: number, scaleY: number) => void;
  onTransformUpdate?: (x: number, y: number) => void;
}

type HandleType = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';

export default function SelectionHandles({
  imageX,
  imageY,
  imageWidth,
  imageHeight,
  slotX,
  slotY,
  slotWidth,
  slotHeight,
  originalImageWidth,
  originalImageHeight,
  currentScaleX,
  currentScaleY,
  currentX,
  currentY,
  canvasScaleX,
  canvasScaleY,
  slotCanvasX,
  slotCanvasY,
  slotCanvasWidth,
  slotCanvasHeight,
  onScaleUpdate,
  onTransformUpdate,
}: SelectionHandlesProps) {
  const handleSize = 8;
  const handleRadius = handleSize / 2;
  const dragStartRef = useRef<{
    handleType: HandleType | null;
    startX: number;
    startY: number;
    startScaleX: number;
    startScaleY: number;
    startImageX: number;
    startImageY: number;
  }>({
    handleType: null,
    startX: 0,
    startY: 0,
    startScaleX: 0,
    startScaleY: 0,
    startImageX: 0,
    startImageY: 0,
  });

  /**
   * Calculate handle positions
   */
  const handles: Array<{ type: HandleType; x: number; y: number }> = [
    { type: 'top-left', x: imageX, y: imageY },
    { type: 'top-right', x: imageX + imageWidth, y: imageY },
    { type: 'bottom-left', x: imageX, y: imageY + imageHeight },
    { type: 'bottom-right', x: imageX + imageWidth, y: imageY + imageHeight },
    { type: 'top', x: imageX + imageWidth / 2, y: imageY },
    { type: 'bottom', x: imageX + imageWidth / 2, y: imageY + imageHeight },
    { type: 'left', x: imageX, y: imageY + imageHeight / 2 },
    { type: 'right', x: imageX + imageWidth, y: imageY + imageHeight / 2 },
  ];

  /**
   * Constrain scale to keep image within slot boundaries
   */
  const constrainScale = (
    newScaleX: number,
    newScaleY: number,
    newX: number,
    newY: number
  ): { scaleX: number; scaleY: number; x: number; y: number } => {
    const scaledWidth = originalImageWidth * newScaleX;
    const scaledHeight = originalImageHeight * newScaleY;

    // Calculate min/max scale based on slot size
    // Image must fit within slot, but can be smaller
    const maxScaleX = slotCanvasWidth / originalImageWidth;
    const maxScaleY = slotCanvasHeight / originalImageHeight;

    // Clamp scales
    let constrainedScaleX = Math.max(0.1, Math.min(newScaleX, maxScaleX));
    let constrainedScaleY = Math.max(0.1, Math.min(newScaleY, maxScaleY));

    // Recalculate dimensions with constrained scales
    const constrainedWidth = originalImageWidth * constrainedScaleX;
    const constrainedHeight = originalImageHeight * constrainedScaleY;

    // Constrain position to keep image within slot
    const minX = Math.min(0, slotCanvasWidth - constrainedWidth);
    const maxX = Math.max(0, slotCanvasWidth - constrainedWidth);
    const minY = Math.min(0, slotCanvasHeight - constrainedHeight);
    const maxY = Math.max(0, slotCanvasHeight - constrainedHeight);

    const constrainedX = Math.max(minX, Math.min(maxX, newX));
    const constrainedY = Math.max(minY, Math.min(maxY, newY));

    return {
      scaleX: constrainedScaleX,
      scaleY: constrainedScaleY,
      x: constrainedX,
      y: constrainedY,
    };
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (handleType: HandleType, e: any) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    dragStartRef.current = {
      handleType,
      startX: pointerPos.x,
      startY: pointerPos.y,
      startScaleX: currentScaleX,
      startScaleY: currentScaleY,
      startImageX: currentX,
      startImageY: currentY,
    };
  };

  /**
   * Handle drag move
   */
  const handleDragMove = (handleType: HandleType, e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos || !dragStartRef.current.handleType) return;

    // Convert pointer position to canvas coordinates
    const pointerCanvasX = pointerPos.x / canvasScaleX;
    const pointerCanvasY = pointerPos.y / canvasScaleY;

    // Calculate distance moved
    const deltaX = (pointerPos.x - dragStartRef.current.startX) / canvasScaleX;
    const deltaY = (pointerPos.y - dragStartRef.current.startY) / canvasScaleY;

    // Calculate new scale and position based on handle type
    let newScaleX = dragStartRef.current.startScaleX;
    let newScaleY = dragStartRef.current.startScaleY;
    let newX = dragStartRef.current.startImageX;
    let newY = dragStartRef.current.startImageY;

    const startImageCanvasX = slotCanvasX + dragStartRef.current.startImageX;
    const startImageCanvasY = slotCanvasY + dragStartRef.current.startImageY;
    const startScaledWidth = originalImageWidth * dragStartRef.current.startScaleX;
    const startScaledHeight = originalImageHeight * dragStartRef.current.startScaleY;

    if (handleType === 'top-left') {
      // Scale from top-left corner (proportional)
      const newWidth = startScaledWidth - deltaX;
      const newHeight = startScaledHeight - deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
      const newScaledWidth = originalImageWidth * scale;
      const newScaledHeight = originalImageHeight * scale;
      newX = dragStartRef.current.startImageX + (startScaledWidth - newScaledWidth);
      newY = dragStartRef.current.startImageY + (startScaledHeight - newScaledHeight);
    } else if (handleType === 'top-right') {
      // Scale from top-right corner (proportional)
      const newWidth = startScaledWidth + deltaX;
      const newHeight = startScaledHeight - deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
      const newScaledHeight = originalImageHeight * scale;
      newY = dragStartRef.current.startImageY + (startScaledHeight - newScaledHeight);
    } else if (handleType === 'bottom-left') {
      // Scale from bottom-left corner (proportional)
      const newWidth = startScaledWidth - deltaX;
      const newHeight = startScaledHeight + deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
      const newScaledWidth = originalImageWidth * scale;
      newX = dragStartRef.current.startImageX + (startScaledWidth - newScaledWidth);
    } else if (handleType === 'bottom-right') {
      // Scale from bottom-right corner (proportional)
      const newWidth = startScaledWidth + deltaX;
      const newHeight = startScaledHeight + deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
    } else if (handleType === 'top') {
      // Scale vertically from top edge
      const newHeight = startScaledHeight - deltaY;
      newScaleY = newHeight / originalImageHeight;
      newY = dragStartRef.current.startImageY + deltaY;
    } else if (handleType === 'bottom') {
      // Scale vertically from bottom edge
      const newHeight = startScaledHeight + deltaY;
      newScaleY = newHeight / originalImageHeight;
    } else if (handleType === 'left') {
      // Scale horizontally from left edge
      const newWidth = startScaledWidth - deltaX;
      newScaleX = newWidth / originalImageWidth;
      newX = dragStartRef.current.startImageX + deltaX;
    } else if (handleType === 'right') {
      // Scale horizontally from right edge
      const newWidth = startScaledWidth + deltaX;
      newScaleX = newWidth / originalImageWidth;
    }

    // Constrain scale and position
    const constrained = constrainScale(newScaleX, newScaleY, newX, newY);

    // Update visual position of handle during drag
    // The handle position will be recalculated on next render
    if (onScaleUpdate) {
      onScaleUpdate(constrained.scaleX, constrained.scaleY);
    }
    if (onTransformUpdate) {
      onTransformUpdate(constrained.x, constrained.y);
    }
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = (handleType: HandleType, e: any) => {
    if (!dragStartRef.current.handleType) return;

    // Final constraint check
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const deltaX = (pointerPos.x - dragStartRef.current.startX) / canvasScaleX;
    const deltaY = (pointerPos.y - dragStartRef.current.startY) / canvasScaleY;

    let newScaleX = dragStartRef.current.startScaleX;
    let newScaleY = dragStartRef.current.startScaleY;
    let newX = dragStartRef.current.startImageX;
    let newY = dragStartRef.current.startImageY;

    const startScaledWidth = originalImageWidth * dragStartRef.current.startScaleX;
    const startScaledHeight = originalImageHeight * dragStartRef.current.startScaleY;

    if (handleType === 'top-left') {
      const newWidth = startScaledWidth - deltaX;
      const newHeight = startScaledHeight - deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
      const newScaledWidth = originalImageWidth * scale;
      const newScaledHeight = originalImageHeight * scale;
      newX = dragStartRef.current.startImageX + (startScaledWidth - newScaledWidth);
      newY = dragStartRef.current.startImageY + (startScaledHeight - newScaledHeight);
    } else if (handleType === 'top-right') {
      const newWidth = startScaledWidth + deltaX;
      const newHeight = startScaledHeight - deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
      const newScaledHeight = originalImageHeight * scale;
      newY = dragStartRef.current.startImageY + (startScaledHeight - newScaledHeight);
    } else if (handleType === 'bottom-left') {
      const newWidth = startScaledWidth - deltaX;
      const newHeight = startScaledHeight + deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
      const newScaledWidth = originalImageWidth * scale;
      newX = dragStartRef.current.startImageX + (startScaledWidth - newScaledWidth);
    } else if (handleType === 'bottom-right') {
      const newWidth = startScaledWidth + deltaX;
      const newHeight = startScaledHeight + deltaY;
      const scaleFromWidth = newWidth / originalImageWidth;
      const scaleFromHeight = newHeight / originalImageHeight;
      const scale = Math.min(scaleFromWidth, scaleFromHeight);
      newScaleX = scale;
      newScaleY = scale;
    } else if (handleType === 'top') {
      const newHeight = startScaledHeight - deltaY;
      newScaleY = newHeight / originalImageHeight;
      newY = dragStartRef.current.startImageY + deltaY;
    } else if (handleType === 'bottom') {
      const newHeight = startScaledHeight + deltaY;
      newScaleY = newHeight / originalImageHeight;
    } else if (handleType === 'left') {
      const newWidth = startScaledWidth - deltaX;
      newScaleX = newWidth / originalImageWidth;
      newX = dragStartRef.current.startImageX + deltaX;
    } else if (handleType === 'right') {
      const newWidth = startScaledWidth + deltaX;
      newScaleX = newWidth / originalImageWidth;
    }

    const constrained = constrainScale(newScaleX, newScaleY, newX, newY);

    if (onScaleUpdate) {
      onScaleUpdate(constrained.scaleX, constrained.scaleY);
    }
    if (onTransformUpdate) {
      onTransformUpdate(constrained.x, constrained.y);
    }

    dragStartRef.current.handleType = null;
  };

  return (
    <Group>
      {handles.map((handle) => (
        <Circle
          key={handle.type}
          x={handle.x}
          y={handle.y}
          radius={handleRadius}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={1}
          draggable={true}
          onDragStart={(e) => handleDragStart(handle.type, e)}
          onDragMove={(e) => handleDragMove(handle.type, e)}
          onDragEnd={(e) => handleDragEnd(handle.type, e)}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              // Set cursor based on handle type
              if (handle.type.includes('top-left') || handle.type.includes('bottom-right')) {
                container.style.cursor = 'nwse-resize';
              } else if (handle.type.includes('top-right') || handle.type.includes('bottom-left')) {
                container.style.cursor = 'nesw-resize';
              } else if (handle.type === 'top' || handle.type === 'bottom') {
                container.style.cursor = 'ns-resize';
              } else {
                container.style.cursor = 'ew-resize';
              }
            }
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              container.style.cursor = 'default';
            }
          }}
        />
      ))}
    </Group>
  );
}

