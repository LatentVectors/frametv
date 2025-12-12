"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { SourceImageResponse, sourceImagesApi } from "@/lib/api/database";

/**
 * Image data structure from database API (SourceImageResponse)
 */
export type ImageData = SourceImageResponse;

/**
 * Usage filter options for sidebar
 */
export type UsageFilter = "all" | "used" | "unused";

/**
 * Sort order for images
 */
export type SortOrder = "desc" | "asc";

/**
 * Shape of the Sidebar Context
 */
interface SidebarContextType {
  // Directory state (now stores album name)
  directoryPath: string | null;

  // Images state
  images: ImageData[];

  // Sidebar dimensions
  sidebarWidth: number;

  // Thumbnail size
  thumbnailSize: number;

  // Sort order
  sortOrder: SortOrder;

  // Usage filter
  usageFilter: UsageFilter;

  // Tag filter
  tagFilter: string[];

  // Pagination state
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;

  // Scroll position state
  scrollPosition: number;

  // Modal state
  selectedImageForModal: ImageData | null;

  // Helper functions
  setDirectory: (albumName: string) => void;
  setImages: (images: ImageData[]) => void;
  addImages: (newImages: ImageData[]) => void;
  setSidebarWidth: (width: number) => void;
  setThumbnailSize: (size: number) => void;
  setSortOrder: (order: SortOrder) => void;
  setUsageFilter: (filter: UsageFilter) => void;
  setTagFilter: (tags: string[]) => void;
  clearDirectory: () => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setScrollPosition: (position: number) => void;
  openImageModal: (image: ImageData) => void;
  closeImageModal: () => void;
  refreshImageUsage: (imageIds: number[]) => Promise<void>;
}

/**
 * Default context value
 */
const defaultContextValue: SidebarContextType = {
  directoryPath: null,
  images: [],
  sidebarWidth: 300, // Fallback value (actual value calculated in provider)
  thumbnailSize: 150,
  sortOrder: "desc",
  usageFilter: "all",
  tagFilter: [],
  currentPage: 1,
  hasMore: false,
  isLoading: false,
  scrollPosition: 0,
  selectedImageForModal: null,
  setDirectory: () => {},
  setImages: () => {},
  addImages: () => {},
  setSidebarWidth: () => {},
  setThumbnailSize: () => {},
  setSortOrder: () => {},
  setUsageFilter: () => {},
  setTagFilter: () => {},
  clearDirectory: () => {},
  setCurrentPage: () => {},
  setHasMore: () => {},
  setIsLoading: () => {},
  setScrollPosition: () => {},
  openImageModal: () => {},
  closeImageModal: () => {},
  refreshImageUsage: async () => {},
};

/**
 * Create the Sidebar Context
 */
const SidebarContext = createContext<SidebarContextType>(defaultContextValue);

/**
 * Hook to use the Sidebar Context
 */
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

/**
 * LocalStorage keys
 */
const STORAGE_KEYS = {
  SIDEBAR_WIDTH: "sidebar_width",
  THUMBNAIL_SIZE: "thumbnail_size",
  SELECTED_ALBUM: "selected_album",
  SCROLL_POSITION: "scroll_position",
  HEADER_COLLAPSED: "sidebar_header_collapsed",
  SORT_ORDER: "sort_order",
  USAGE_FILTER: "usage_filter",
  TAG_FILTER: "tag_filter",
};

// Export storage keys for use in other components
export { STORAGE_KEYS };

/**
 * SidebarProvider Props
 */
interface SidebarProviderProps {
  children: ReactNode;
}

/**
 * Calculate initial sidebar width based on viewport
 * Returns one-third of viewport width, capped at max 800px
 */
function calculateInitialSidebarWidth(): number {
  if (typeof window === "undefined") return 300;
  const viewportWidth = window.innerWidth;
  const oneThirdWidth = Math.floor(viewportWidth / 3);
  return Math.max(200, Math.min(oneThirdWidth, 800));
}

/**
 * Load a value from localStorage with fallback
 */
export function loadFromLocalStorage<T>(
  key: string,
  fallback: T,
  validator?: (value: any) => boolean
): T {
  if (typeof window === "undefined") return fallback;

  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;

    const parsed = JSON.parse(saved);

    // If validator is provided, use it to validate the value
    if (validator && !validator(parsed)) {
      return fallback;
    }

    return parsed as T;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return fallback;
  }
}

/**
 * Sidebar Provider Component
 * Manages all sidebar state and provides it to child components
 */
