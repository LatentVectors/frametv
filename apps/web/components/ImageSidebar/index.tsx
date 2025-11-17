"use client";

import React, { useState, useEffect } from "react";
import {
  useSidebar,
  STORAGE_KEYS,
  loadFromLocalStorage,
} from "@/contexts/SidebarContext";
import { SidebarErrorBoundary } from "./ErrorBoundary";
import { AlbumSelector } from "./AlbumSelector";
import { ResizeHandle } from "./ResizeHandle";
import { ImageGrid } from "./ImageGrid";
import { ImageModal } from "@/components/ImageModal";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronUp, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";

interface ImageSidebarProps {
  width: number;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
}

function SidebarHeader() {
  const { 
    directoryPath, 
    clearDirectory, 
    thumbnailSize, 
    setThumbnailSize, 
    sortOrder, 
    setSortOrder,
    setImages,
    setHasMore,
    setCurrentPage,
    setIsLoading,
    setScrollPosition,
  } = useSidebar();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeoutState] =
    useState<NodeJS.Timeout | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    loadFromLocalStorage(STORAGE_KEYS.HEADER_COLLAPSED, false)
  );

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.HEADER_COLLAPSED,
        JSON.stringify(isCollapsed)
      );
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

  const toggleSortOrder = async () => {
    const newSortOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newSortOrder);
    
    // Reload images with new sort order
    if (directoryPath) {
      setIsLoading(true);
      try {
        const response = await fetch("/api/albums/browse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            albumName: directoryPath,
            page: 1,
            limit: 100,
            sortOrder: newSortOrder,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to reload images");
        }

        const data = await response.json();

        if (data.success && data.images) {
          setImages(data.images);
          setHasMore(data.hasMore);
          setCurrentPage(data.page);
          setScrollPosition(0); // Reset scroll to top
        }
      } catch (error) {
        console.error("Error reloading images with new sort order:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="sticky top-0 bg-background z-10">
      {isCollapsed ? (
        // Collapsed header - minimal icon only
        <div className="absolute top-2 right-9 z-20">
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm hover:bg-secondary shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
            {/* Tooltip on hover */}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Show Controls
            </div>
          </div>
        </div>
      ) : (
        // Expanded header - full view
        <div className="p-4 space-y-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 relative">
              <div
                className="text-sm font-medium text-foreground truncate cursor-default"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {displayName}
              </div>
              {showTooltip && directoryPath.length > 30 && (
                <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg z-20 whitespace-nowrap">
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
              <label className="text-xs font-medium text-foreground">
                Thumbnail Size
              </label>
              <span className="text-xs text-muted-foreground">{thumbnailSize}px</span>
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

          {/* Sort Order Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Sort Order
              </label>
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSortOrder}
                  className="h-7 px-2 flex items-center gap-1.5"
                >
                  {sortOrder === "desc" ? (
                    <ArrowDownWideNarrow className="h-4 w-4" />
                  ) : (
                    <ArrowUpWideNarrow className="h-4 w-4" />
                  )}
                  <span className="text-xs">
                    {sortOrder === "desc" ? "Newest First" : "Oldest First"}
                  </span>
                </Button>
              </div>
            </div>
          </div>

          {/* Collapse button */}
          <div className="flex items-center justify-center pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="w-full flex items-center justify-center gap-2"
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
  const {
    directoryPath,
    images,
    isLoading,
    sortOrder,
    setImages,
    setHasMore,
    setCurrentPage,
    setIsLoading,
    clearDirectory,
  } = useSidebar();
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Auto-fetch images if we have a restored album but no images
  useEffect(() => {
    const fetchAlbumImages = async () => {
      if (
        !directoryPath ||
        hasAttemptedLoad ||
        isLoading ||
        images.length > 0
      ) {
        return;
      }

      setHasAttemptedLoad(true);
      setIsLoading(true);

      try {
        const response = await fetch("/api/albums/browse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            albumName: directoryPath,
            page: 1,
            limit: 100,
            sortOrder,
          }),
        });

        if (!response.ok) {
          // If album not found, clear the invalid selection
          if (response.status === 404) {
            console.warn(`Saved album '${directoryPath}' no longer exists. Clearing selection.`);
            clearDirectory();
            return;
          }
          throw new Error("Failed to load album images");
        }

        const data = await response.json();

        if (data.success && data.images) {
          setImages(data.images);
          setHasMore(data.hasMore);
          setCurrentPage(data.page);
        } else {
          // If API returns unsuccessful, clear the directory
          console.warn(`Failed to load album '${directoryPath}':`, data.error);
          clearDirectory();
        }
      } catch (error) {
        console.error("Error auto-loading album images:", error);
        // On any error, clear the invalid directory selection
        clearDirectory();
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbumImages();
  }, [
    directoryPath,
    images.length,
    isLoading,
    hasAttemptedLoad,
    sortOrder,
    setImages,
    setHasMore,
    setCurrentPage,
    setIsLoading,
    clearDirectory,
  ]);

  // Reset load attempt when directory changes
  useEffect(() => {
    setHasAttemptedLoad(false);
  }, [directoryPath]);

  // Show album selector if no album is selected
  if (!directoryPath) {
    return <AlbumSelector />;
  }

  // Show loading state if directory is selected but no images yet
  if (images.length === 0 && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <p className="text-sm text-muted-foreground text-center">Loading images...</p>
      </div>
    );
  }

  // Show empty state if directory has no images
  if (images.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <p className="text-sm text-muted-foreground text-center">
          This folder is empty or contains no JPEG/PNG images.
        </p>
      </div>
    );
  }

  // Render ImageGrid with chronological grid layout
  return <ImageGrid containerWidth={width} />;
}

export function ImageSidebar({
  width,
  isResizing,
  onResizeStart,
}: ImageSidebarProps) {
  const { selectedImageForModal, closeImageModal } = useSidebar();

  return (
    <SidebarErrorBoundary>
      <div
        className="h-full bg-background border-r border-border flex flex-col overflow-hidden relative"
        style={{ width: `${width}px` }}
      >
        <SidebarHeader />
        <div className="flex-1 overflow-hidden h-0">
          <SidebarContent width={width} />
        </div>
        <ResizeHandle onMouseDown={onResizeStart} isResizing={isResizing} />
      </div>

      {/* Image Modal - rendered outside sidebar for full-screen overlay */}
      {selectedImageForModal && (
        <ImageModal image={selectedImageForModal} onClose={closeImageModal} />
      )}
    </SidebarErrorBoundary>
  );
}
