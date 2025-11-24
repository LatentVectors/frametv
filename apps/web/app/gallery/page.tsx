"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncModal } from "@/components/SyncModal";
import { syncApi, tvContentApi } from "@/lib/api";

interface GalleryImage {
  id?: number;
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

interface TVContentMapping {
  id?: number;
  gallery_image_id?: number;
  tv_content_id: string;
  sync_status: "synced" | "pending" | "failed" | "manual";
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [tvMappings, setTvMappings] = useState<Map<number, TVContentMapping>>(
    new Map()
  );
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

  const loadTVMappings = useCallback(async () => {
    try {
      const response = (await tvContentApi.list(1, 10000)) as {
        items?: TVContentMapping[];
      };
      const mappings = response.items || [];
      const mappingMap = new Map<number, TVContentMapping>();
      for (const mapping of mappings) {
        if (mapping.gallery_image_id) {
          mappingMap.set(mapping.gallery_image_id, mapping);
        }
      }
      setTvMappings(mappingMap);
    } catch (error) {
      console.error("Failed to load TV mappings:", error);
    }
  }, []);

  useEffect(() => {
    loadImages(1);
    loadTVMappings();
  }, [loadImages, loadTVMappings]);

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
    const filename = filepath.split(/[/\\]/).pop();
    return `/api/gallery/image?filename=${encodeURIComponent(filename || "")}`;
  };

  const toggleImageSelection = (imageId: number) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleRefreshTVState = async () => {
    try {
      setRefreshing(true);
      const result = await syncApi.refreshTVState();

      toast({
        title: "TV State Refreshed",
        description: `Found ${result.total_on_tv} images on TV (${result.synced_via_app} synced via app, ${result.manual_uploads} manual)`,
      });

      // Reload TV mappings
      await loadTVMappings();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to refresh TV state";
      toast({
        title: "Refresh Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async (mode: "add" | "reset") => {
    if (selectedImages.size === 0) {
      return;
    }

    try {
      setSyncing(true);
      setSyncModalOpen(false);

      // Get TV settings
      const settingsResponse = await fetch("/api/settings");
      const settings = await settingsResponse.json();

      // Call sync API with gallery_image_ids
      const response = await syncApi.sync({
        image_paths: [], // Empty array since we're using gallery_image_ids
        gallery_image_ids: Array.from(selectedImages),
        ip_address: settings.ipAddress,
        port: settings.port || 8002,
        mode,
      });

      if (!response.success) {
        const errorMessage =
          response.failed?.[0]?.error || "Failed to sync images";
        toast({
          title: "Sync failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const syncedCount = response.successful || 0;
      const failedCount = response.failed?.length || 0;

      if (failedCount > 0) {
        toast({
          title: "Sync completed with some errors",
          description: `${syncedCount} images synced successfully. ${failedCount} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync successful",
          description: `Successfully synced ${syncedCount} ${
            syncedCount === 1 ? "image" : "images"
          } to TV`,
        });
        setSelectedImages(new Set());
        await loadTVMappings();
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

  // Calculate sync preview counts for modal
  const selectedGalleryIds = Array.from(selectedImages);
  const existingMappings = selectedGalleryIds.filter((id) =>
    tvMappings.has(id)
  );
  const newCount = selectedGalleryIds.length - existingMappings.length;
  // For reset mode, we'd remove all app-managed images not in selection
  // For now, just show new count
  const removeCount = 0; // Will be calculated in modal based on mode

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => loadImages(1)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar with navigation */}
      <Navigation>
        <Button
          variant="outline"
          onClick={handleRefreshTVState}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh TV State
            </>
          )}
        </Button>
        {selectedCount > 0 && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedCount} {selectedCount === 1 ? "image" : "images"}{" "}
              selected
            </span>
            <Button
              variant="default"
              onClick={() => setSyncModalOpen(true)}
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
          </>
        )}
        <ThemeToggle />
      </Navigation>

      {/* Sync Modal */}
      <SyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onConfirm={handleSync}
        selectedCount={selectedCount}
        newCount={newCount}
        removeCount={removeCount}
      />

      {/* Sync progress bar */}
      {syncing && (
        <div className="px-6 py-2 border-b border-border bg-muted">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full animate-pulse"
                style={{ width: "100%" }}
              />
            </div>
            <span className="text-xs text-muted-foreground min-w-[60px] text-right">
              Syncing...
            </span>
          </div>
        </div>
      )}

      {/* Gallery content */}
      {images.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">
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
                const isSelected = selectedImages.has(image.id || 0);
                const isSynced = image.id && tvMappings.has(image.id);
                return (
                  <div
                    key={image.id || image.filename}
                    className="mb-4 break-inside-avoid"
                  >
                    <div
                      className={`relative group cursor-pointer rounded-lg overflow-hidden bg-muted border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-border"
                      }`}
                      onClick={() => toggleImageSelection(image.id || 0)}
                    >
                      <img
                        src={getImageUrl(image.filepath)}
                        alt={image.filename}
                        className="w-full h-auto object-contain"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {/* Sync badge */}
                      {isSynced && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
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
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Observer target for infinite scroll */}
          <div ref={observerTarget} className="h-4" />

          {/* End of gallery message */}
          {!hasMore && images.length > 0 && (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground text-sm">
                All {images.length} images loaded
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
