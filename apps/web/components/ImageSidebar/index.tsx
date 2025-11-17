"use client";

import React, { useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarErrorBoundary } from "./ErrorBoundary";
import { AlbumSelector } from "./AlbumSelector";
import { ResizeHandle } from "./ResizeHandle";
import { ImageGrid } from "./ImageGrid";
import { Button } from "@/components/ui/button";

interface ImageSidebarProps {
  width: number;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
}

function SidebarHeader() {
  const { directoryPath, clearDirectory } = useSidebar();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeoutState] =
    useState<NodeJS.Timeout | null>(null);

  if (!directoryPath) {
    return null;
  }

  // Truncate folder name if longer than 30 characters
  const displayName =
    directoryPath.length > 30
      ? `${directoryPath.substring(0, 27)}...`
      : directoryPath;

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setShowTooltip(true);
    }, 700); // 700ms delay as per spec
    setTooltipTimeoutState(timeout);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeoutState(null);
    }
    setShowTooltip(false);
  };

  const handleChangeAlbum = () => {
    clearDirectory();
  };

  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 relative">
          <div
            className="text-sm font-medium text-gray-900 truncate cursor-default"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {displayName}
          </div>
          {showTooltip && directoryPath.length > 30 && (
            <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-20 whitespace-nowrap">
              {directoryPath}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleChangeAlbum}
          className="ml-3 flex-shrink-0"
        >
          Change Album
        </Button>
      </div>
    </div>
  );
}

function SidebarContent({ width }: { width: number }) {
  const { directoryPath, images, isLoading } = useSidebar();

  // Show album selector if no album is selected
  if (!directoryPath) {
    return <AlbumSelector />;
  }

  // Show loading state if directory is selected but no images yet
  if (images.length === 0 && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <p className="text-sm text-gray-600 text-center">Loading images...</p>
      </div>
    );
  }

  // Show empty state if directory has no images
  if (images.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <p className="text-sm text-gray-600 text-center">
          This folder is empty or contains no JPEG/PNG images.
        </p>
      </div>
    );
  }

  // Render ImageGrid with masonry layout
  return <ImageGrid containerWidth={width} />;
}

export function ImageSidebar({
  width,
  isResizing,
  onResizeStart,
}: ImageSidebarProps) {
  return (
    <SidebarErrorBoundary>
      <div
        className="h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden relative"
        style={{ width: `${width}px` }}
      >
        <SidebarHeader />
        <div className="flex-1 overflow-hidden h-0">
          <SidebarContent width={width} />
        </div>
        <ResizeHandle onMouseDown={onResizeStart} isResizing={isResizing} />
      </div>
    </SidebarErrorBoundary>
  );
}
