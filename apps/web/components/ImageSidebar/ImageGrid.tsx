"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { useSidebar, ImageData } from "@/contexts/SidebarContext";
import { ImageThumbnail } from "./ImageThumbnail";
import { Loader2 } from "lucide-react";

interface ImageGridProps {
  containerWidth: number;
}

/**
 * ImageGrid Component
 * Uses CSS grid for chronological layout
 * Implements infinite scroll to load more images
 */
export function ImageGrid({ containerWidth }: ImageGridProps) {
  const {
    images,
    directoryPath,
    hasMore,
    isLoading,
    currentPage,
    scrollPosition,
    thumbnailSize,
    sortOrder,
    setCurrentPage,
    addImages,
    setHasMore,
    setIsLoading,
    setScrollPosition,
  } = useSidebar();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollActivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const loadingRef = useRef(false);
  const isRestoringScroll = useRef(false);

  // Gap between images
  const gridGap = 12;
  
  // Calculate number of columns that can fit based on container width
  // Subtract padding (12px on each side = 24px total)
  const availableWidth = containerWidth - 24;
  const columnsCount = Math.max(1, Math.floor((availableWidth + gridGap) / (thumbnailSize + gridGap)));

  /**
   * Load next page of images from backend API
   */
  const loadMoreImages = useCallback(async () => {
    if (!directoryPath || loadingRef.current || !hasMore) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/albums/browse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          albumName: directoryPath, // directoryPath now contains album name
          page: currentPage + 1,
          limit: 100, // Load 100 images per page
          sortOrder,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load more images");
      }

      const data = await response.json();

      if (data.success && data.images && data.images.length > 0) {
        addImages(data.images);
        setCurrentPage(data.page);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more images:", error);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [
    directoryPath,
    hasMore,
    currentPage,
    sortOrder,
    addImages,
    setCurrentPage,
    setHasMore,
    setIsLoading,
  ]);

  /**
   * Handle scroll event for infinite scrolling and position tracking
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const scrollTopValue = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Store scroll position in context (only if not currently restoring)
    if (!isRestoringScroll.current) {
      setScrollPosition(scrollTopValue);
    }

    // Load more when user scrolls to within 500px of the bottom
    if (
      hasMore &&
      !isLoading &&
      scrollHeight - scrollTopValue - clientHeight < 500
    ) {
      loadMoreImages();
    }
  }, [hasMore, isLoading, loadMoreImages, setScrollPosition]);

  /**
   * Set up scroll event listener
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    // Initialize scroll state
    handleScroll();
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  /**
   * Restore scroll position when images are loaded
   * This ensures scroll position is maintained when switching templates
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || images.length === 0) return;

    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    requestAnimationFrame(() => {
      if (scrollPosition > 0) {
        isRestoringScroll.current = true;
        container.scrollTop = scrollPosition;
        // Reset flag after a short delay to allow normal scroll tracking
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 100);
      }
    });
  }, [images.length, scrollPosition]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto scrollbar-hover">
      <div className="p-3">
        {/* CSS Grid layout for chronological order */}
        <div 
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${columnsCount}, ${thumbnailSize}px)`,
          }}
        >
          {images.map((image) => (
            <ImageThumbnail 
              key={image.path} 
              image={image} 
              size={thumbnailSize} 
              sourceImageId={image.sourceImageId}
            />
          ))}
        </div>

        {/* Loading indicator at bottom */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading more images...
            </span>
          </div>
        )}

        {/* End of list indicator */}
        {!hasMore && images.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">
              No more images to load
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
