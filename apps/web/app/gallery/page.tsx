"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface GalleryImage {
  filename: string;
  filepath: string;
  createdAt: string;
  size: number;
}

interface GalleryResponse {
  images: GalleryImage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface SyncResponse {
  success: boolean;
  synced: string[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
  total?: number;
  successful?: number;
  error?: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [tvConfigured, setTvConfigured] = useState<boolean | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadImages = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const response = await fetch(`/api/gallery?page=${pageNum}&limit=50`);
        if (!response.ok) {
          throw new Error("Failed to load images");
        }

        const data: GalleryResponse = await response.json();

        if (append) {
          setImages((prev) => [...prev, ...data.images]);
        } else {
          setImages(data.images);
        }

        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load images");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    loadImages(1);
  }, [loadImages]);

  // Check TV configuration status
  useEffect(() => {
    const checkTVConfiguration = async () => {
      try {
        const response = await fetch("/api/settings/check");
        if (response.ok) {
          const data = await response.json();
          setTvConfigured(data.isConfigured);
        }
      } catch (error) {
        console.error("Error checking TV configuration:", error);
        setTvConfigured(false);
      }
    };
    checkTVConfiguration();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadImages(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, page, loadImages]);

  // Convert filepath to a URL that can be displayed
  const getImageUrl = (filepath: string) => {
    // For Next.js, we'll need to serve images via an API route
    // For now, use a relative path that will be handled by an image serving route
    const filename = filepath.split(/[/\\]/).pop();
    return `/api/gallery/image?filename=${encodeURIComponent(filename || "")}`;
  };

  const toggleImageSelection = (filename: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  const handleSync = async () => {
    if (selectedImages.size === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image to sync",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncing(true);

      // Get selected image filepaths
      const selectedFilepaths = Array.from(selectedImages).map((filename) => {
        const image = images.find((img) => img.filename === filename);
        return image?.filepath || filename;
      });

      // Call sync API
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imagePaths: selectedFilepaths,
        }),
      });

      const data: SyncResponse = await response.json();

      if (!response.ok || !data.success) {
        // Handle errors
        const errorMessage = data.error || "Failed to sync images";

        if (data.failed && data.failed.length > 0) {
          // Partial success - show failed images
          const failedList = data.failed.map((f) => f.filename).join(", ");
          toast({
            title: "Sync completed with errors",
            description: `${
              data.successful || 0
            } images synced successfully. Failed: ${failedList}`,
            variant: "destructive",
          });
        } else {
          // Complete failure
          toast({
            title: "Sync failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        return;
      }

      // Success handling
      const syncedCount =
        data.synced?.length || data.successful || selectedImages.size;
      const failedCount = data.failed?.length || 0;

      if (failedCount > 0) {
        // Partial success
        const failedList = data.failed
          .map((f) => `${f.filename} (${f.error})`)
          .join(", ");
        toast({
          title: "Sync completed with some errors",
          description: `${syncedCount} images synced successfully. ${failedCount} failed: ${failedList}`,
          variant: "destructive",
        });
      } else {
        // Complete success
        toast({
          title: "Sync successful",
          description: `Successfully synced ${syncedCount} ${
            syncedCount === 1 ? "image" : "images"
          } to TV`,
        });
        // Clear selection after successful sync
        setSelectedImages(new Set());
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sync images";
      toast({
        title: "Sync error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const selectedCount = selectedImages.size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-gray-500">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => loadImages(1)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar with navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold">Gallery</h1>
        <div className="flex items-center gap-4">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedCount} {selectedCount === 1 ? "image" : "images"}{" "}
                selected
              </span>
              <Button
                variant="default"
                onClick={handleSync}
                disabled={syncing || selectedCount === 0}
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  `Sync ${selectedCount} ${
                    selectedCount === 1 ? "Image" : "Images"
                  }`
                )}
              </Button>
            </div>
          )}
          <Link href="/">
            <Button variant="outline">Back to Editor</Button>
          </Link>
        </div>
      </div>

      {/* Sync progress bar */}
      {syncing && (
        <div className="px-6 py-2 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full animate-pulse"
                style={{ width: "100%" }}
              />
            </div>
            <span className="text-xs text-gray-600 min-w-[60px] text-right">
              Syncing...
            </span>
          </div>
        </div>
      )}

      {/* TV configuration banner */}
      {tvConfigured === false && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-yellow-800">
              TV not configured. Please go to{" "}
              <Link href="/settings" className="underline font-medium">
                Settings
              </Link>{" "}
              to set up your Frame TV connection.
            </p>
          </div>
        </div>
      )}

      {/* Gallery content */}
      {images.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">
            No images saved yet. Create some in the editor!
          </p>
        </div>
      ) : (
        <>
          {/* Masonry layout */}
          <div className="p-6">
            <div
              className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4"
              style={{ columnFill: "balance" }}
            >
              {images.map((image) => {
                const isSelected = selectedImages.has(image.filename);
                return (
                  <div key={image.filename} className="mb-4 break-inside-avoid">
                    <div
                      className={`relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 border-2 transition-all ${
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-transparent hover:border-gray-300"
                      }`}
                      onClick={() => toggleImageSelection(image.filename)}
                    >
                      <img
                        src={getImageUrl(image.filepath)}
                        alt={image.filename}
                        className="w-full h-auto object-contain"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback if image fails to load
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {/* Observer target for infinite scroll */}
          <div ref={observerTarget} className="h-4" />

          {/* End of gallery message */}
          {!hasMore && images.length > 0 && (
            <div className="flex justify-center py-8">
              <p className="text-gray-500 text-sm">
                All {images.length} images loaded
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
