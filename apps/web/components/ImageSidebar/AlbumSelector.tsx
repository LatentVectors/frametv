"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSidebar } from "@/contexts/SidebarContext";

interface Album {
  name: string;
  imageCount: number;
}

interface AlbumsResponse {
  success: boolean;
  albums: Album[];
  error?: string;
}

export function AlbumSelector() {
  const { directoryPath, setDirectory, setImages, setHasMore, setCurrentPage, setIsLoading, setScrollPosition, sortOrder } =
    useSidebar();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [isLoading, setIsLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Fetch albums on mount
  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      setIsLoadingState(true);
      setError(null);

      const response = await fetch("/api/albums");
      if (!response.ok) {
        throw new Error("Failed to fetch albums");
      }

      const data: AlbumsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch albums");
      }

      setAlbums(data.albums);

      // If currently selected album no longer exists, clear selection
      if (
        selectedAlbum &&
        !data.albums.some((album) => album.name === selectedAlbum)
      ) {
        setSelectedAlbum(null);
        setError(
          `Album '${selectedAlbum}' no longer exists. Please select a different album.`
        );
      }
    } catch (error) {
      console.error("Error fetching albums:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load albums. Please try again."
      );
    } finally {
      setIsLoadingState(false);
    }
  };

  const handleAlbumSelect = async (albumName: string) => {
    try {
      setError(null);
      
      // If selecting a different album, reset scroll position
      if (albumName !== directoryPath) {
        setSelectedAlbum(albumName);
        setScrollPosition(0);
      }
      
      setIsLoading(true);

      // Set directory in context
      setDirectory(albumName);

      // Fetch images for the selected album
      const response = await fetch("/api/albums/browse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          albumName,
          page: 1,
          limit: 100,
          sortOrder,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load album images");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load album images");
      }

      // Update context with images
      setImages(data.images);
      setHasMore(data.hasMore);
      setCurrentPage(data.page);
    } catch (error) {
      console.error("Error loading album images:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load album images. Please try again."
      );
      setSelectedAlbum(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAlbums();
  };

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setShowTooltip(true);
    }, 700); // 700ms delay as per spec
    setTooltipTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setShowTooltip(false);
  };

  // Empty state
  if (!isLoading && albums.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <p className="text-sm font-medium text-gray-900 mb-2">
          No albums found.
        </p>
        <div className="text-sm text-gray-600 text-center space-y-1">
          <p>To add albums:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create folders in &lt;project-root&gt;/data/albums/</li>
            <li>Add .jpg/.jpeg/.png images to each folder</li>
            <li>Click refresh or reload the page</li>
          </ol>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={selectedAlbum || undefined}
            onValueChange={handleAlbumSelect}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an album..." />
            </SelectTrigger>
            <SelectContent>
              {albums.map((album) => (
                <SelectItem key={album.name} value={album.name}>
                  {album.name} ({album.imageCount} images)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="icon"
          disabled={isLoading}
          title="Refresh albums"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
        <div className="relative">
          <Info
            className="h-4 w-4 text-gray-400 cursor-help"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
          {showTooltip && (
            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-20">
              <div className="space-y-2">
                <p className="font-semibold">How to add albums:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Create folders in &lt;project-root&gt;/data/albums/</li>
                  <li>Add .jpg/.jpeg/.png images to each folder</li>
                  <li>Click refresh to see new albums</li>
                </ol>
                <p className="font-semibold mt-2">Notes:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Only root-level images in album folders are recognized
                  </li>
                  <li>Subfolders within albums are ignored</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      {isLoading && albums.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-4 w-4 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-600">Loading albums...</span>
        </div>
      )}
    </div>
  );
}
