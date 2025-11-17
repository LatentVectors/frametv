"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

/**
 * Image data structure returned from the backend API
 */
export interface ImageData {
  filename: string;
  path: string;
  size: number;
  modifiedDate: string;
  thumbnailDataUrl: string;
}

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

  // Pagination state
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;

  // Scroll position state
  scrollPosition: number;

  // Helper functions
  setDirectory: (albumName: string) => void;
  setImages: (images: ImageData[]) => void;
  addImages: (newImages: ImageData[]) => void;
  setSidebarWidth: (width: number) => void;
  clearDirectory: () => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setScrollPosition: (position: number) => void;
}

/**
 * Default context value
 */
const defaultContextValue: SidebarContextType = {
  directoryPath: null,
  images: [],
  sidebarWidth: 300,
  currentPage: 1,
  hasMore: false,
  isLoading: false,
  scrollPosition: 0,
  setDirectory: () => {},
  setImages: () => {},
  addImages: () => {},
  setSidebarWidth: () => {},
  clearDirectory: () => {},
  setCurrentPage: () => {},
  setHasMore: () => {},
  setIsLoading: () => {},
  setScrollPosition: () => {},
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
};

/**
 * SidebarProvider Props
 */
interface SidebarProviderProps {
  children: ReactNode;
}

/**
 * Sidebar Provider Component
 * Manages all sidebar state and provides it to child components
 */
export function SidebarProvider({ children }: SidebarProviderProps) {
  // State management
  const [directoryPath, setDirectoryPathState] = useState<string | null>(null);
  const [images, setImagesState] = useState<ImageData[]>([]);
  const [sidebarWidth, setSidebarWidthState] = useState<number>(300);
  const [currentPage, setCurrentPageState] = useState<number>(1);
  const [hasMore, setHasMoreState] = useState<boolean>(false);
  const [isLoading, setIsLoadingState] = useState<boolean>(false);
  const [scrollPosition, setScrollPositionState] = useState<number>(0);

  // Load persisted values from localStorage on mount
  useEffect(() => {
    try {
      // Restore sidebar width
      const savedWidth = localStorage.getItem(STORAGE_KEYS.SIDEBAR_WIDTH);
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (!isNaN(width) && width >= 200 && width <= 600) {
          setSidebarWidthState(width);
        }
      }
    } catch (error) {
      console.error("Error loading persisted sidebar state:", error);
    }
  }, []);

  // Persist sidebar width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_WIDTH, sidebarWidth.toString());
    } catch (error) {
      console.error("Error persisting sidebar width:", error);
    }
  }, [sidebarWidth]);

  /**
   * Set the selected album name
   */
  const setDirectory = (albumName: string) => {
    setDirectoryPathState(albumName);
  };

  /**
   * Replace all images with new array
   */
  const setImages = (newImages: ImageData[]) => {
    setImagesState(newImages);
  };

  /**
   * Add new images to the existing array (for pagination)
   */
  const addImages = (newImages: ImageData[]) => {
    setImagesState((prev) => [...prev, ...newImages]);
  };

  /**
   * Update sidebar width
   */
  const setSidebarWidth = (width: number) => {
    // Enforce constraints
    const constrainedWidth = Math.max(200, Math.min(600, width));
    setSidebarWidthState(constrainedWidth);
  };

  /**
   * Clear directory and reset all state
   */
  const clearDirectory = () => {
    setDirectoryPathState(null);
    setImagesState([]);
    setCurrentPageState(1);
    setHasMoreState(false);
    setIsLoadingState(false);
  };

  /**
   * Update current page number
   */
  const setCurrentPage = (page: number) => {
    setCurrentPageState(page);
  };

  /**
   * Update hasMore flag
   */
  const setHasMore = (hasMore: boolean) => {
    setHasMoreState(hasMore);
  };

  /**
   * Update loading state
   */
  const setIsLoading = (isLoading: boolean) => {
    setIsLoadingState(isLoading);
  };

  /**
   * Update scroll position
   */
  const setScrollPosition = (position: number) => {
    setScrollPositionState(position);
  };

  // Context value
  const value: SidebarContextType = {
    directoryPath,
    images,
    sidebarWidth,
    currentPage,
    hasMore,
    isLoading,
    scrollPosition,
    setDirectory,
    setImages,
    addImages,
    setSidebarWidth,
    clearDirectory,
    setCurrentPage,
    setHasMore,
    setIsLoading,
    setScrollPosition,
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
