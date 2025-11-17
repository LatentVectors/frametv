"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ImageData, useSidebar } from "@/contexts/SidebarContext";

interface ImageModalProps {
  image: ImageData;
  onClose: () => void;
}

/**
 * ImageModal Component
 * Displays a full-resolution image in a modal overlay with zoom and pan capabilities
 * Closes on backdrop click or ESC key
 * Allows navigation between images with arrow buttons and keyboard
 */
export function ImageModal({ image, onClose }: ImageModalProps) {
  const { images, openImageModal } = useSidebar();
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  const ZOOM_STEP = 0.3;

  // Find current image index
  const currentIndex = images.findIndex((img) => img.path === image.path);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < images.length - 1;

  useEffect(() => {
    // Build the URL for the full-resolution image
    const url = `/api/gallery/image?path=${encodeURIComponent(image.path)}`;
    setImageUrl(url);
    setIsLoading(true);
    setImageError(false);
    // Reset zoom and position when image changes
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [image.path]);

  const navigateToPrevious = useCallback(() => {
    if (hasPrevious) {
      const prevImage = images[currentIndex - 1];
      openImageModal(prevImage);
    }
  }, [hasPrevious, images, currentIndex, openImageModal]);

  const navigateToNext = useCallback(() => {
    if (hasNext) {
      const nextImage = images[currentIndex + 1];
      openImageModal(nextImage);
    }
  }, [hasNext, images, currentIndex, openImageModal]);

  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateToNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, navigateToPrevious, navigateToNext]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not the image
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - ZOOM_STEP, MIN_SCALE);
    setScale(newScale);
    // Reset position if zooming back to fit
    if (newScale === MIN_SCALE) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleResetZoom = () => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!imageRef.current || !containerRef.current) return;

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));

    if (newScale !== scale) {
      // Zoom towards cursor position
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate the point under the mouse in image coordinates
      const imageX = (mouseX - position.x - rect.width / 2) / scale;
      const imageY = (mouseY - position.y - rect.height / 2) / scale;

      // Calculate new position to keep the same point under the mouse
      const newX = mouseX - rect.width / 2 - imageX * newScale;
      const newY = mouseY - rect.height / 2 - imageY * newScale;

      setScale(newScale);
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      } else {
        setPosition({ x: newX, y: newY });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale > MIN_SCALE && imageRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 group"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close modal"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Zoom controls */}
      {!isLoading && !imageError && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={handleResetZoom}
            disabled={scale === MIN_SCALE}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reset zoom"
          >
            <Maximize2 className="h-5 w-5 text-white" />
          </button>
        </div>
      )}

      {/* Zoom level indicator */}
      {!isLoading && !imageError && scale > MIN_SCALE && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Previous image button */}
      {!isLoading && !imageError && hasPrevious && (
        <button
          onClick={navigateToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </button>
      )}

      {/* Next image button */}
      {!isLoading && !imageError && hasNext && (
        <button
          onClick={navigateToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Next image"
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </button>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor:
            scale > MIN_SCALE ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {isLoading && (
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}

        {imageError && !isLoading && (
          <div className="text-white text-center">
            <p className="text-lg mb-2">Failed to load image</p>
            <p className="text-sm text-gray-400">{image.filename}</p>
          </div>
        )}

        {!imageError && (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={image.filename}
              className={`max-w-[90vw] max-h-[90vh] object-contain select-none ${
                isLoading ? "hidden" : "block"
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>
        )}

        {/* Filename overlay */}
        {!isLoading && !imageError && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm p-3 text-center pointer-events-none">
            {image.filename}
          </div>
        )}
      </div>
    </div>
  );
}
