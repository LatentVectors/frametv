"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, RefreshCw, CheckCircle2, Tag as TagIcon, X, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncModal } from "@/components/SyncModal";
import { TagFilter } from "@/components/TagInput";
import { syncApi, tvContentApi, galleryImagesApi, tagsApi } from "@/lib/api";
import { Tag } from "@/types";

interface GalleryImage {
  id?: number;
  filename: string;
  filepath: string;
  createdAt: string;
  size: number;
  tags?: Tag[];
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

type UsageFilterType = "all" | "onTv" | "notOnTv";
type SortOrderType = "newest" | "oldest";

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
  
  // Filter state
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [usageFilter, setUsageFilter] = useState<UsageFilterType>("all");
  const [sortOrder, setSortOrder] = useState<SortOrderType>("newest");
  
  const [imageTags, setImageTags] = useState<Map<number, Tag[]>>(new Map());
  const [editingTagsForImage, setEditingTagsForImage] = useState<number | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Count active filters
  const activeFilterCount = [
    selectedTags.length > 0,
    usageFilter !== "all",
    sortOrder !== "newest",
  ].filter(Boolean).length;

  const loadImages = useCallback(
    async (pageNum: number, append: boolean = false, tagsFilter?: string[]) => {
      try {
        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        let url = `/api/gallery?page=${pageNum}&limit=50`;
        if (tagsFilter && tagsFilter.length > 0) {
          url += `&tags=${encodeURIComponent(tagsFilter.join(","))}`;
        }
        
        const response = await fetch(url);
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

        // Load tags for each image
        const newImageTags = new Map<number, Tag[]>(append ? imageTags : undefined);
        for (const image of data.images) {
          if (image.id && !newImageTags.has(image.id)) {
            try {
              const tags = await galleryImagesApi.getTags(image.id);
              newImageTags.set(image.id, tags);
            } catch {
              newImageTags.set(image.id, []);
            }
          }
        }
        setImageTags(newImageTags);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load images");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [imageTags]
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
    loadImages(1, false, selectedTags);
    loadTVMappings();
  }, [loadTVMappings, selectedTags]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadImages(page + 1, true, selectedTags);
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
  }, [hasMore, loadingMore, loading, page, loadImages, selectedTags]);

  // Convert filepath to a URL that can be displayed
  const getImageUrl = (filepath: string) => {
    const filename = filepath.split(/[/\\]/).pop();
    return `/api/gallery/image?filename=${encodeURIComponent(filename || "")}`;
  };

