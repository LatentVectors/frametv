"use client";

import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { ImageData, useSidebar } from "@/contexts/SidebarContext";

interface ImageThumbnailProps {
  image: ImageData;
  width: number;
}

/**
 * ImageThumbnail Component
 * Displays a draggable thumbnail for an image
 * Shows placeholder icon if thumbnail fails to load
 */
export function ImageThumbnail({ image, width }: ImageThumbnailProps) {
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
      className={`relative rounded-lg overflow-hidden cursor-move border-2 border-transparent hover:border-blue-400 transition-all ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      style={{ width: `${width}px` }}
    >
      {imageError ? (
        // Show placeholder icon if thumbnail fails to load
        <div
          className="flex items-center justify-center bg-gray-100 rounded-lg"
          style={{ width: `${width}px`, height: `${width}px` }}
        >
          <ImageOff className="w-12 h-12 text-gray-400" />
        </div>
      ) : (
        <img
          src={image.thumbnailDataUrl}
          alt={image.filename}
          className="w-full h-auto block"
          onError={handleImageError}
          draggable={false} // Prevent default image drag behavior
          style={{ userSelect: "none" }}
        />
      )}

      {/* Filename tooltip on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate opacity-0 hover:opacity-100 transition-opacity">
        {image.filename}
      </div>
    </div>
  );
}
