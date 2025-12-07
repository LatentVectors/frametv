"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { useSidebar, STORAGE_KEYS } from "@/contexts/SidebarContext";
import { ImageThumbnail } from "./ImageThumbnail";
import { Loader2 } from "lucide-react";
import { sourceImagesApi } from "@/lib/api/database";

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
    usageFilter,
    tagFilter,
    setCurrentPage,
    addImages,
    setHasMore,
    setIsLoading,
    openImageModal,
  } = useSidebar();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  // Debounce scroll position save - only save when scrolling stops
  const scrollSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollTop = useRef(0);
  // Store initial scroll position to restore on mount (captured once)
  const initialScrollPosition = useRef<number | null>(scrollPosition > 0 ? scrollPosition : null);
  
  // Use refs to track values needed by scroll handler to avoid recreating it
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  hasMoreRef.current = hasMore;
  isLoadingRef.current = isLoading;

  // Gap between images
  const gridGap = 12;
  
  // Calculate number of columns that can fit based on container width
  // Subtract padding (12px on each side = 24px total)
  const availableWidth = containerWidth - 24;
  const columnsCount = Math.max(1, Math.floor((availableWidth + gridGap) / (thumbnailSize + gridGap)));

  // Store refs for loadMoreImages dependencies to keep callback stable
  const directoryPathRef = useRef(directoryPath);
  const currentPageRef = useRef(currentPage);
  const sortOrderRef = useRef(sortOrder);
  const usageFilterRef = useRef(usageFilter);
  const tagFilterRef = useRef(tagFilter);
  directoryPathRef.current = directoryPath;
  currentPageRef.current = currentPage;
  sortOrderRef.current = sortOrder;
  usageFilterRef.current = usageFilter;
  tagFilterRef.current = tagFilter;

  /**
   * Load next page of images from database API
   * Uses refs to avoid recreating this callback
   */
  const loadMoreImages = useCallback(async () => {
    if (!directoryPathRef.current || loadingRef.current || !hasMoreRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const usedFilter = usageFilterRef.current === "all" ? undefined : usageFilterRef.current === "used";
      const tagsFilter = tagFilterRef.current.length > 0 ? tagFilterRef.current.join(",") : undefined;
      
      const result = await sourceImagesApi.list({
        album: directoryPathRef.current,
        page: currentPageRef.current + 1,
        limit: 100,
        sortOrder: sortOrderRef.current,
        sortBy: "date_taken",
        used: usedFilter,
        tags: tagsFilter,
      });

      if (result.items.length > 0) {
        addImages(result.items);
        setCurrentPage(result.page);
        setHasMore(result.page < result.pages);
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
  }, [addImages, setCurrentPage, setHasMore, setIsLoading]);

  /**
   * Handle scroll event for infinite scrolling and position tracking
   * Uses refs for values to keep this callback completely stable
   * Saves to localStorage directly to avoid triggering React re-renders
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const scrollTopValue = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Store scroll position locally
    lastScrollTop.current = scrollTopValue;

    // Debounce: save directly to localStorage when scrolling stops (bypasses React state)
    if (scrollSaveTimeout.current) {
      clearTimeout(scrollSaveTimeout.current);
    }
    scrollSaveTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.SCROLL_POSITION, JSON.stringify(lastScrollTop.current));
      } catch (e) {
        // Ignore localStorage errors
      }
      scrollSaveTimeout.current = null;
    }, 300);

    // Load more when user scrolls to within 500px of the bottom (using refs)
    if (
      hasMoreRef.current &&
      !isLoadingRef.current &&
      scrollHeight - scrollTopValue - clientHeight < 500
    ) {
      loadMoreImages();
    }
  }, [loadMoreImages]);

  /**
   * Set up scroll event listener once (handler is now stable)
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  /**
   * Restore scroll position once on initial mount when images are first available
   * Uses a flag to ensure it only runs once ever
   */
  const hasRestoredRef = useRef(false);
  
  useEffect(() => {
    // Only restore once, and only if we have a position to restore and images
    if (hasRestoredRef.current) return;
    if (initialScrollPosition.current === null) return;
    if (images.length === 0) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;

    // Mark as restored immediately to prevent any future attempts
    hasRestoredRef.current = true;
    const positionToRestore = initialScrollPosition.current;
    initialScrollPosition.current = null;

    // Restore immediately - no delay to avoid racing with user scrolling
    container.scrollTop = positionToRestore;
  }, [images.length]);

  /**
   * Cleanup debounce timeout on unmount and save final position
   */
  useEffect(() => {
    return () => {
      if (scrollSaveTimeout.current) {
        clearTimeout(scrollSaveTimeout.current);
      }
      // Save final scroll position to localStorage on unmount
      if (lastScrollTop.current > 0) {
        try {
          localStorage.setItem(STORAGE_KEYS.SCROLL_POSITION, JSON.stringify(lastScrollTop.current));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    };
  }, []);

  return (
    <div 
      ref={scrollContainerRef} 
      className="h-full overflow-y-auto scrollbar-hover"
      style={{ 
        overflowAnchor: "none",
        overscrollBehavior: "contain",
      }}
    >
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
              key={image.id} 
              image={image} 
              size={thumbnailSize}
              onOpenModal={openImageModal}
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