  // Load tag suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      if (tagInputValue.length === 0) {
        setTagSuggestions([]);
        return;
      }
      try {
        const allTags = await tagsApi.list(tagInputValue);
        // Filter out tags already on the image
        const existingTagIds = new Set(
          (imageTags.get(editingTagsForImage || 0) || []).map((t) => t.id)
        );
        setTagSuggestions(allTags.filter((t) => !existingTagIds.has(t.id)));
      } catch {
        setTagSuggestions([]);
      }
    };

    const debounce = setTimeout(loadSuggestions, 150);
    return () => clearTimeout(debounce);
  }, [tagInputValue, editingTagsForImage, imageTags]);

  // Handle adding a tag to an image
  const handleAddTag = async (imageId: number, tagName: string, tagColor?: string) => {
    if (!tagName.trim() || addingTag) return;

    setAddingTag(true);
    try {
      const newTag = await galleryImagesApi.addTag(imageId, tagName.trim(), tagColor);
      setImageTags((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(imageId) || [];
        newMap.set(imageId, [...existing, newTag]);
        return newMap;
      });
      setTagInputValue("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      });
    } finally {
      setAddingTag(false);
    }
  };

  // Handle removing a tag from an image
  const handleRemoveTag = async (imageId: number, tagId: number) => {
    try {
      await galleryImagesApi.removeTag(imageId, tagId);
      setImageTags((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(imageId) || [];
        newMap.set(imageId, existing.filter((t) => t.id !== tagId));
        return newMap;
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove tag",
        variant: "destructive",
      });
    }
  };

  const TAG_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
  ];

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

  // Use selectedImages.size directly for accurate count
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

  // Filter images based on usage filter
  const filteredImages = images.filter((image) => {
    if (usageFilter === "all") return true;
    const isOnTv = image.id ? tvMappings.has(image.id) : false;
    if (usageFilter === "onTv") return isOnTv;
    if (usageFilter === "notOnTv") return !isOnTv;
    return true;
  });

  // Sort images based on sort order
  const sortedImages = [...filteredImages].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

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
        {/* Filter toggle button */}
        <Button
          variant={filterPanelExpanded ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPanelExpanded(!filterPanelExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && !filterPanelExpanded && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-foreground text-primary rounded-full">
              {activeFilterCount}
            </span>
          )}
          {filterPanelExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        
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

      {/* Collapsible Filter Panel */}
      <div
        className={`border-b border-border bg-muted/30 overflow-hidden transition-all duration-300 ${
          filterPanelExpanded ? "max-h-40 py-4" : "max-h-0 py-0"
        }`}
      >
        <div className="px-6 flex flex-wrap items-center gap-4">
          {/* Tag Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Tags:</span>
            <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} />
          </div>

          {/* Usage Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1">
              <Button
                variant={usageFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setUsageFilter("all")}
                className="h-8"
              >
                All
              </Button>
              <Button
                variant={usageFilter === "onTv" ? "default" : "outline"}
                size="sm"
                onClick={() => setUsageFilter("onTv")}
                className="h-8"
              >
                On TV
              </Button>
              <Button
                variant={usageFilter === "notOnTv" ? "default" : "outline"}
                size="sm"
                onClick={() => setUsageFilter("notOnTv")}
                className="h-8"
              >
                Not on TV
              </Button>
            </div>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Sort:</span>
            <div className="flex items-center gap-1">
              <Button
                variant={sortOrder === "newest" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOrder("newest")}
                className="h-8"
              >
                Newest First
              </Button>
              <Button
                variant={sortOrder === "oldest" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOrder("oldest")}
                className="h-8"
              >
                Oldest First
              </Button>
            </div>
          </div>

          {/* Clear all filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTags([]);
                setUsageFilter("all");
                setSortOrder("newest");
              }}
              className="h-8 text-muted-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

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
      {sortedImages.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">
            {images.length === 0
              ? "No images saved yet. Create some in the editor!"
              : "No images match the current filters."}
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
              {sortedImages.map((image) => {
                const isSelected = selectedImages.has(image.id || 0);
                const isSynced = image.id && tvMappings.has(image.id);
                const tags = imageTags.get(image.id || 0) || [];
                const isEditingTags = editingTagsForImage === image.id;
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
                      {/* Tag button - visible on hover */}
                      <button
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background rounded-full p-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTagsForImage(isEditingTags ? null : image.id || null);
                          setTagInputValue("");
                        }}
                      >
                        <TagIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Tags display */}
                    {(tags.length > 0 || isEditingTags) && (
                      <div className="mt-2 space-y-1.5">
                        {/* Existing tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-white"
                                style={{ backgroundColor: tag.color || "#6b7280" }}
                              >
                                {tag.name}
                                {isEditingTags && tag.id !== undefined && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(image.id!, tag.id!);
                                    }}
                                    className="hover:bg-white/20 rounded-full p-0.5"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Tag input when editing */}
                        {isEditingTags && (
                          <div className="relative">
                            <input
                              type="text"
                              value={tagInputValue}
                              onChange={(e) => setTagInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && tagInputValue.trim()) {
                                  e.preventDefault();
                                  const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
                                  handleAddTag(image.id!, tagInputValue, randomColor);
                                } else if (e.key === "Escape") {
                                  setEditingTagsForImage(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Add tag..."
                              className="w-full h-7 px-2 text-xs bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                              autoFocus
                            />
                            {tagSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                                {tagSuggestions.slice(0, 5).map((suggestion) => (
                                  <button
                                    key={suggestion.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddTag(image.id!, suggestion.name, suggestion.color ?? undefined);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent"
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: suggestion.color || "#6b7280" }}
                                    />
                                    {suggestion.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
          {!hasMore && sortedImages.length > 0 && (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground text-sm">
                All {sortedImages.length} images loaded
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
