"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { syncApi, tvContentApi } from "@/lib/api";

interface TVContentMapping {
  id?: number;
  gallery_image_id?: number;
  tv_content_id: string;
  uploaded_at: string;
  last_verified_at?: string;
  sync_status: "synced" | "pending" | "failed" | "manual";
}

interface GalleryImage {
  id?: number;
  filename: string;
}

export default function TVPage() {
  const [mappings, setMappings] = useState<TVContentMapping[]>([]);
  const [galleryImages, setGalleryImages] = useState<Map<number, GalleryImage>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { toast } = useToast();

  const loadTVContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await tvContentApi.list(1, 10000) as { items?: TVContentMapping[] };
      setMappings(response.items || []);
      
      // Load gallery images for synced items
      const galleryIds = new Set<number>();
      for (const mapping of response.items || []) {
        if (mapping.gallery_image_id) {
          galleryIds.add(mapping.gallery_image_id);
        }
      }
      
      // Fetch gallery images
      const galleryMap = new Map<number, GalleryImage>();
      for (const id of Array.from(galleryIds)) {
        try {
          const img = await tvContentApi.getByGalleryImageId(id);
          // Note: This would need to be a gallery image API call
          // For now, we'll just store the ID
        } catch (e) {
          // Ignore errors
        }
      }
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
          variant="default"
          onClick={handleRefresh}
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
        <ThemeToggle />
      </Navigation>

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

              return (
                <div
                  key={mapping.id || mapping.tv_content_id}
                  className="relative group bg-muted rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square relative bg-background">
                    <img
                      src={getThumbnailUrl(mapping.tv_content_id)}
                      alt={mapping.tv_content_id}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Show placeholder on error
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
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

