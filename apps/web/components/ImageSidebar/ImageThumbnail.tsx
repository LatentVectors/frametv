"use client";

import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { ImageData, useSidebar } from "@/contexts/SidebarContext";

interface ImageThumbnailProps {
  image: ImageData;
  size: number;
}

/**
 * ImageThumbnail Component
 * Displays a draggable thumbnail for an image in a square container
 * Shows placeholder icon if thumbnail fails to load
 * Preserves aspect ratio using object-contain
 */
export function ImageThumbnail({ image, size }: ImageThumbnailProps) {
  const { openImageModal } = useSidebar();
  const [imageError, setImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Set the file path as drag data
    e.dataTransfer.setData("text/plain", image.path);
    e.dataTransfer.setData("image/sidebar", image.path); // Custom type to distinguish sidebar drags
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDoubleClick = () => {
    if (!imageError) {
      openImageModal(image);
    }
  };

  return (
    <div
      draggable={!imageError}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={handleDoubleClick}
      className={`relative rounded-lg overflow-hidden cursor-move border-2 border-transparent hover:border-primary transition-all bg-muted ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
      }}
    >
      {imageError ? (
        // Show placeholder icon if thumbnail fails to load
        <div
          className="flex items-center justify-center bg-muted w-full h-full"
        >
          <ImageOff className="w-12 h-12 text-muted-foreground" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={image.thumbnailDataUrl}
            alt={image.filename}
            className="max-w-full max-h-full object-contain rounded-md"
            onError={handleImageError}
            draggable={false} // Prevent default image drag behavior
            style={{ userSelect: "none" }}
          />
        </div>
      )}

      {/* Filename tooltip on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 dark:bg-black/80 text-white text-xs p-1 truncate opacity-0 hover:opacity-100 transition-opacity">
        {image.filename}
      </div>
    </div>
  );
}
