"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, CheckCircle2, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { syncApi, tvContentApi, galleryImagesApi } from "@/lib/api";

interface TVContentMapping {
  id?: number;
  gallery_image_id?: number;
  tv_content_id: string;
  uploaded_at: string;
  last_verified_at?: string;
  sync_status: "synced" | "pending" | "failed" | "manual";
}

interface GalleryImage {
  id: number;
  filename: string;
  filepath: string;
}

export default function TVPage() {
  const [mappings, setMappings] = useState<TVContentMapping[]>([]);
  const [galleryImages, setGalleryImages] = useState<Map<number, GalleryImage>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const toggleImageSelection = (tvContentId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tvContentId)) {
        newSet.delete(tvContentId);
      } else {
        newSet.add(tvContentId);
      }
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (selectedImages.size === 0) return;

    try {
      setDeleting(true);
      setDeleteDialogOpen(false);

      const result = await syncApi.deleteTVContent(Array.from(selectedImages));

      const deletedCount = result.deleted.length;
      const failedCount = result.failed.length;

      if (failedCount > 0) {
        toast({
          title: "Delete completed with errors",
          description: `${deletedCount} deleted successfully. ${failedCount} failed to delete.`,
          variant: "destructive",
        });
      } else if (deletedCount > 0) {
        toast({
          title: "Delete successful",
          description: `Successfully deleted ${deletedCount} ${
            deletedCount === 1 ? "image" : "images"
          } from TV`,
        });
      }

      // Clear selection and reload content
      setSelectedImages(new Set());
      await loadTVContent();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete images";
      toast({
        title: "Delete error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const loadTVContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await tvContentApi.list(1, 1000) as { items?: TVContentMapping[] };
      setMappings(response.items || []);
      
      // Load gallery images for synced items
      const galleryIds = new Set<number>();
      for (const mapping of response.items || []) {
        if (mapping.gallery_image_id) {
          galleryIds.add(mapping.gallery_image_id);
        }
      }
      
      // Fetch gallery images in parallel
      const galleryMap = new Map<number, GalleryImage>();
      const fetchPromises = Array.from(galleryIds).map(async (id) => {
        try {
          const img = await galleryImagesApi.get(id) as GalleryImage;
          if (img) {
            galleryMap.set(id, img);
          }
        } catch (e) {
          // Ignore errors - gallery image may have been deleted
        }
      });
      await Promise.all(fetchPromises);
      setGalleryImages(galleryMap);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load TV content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTVContent();
  }, [loadTVContent]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const result = await syncApi.refreshTVState();
      
      toast({
        title: "TV State Refreshed",
        description: `Found ${result.total_on_tv} images on TV (${result.synced_via_app} synced via app, ${result.manual_uploads} manual)`,
      });
      
      setLastRefreshed(new Date());
      await loadTVContent();
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

  const getThumbnailUrl = (tvContentId: string) => {
    return `/api/tv-thumbnails/${tvContentId}.jpg`;
  };

  const getGalleryImageUrl = (galleryImage: GalleryImage) => {
    return `/api/gallery/image?filename=${encodeURIComponent(galleryImage.filename)}`;
  };

  const syncedCount = mappings.filter((m) => m.gallery_image_id !== null).length;
  const manualCount = mappings.filter((m) => m.gallery_image_id === null).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading TV content...</p>
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
          onClick={handleRefresh}
          disabled={refreshing || deleting}
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
        {selectedImages.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete from TV ({selectedImages.size})
              </>
            )}
          </Button>
        )}
        <ThemeToggle />
      </Navigation>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete from TV?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedImages.size}{" "}
              {selectedImages.size === 1 ? "image" : "images"} from your TV.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header section */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2">TV Content</h1>
            <p className="text-sm text-muted-foreground">
              {mappings.length} images on TV ({syncedCount} synced via app, {manualCount} manual)
            </p>
            {lastRefreshed && (
              <p className="text-xs text-muted-foreground mt-1">
                Last refreshed: {lastRefreshed.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TV content grid */}
      {mappings.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              No images found on TV
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh TV State
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {mappings.map((mapping) => {
              const isSynced = mapping.gallery_image_id !== null;
              const galleryImage = mapping.gallery_image_id
                ? galleryImages.get(mapping.gallery_image_id)
                : null;
              const isSelected = selectedImages.has(mapping.tv_content_id);

              return (
                <div
                  key={mapping.id || mapping.tv_content_id}
                  className={`relative group bg-muted rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-border"
                  }`}
                  onClick={() => toggleImageSelection(mapping.tv_content_id)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square relative bg-background">
                    <img
                      src={getThumbnailUrl(mapping.tv_content_id)}
                      alt={mapping.tv_content_id}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        // Try gallery image fallback if available
                        if (galleryImage && !imgElement.dataset.fallbackAttempted) {
                          imgElement.dataset.fallbackAttempted = "true";
                          imgElement.src = getGalleryImageUrl(galleryImage);
                          return;
                        }
                        // Show placeholder on error
                        imgElement.style.display = "none";
                        const parent = imgElement.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No thumbnail</div>';
                        }
                      }}
                    />
                    
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      {isSynced ? (
                        <div className="bg-green-500 text-white rounded-full px-2 py-1 text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Synced
                        </div>
                      ) : (
                        <div className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs font-medium flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          Manual
                        </div>
                      )}
                    </div>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {mapping.tv_content_id}
                    </p>
                    {galleryImage && (
                      <p className="text-xs text-foreground truncate">
                        {galleryImage.filename}
                      </p>
                    )}
                    {mapping.uploaded_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(mapping.uploaded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

