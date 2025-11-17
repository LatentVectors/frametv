"use client";

import React, { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarErrorBoundary } from "./ErrorBoundary";
import { AlbumSelector } from "./AlbumSelector";
import { ResizeHandle } from "./ResizeHandle";
import { ImageGrid } from "./ImageGrid";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronUp, SlidersHorizontal } from "lucide-react";

interface ImageSidebarProps {
  width: number;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
}

function SidebarHeader() {
  const { directoryPath, clearDirectory, thumbnailSize, setThumbnailSize } = useSidebar();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeoutState] =
    useState<NodeJS.Timeout | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("sidebar_header_collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
    } catch (error) {
      console.error("Error loading sidebar header collapsed state:", error);
    }
  }, []);

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sidebar_header_collapsed", isCollapsed.toString());
    } catch (error) {
      console.error("Error persisting sidebar header collapsed state:", error);
    }
  }, [isCollapsed]);

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

  const handleThumbnailSizeChange = (value: number[]) => {
    setThumbnailSize(value[0]);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="sticky top-0 bg-white z-10">
      {isCollapsed ? (
        // Collapsed header - minimal icon only
        <div className="absolute top-2 right-9 z-20">
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-8 w-8 p-0 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4 text-gray-600" />
            </Button>
            {/* Tooltip on hover */}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Show Controls
            </div>
          </div>
        </div>
      ) : (
        // Expanded header - full view
        <div className="p-4 space-y-4 border-b border-gray-200">
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
          
          {/* Thumbnail Size Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                Thumbnail Size
              </label>
              <span className="text-xs text-gray-500">{thumbnailSize}px</span>
            </div>
            <Slider
              value={[thumbnailSize]}
              onValueChange={handleThumbnailSizeChange}
              min={80}
              max={300}
              step={10}
              className="w-full"
            />
          </div>

          {/* Collapse button */}
          <div className="flex items-center justify-center pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronUp className="h-4 w-4" />
              <span className="text-xs">Hide Controls</span>
            </Button>
          </div>
        </div>
      )}
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