export function SidebarProvider({ children }: SidebarProviderProps) {
  // State management with lazy initialization from localStorage
  const [directoryPath, setDirectoryPathState] = useState<string | null>(() =>
    loadFromLocalStorage<string | null>(STORAGE_KEYS.SELECTED_ALBUM, null)
  );
  const [images, setImagesState] = useState<ImageData[]>([]);
  const [sidebarWidth, setSidebarWidthState] = useState<number>(() =>
    loadFromLocalStorage(
      STORAGE_KEYS.SIDEBAR_WIDTH,
      calculateInitialSidebarWidth(),
      (val) => typeof val === "number" && val >= 200 && val <= 800
    )
  );
  const [thumbnailSize, setThumbnailSizeState] = useState<number>(() =>
    loadFromLocalStorage(
      STORAGE_KEYS.THUMBNAIL_SIZE,
      150,
      (val) => typeof val === "number" && val >= 80 && val <= 300
    )
  );
  const [sortOrder, setSortOrderState] = useState<SortOrder>(() =>
    loadFromLocalStorage<SortOrder>(
      STORAGE_KEYS.SORT_ORDER,
      "desc",
      (val) => val === "desc" || val === "asc"
    )
  );
  const [usageFilter, setUsageFilterState] = useState<UsageFilter>(() =>
    loadFromLocalStorage<UsageFilter>(
      STORAGE_KEYS.USAGE_FILTER,
      "all",
      (val) => val === "all" || val === "used" || val === "unused"
    )
  );
  const [tagFilter, setTagFilterState] = useState<string[]>(() =>
    loadFromLocalStorage<string[]>(
      STORAGE_KEYS.TAG_FILTER,
      [],
      (val) => Array.isArray(val) && val.every((v) => typeof v === "string")
    )
  );
  const [currentPage, setCurrentPageState] = useState<number>(1);
  const [hasMore, setHasMoreState] = useState<boolean>(false);
  const [isLoading, setIsLoadingState] = useState<boolean>(false);
  const [scrollPosition, setScrollPositionState] = useState<number>(() =>
    loadFromLocalStorage(
      STORAGE_KEYS.SCROLL_POSITION,
      0,
      (val) => typeof val === "number" && val >= 0
    )
  );
  const [selectedImageForModal, setSelectedImageForModal] =
    useState<ImageData | null>(null);

  // Persist sidebar width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SIDEBAR_WIDTH,
        JSON.stringify(sidebarWidth)
      );
    } catch (error) {
      console.error("Error persisting sidebar width:", error);
    }
  }, [sidebarWidth]);

  // Persist thumbnail size to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.THUMBNAIL_SIZE,
        JSON.stringify(thumbnailSize)
      );
    } catch (error) {
      console.error("Error persisting thumbnail size:", error);
    }
  }, [thumbnailSize]);

  // Persist sort order to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SORT_ORDER, JSON.stringify(sortOrder));
    } catch (error) {
      console.error("Error persisting sort order:", error);
    }
  }, [sortOrder]);

  // Persist usage filter to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.USAGE_FILTER,
        JSON.stringify(usageFilter)
      );
    } catch (error) {
      console.error("Error persisting usage filter:", error);
    }
  }, [usageFilter]);

  // Persist tag filter to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TAG_FILTER, JSON.stringify(tagFilter));
    } catch (error) {
      console.error("Error persisting tag filter:", error);
    }
  }, [tagFilter]);

  // Persist selected album to localStorage
  useEffect(() => {
    try {
      if (directoryPath) {
        localStorage.setItem(
          STORAGE_KEYS.SELECTED_ALBUM,
          JSON.stringify(directoryPath)
        );
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_ALBUM);
      }
    } catch (error) {
      console.error("Error persisting selected album:", error);
    }
  }, [directoryPath]);

  // Persist scroll position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SCROLL_POSITION,
        JSON.stringify(scrollPosition)
      );
    } catch (error) {
      console.error("Error persisting scroll position:", error);
    }
  }, [scrollPosition]);

  /**
   * Set the selected album name
   */
  const setDirectory = useCallback((albumName: string) => {
    setDirectoryPathState(albumName);
  }, []);

  /**
   * Replace all images with new array
   */
  const setImages = useCallback((newImages: ImageData[]) => {
    setImagesState(newImages);
  }, []);

  /**
   * Add new images to the existing array (for pagination)
   */
  const addImages = useCallback((newImages: ImageData[]) => {
    setImagesState((prev) => [...prev, ...newImages]);
  }, []);

  /**
   * Update sidebar width
   */
  const setSidebarWidth = useCallback((width: number) => {
    // Enforce constraints (max 800 to allow 2 columns at 300px thumbnails)
    const constrainedWidth = Math.max(200, Math.min(800, width));
    setSidebarWidthState(constrainedWidth);
  }, []);

  /**
   * Update thumbnail size
   */
  const setThumbnailSize = useCallback((size: number) => {
    // Enforce constraints (80-300px)
    const constrainedSize = Math.max(80, Math.min(300, size));
    setThumbnailSizeState(constrainedSize);
  }, []);

  /**
   * Update sort order
   */
  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderState(order);
  }, []);

  /**
   * Update usage filter
   */
  const setUsageFilter = useCallback((filter: UsageFilter) => {
    setUsageFilterState(filter);
  }, []);

  /**
   * Update tag filter
   */
  const setTagFilter = useCallback((tags: string[]) => {
    setTagFilterState(tags);
  }, []);

  /**
   * Clear directory and reset all state
   */
  const clearDirectory = useCallback(() => {
    setDirectoryPathState(null);
    setImagesState([]);
    setCurrentPageState(1);
    setHasMoreState(false);
    setIsLoadingState(false);
    setScrollPositionState(0);
    setTagFilterState([]);
  }, []);

  /**
   * Update current page number
   */
  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page);
  }, []);

  /**
   * Update hasMore flag
   */
  const setHasMore = useCallback((hasMore: boolean) => {
    setHasMoreState(hasMore);
  }, []);

  /**
   * Update loading state
   */
  const setIsLoading = useCallback((isLoading: boolean) => {
    setIsLoadingState(isLoading);
  }, []);

  /**
   * Update scroll position
   */
  const setScrollPosition = useCallback((position: number) => {
    setScrollPositionState(position);
  }, []);

  /**
   * Open image modal with selected image
   */
  const openImageModal = useCallback((image: ImageData) => {
    setSelectedImageForModal(image);
  }, []);

  /**
   * Close image modal
   */
  const closeImageModal = useCallback(() => {
    setSelectedImageForModal(null);
  }, []);

  /**
   * Refresh usage status for specific images without affecting scroll position
   * Fetches updated data for the given image IDs and updates only those images
   * in the current images array. Images not in the current view are ignored.
   */
  const refreshImageUsage = useCallback(
    async (imageIds: number[]) => {
      if (imageIds.length === 0) return;

      // Filter to only include image IDs that are currently in the sidebar
      const currentImageIds = new Set(images.map((img) => img.id));
      const idsToRefresh = imageIds.filter((id) => currentImageIds.has(id));

      if (idsToRefresh.length === 0) return;

      try {
        // Fetch updated data for all images in parallel
        const updatedImages = await Promise.all(
          idsToRefresh.map((id) => sourceImagesApi.get(id))
        );

        // Update images array using functional update to preserve scroll position
        setImagesState((prevImages) => {
          const updatedMap = new Map(updatedImages.map((img) => [img.id, img]));
          return prevImages.map((img) => updatedMap.get(img.id) || img);
        });
      } catch (error) {
        console.error("Error refreshing image usage:", error);
        // Silently fail - don't disrupt user experience
      }
    },
    [images]
  );

  // Context value - memoized to prevent unnecessary re-renders
  const value: SidebarContextType = useMemo(
    () => ({
      directoryPath,
      images,
      sidebarWidth,
      thumbnailSize,
      sortOrder,
      usageFilter,
      tagFilter,
      currentPage,
      hasMore,
      isLoading,
      scrollPosition,
      selectedImageForModal,
      setDirectory,
      setImages,
      addImages,
      setSidebarWidth,
      setThumbnailSize,
      setSortOrder,
      setUsageFilter,
      setTagFilter,
      clearDirectory,
      setCurrentPage,
      setHasMore,
      setIsLoading,
      setScrollPosition,
      openImageModal,
      closeImageModal,
      refreshImageUsage,
    }),
    [
      directoryPath,
      images,
      sidebarWidth,
      thumbnailSize,
      sortOrder,
      usageFilter,
      tagFilter,
      currentPage,
      hasMore,
      isLoading,
      scrollPosition,
      selectedImageForModal,
      setDirectory,
      setImages,
      addImages,
      setSidebarWidth,
      setThumbnailSize,
      setSortOrder,
      setUsageFilter,
      setTagFilter,
      clearDirectory,
      setCurrentPage,
      setHasMore,
      setIsLoading,
      setScrollPosition,
      openImageModal,
      closeImageModal,
      refreshImageUsage,
    ]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
