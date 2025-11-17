"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { useMasonry, usePositioner, useResizeObserver } from "masonic";
import { useSidebar, ImageData } from "@/contexts/SidebarContext";
import { ImageThumbnail } from "./ImageThumbnail";
import { Loader2 } from "lucide-react";

interface ImageGridProps {
  containerWidth: number;
}

/**
 * ImageGrid Component
 * Uses masonic for virtual scrolling and masonry layout
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
    setCurrentPage,
    addImages,
    setHasMore,
    setIsLoading,
    setScrollPosition,
  } = useSidebar();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const masonryContainerRef = useRef<HTMLDivElement>(null);
  const scrollActivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const loadingRef = useRef(false);
  const isRestoringScroll = useRef(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0
  );
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [isVirtualScrolling, setIsVirtualScrolling] = useState(false);

  // Column width for masonry layout (150px as per spec)
  const columnWidth = 150;
  // Gap between images (12px as per spec)
  const columnGutter = 12;
  
  // Calculate number of columns that can fit based on container width
  // Subtract padding (12px on each side = 24px total)
  const availableWidth = containerWidth - 24;
  const gridWidth = Math.max(1, availableWidth);
  const positioner = usePositioner({
    width: gridWidth,
    columnWidth,
    columnGutter,
  });
  const resizeObserver = useResizeObserver(positioner);

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

    setVirtualScrollTop(scrollTopValue);
    setIsVirtualScrolling(true);
    if (scrollActivityTimeoutRef.current) {
      clearTimeout(scrollActivityTimeoutRef.current);
    }
    scrollActivityTimeoutRef.current = setTimeout(() => {
      setIsVirtualScrolling(false);
    }, 120);

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
    // Initialize scroll state for masonry virtualization
    handleScroll();
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  /**
   * Track the viewport height of the scroll container for virtualization
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setViewportHeight(container.clientHeight);
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateHeight());
      observer.observe(container);
      return () => observer.disconnect();
    } else {
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }
  }, []);

  /**
   * Clean up scroll activity timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (scrollActivityTimeoutRef.current) {
        clearTimeout(scrollActivityTimeoutRef.current);
      }
    };
  }, []);

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
        setVirtualScrollTop(scrollPosition);
        // Reset flag after a short delay to allow normal scroll tracking
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 100);
      } else {
        setVirtualScrollTop(container.scrollTop);
      }
    });
  }, [images.length, scrollPosition]);

  /**
   * Render function for each masonry item
   */
  const renderItem = useCallback(({ data }: { data: ImageData }) => {
    return <ImageThumbnail image={data} width={columnWidth} />;
  }, []);

  const masonry = useMasonry({
    containerRef: masonryContainerRef,
    className: "w-full",
    items: images,
    positioner,
    resizeObserver,
    scrollTop: virtualScrollTop,
    height: Math.max(1, viewportHeight),
    isScrolling: isVirtualScrolling,
    overscanBy: 2,
    render: renderItem,
  });

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto">
      <div className="p-3 space-y-4">
        {masonry}

        {/* Loading indicator at bottom */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-600">
              Loading more images...
            </span>
          </div>
        )}

        {/* End of list indicator */}
        {!hasMore && images.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-500">
              No more images to load
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
