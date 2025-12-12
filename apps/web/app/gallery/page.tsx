"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  Tag as TagIcon,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncModal } from "@/components/SyncModal";
import { TagFilter } from "@/components/TagInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { syncApi, tvContentApi, galleryImagesApi, tagsApi } from "@/lib/api";
import { Tag } from "@/types";

interface GalleryImage {
  id: number;
  filename: string;
  filepath: string;
  template_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

interface GalleryResponse {
  items: GalleryImage[];
  total: number;
  page: number;
  pages: number;
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
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    stage: string;
  } | null>(null);
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
  const [editingTagsForImage, setEditingTagsForImage] = useState<number | null>(
    null
  );
  const [tagInputValue, setTagInputValue] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const loadImagesRef =
    useRef<
      (pageNum: number, append: boolean, tagsFilter?: string[]) => Promise<void>
    >();
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

        const tagsParam =
          tagsFilter && tagsFilter.length > 0
            ? tagsFilter.join(",")
            : undefined;
        const data = (await galleryImagesApi.list(pageNum, 50, {
          tags: tagsParam,
        })) as GalleryResponse;

        if (append) {
          setImages((prev) => [...prev, ...data.items]);
        } else {
          setImages(data.items);
        }

        // Calculate hasMore from pages info
        setHasMore(pageNum < data.pages);
        setPage(pageNum);
        pageRef.current = pageNum;

        // Load tags for each image using functional update
        // First, prepare the tag map structure
        setImageTags((prevTags) => {
          const newImageTags = append
            ? new Map(prevTags)
            : new Map<number, Tag[]>();
          return newImageTags;
        });

        // Load tags asynchronously and update state
        const tagPromises = data.items.map(async (image) => {
          try {
            const tags = await galleryImagesApi.getTags(image.id);
            return { imageId: image.id, tags };
          } catch {
            return { imageId: image.id, tags: [] };
          }
        });

        const tagResults = await Promise.all(tagPromises);
        setImageTags((prevTags) => {
          const newTags = append ? new Map(prevTags) : new Map<number, Tag[]>();
          tagResults.forEach(({ imageId, tags }) => {
            // Only update if we don't already have tags for this image (when appending)
            if (!append || !newTags.has(imageId)) {
              newTags.set(imageId, tags);
            }
          });
          return newTags;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load images");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Keep ref in sync with loadImages
  useEffect(() => {
    loadImagesRef.current = loadImages;
  }, [loadImages]);

  const loadTVMappings = useCallback(async () => {
    try {
      const response = (await tvContentApi.list(1, 1000)) as {
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
    // Reset pagination state when filters change
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    loadImages(1, false, selectedTags);
    loadTVMappings();
  }, [loadTVMappings, selectedTags]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !loading &&
          loadImagesRef.current
        ) {
          const nextPage = pageRef.current + 1;
          loadImagesRef.current(nextPage, true, selectedTags);
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
  }, [hasMore, loadingMore, loading, selectedTags]);

  // Convert filepath to a URL that can be displayed
  const getImageUrl = (filepath: string) => {
    // filepath from database is relative to data directory (e.g., "saved-images/filename.jpg")
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
  const handleAddTag = async (
    imageId: number,
    tagName: string,
    tagColor?: string
  ) => {
    if (!tagName.trim() || addingTag) return;

    setAddingTag(true);
    try {
      const newTag = await galleryImagesApi.addTag(
        imageId,
        tagName.trim(),
        tagColor
      );
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
        newMap.set(
          imageId,
          existing.filter((t) => t.id !== tagId)
        );
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
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
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

  const handleSync = useCallback(
    async (mode: "add" | "reset") => {
      if (selectedImages.size === 0) {
        return;
      }

      try {
        setSyncing(true);
        setSyncProgress(null);
        setSyncModalOpen(false);

        // Get TV settings
        const settingsResponse = await fetch("/api/settings");
        const settings = await settingsResponse.json();

        // Call streaming sync API with progress callback
        const response = await syncApi.syncStream(
          {
            image_paths: [], // Empty array since we're using gallery_image_ids
            gallery_image_ids: Array.from(selectedImages),
            ip_address: settings.ipAddress,
            port: settings.port || 8002,
            mode,
          },
          (current, total, _filename, stage) => {
            setSyncProgress({ current, total, stage });
          }
        );

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
        setSyncProgress(null);
      }
    },
    [selectedImages, toast, loadTVMappings]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedImages.size === 0) return;

    try {
      setDeleting(true);
      setDeleteDialogOpen(false);

      const result = await galleryImagesApi.deleteMultiple(
        Array.from(selectedImages)
      );

      if (result.deleted > 0) {
        // Remove deleted images from state
        setImages((prev) => prev.filter((img) => !selectedImages.has(img.id)));
        setImageTags((prev) => {
          const newMap = new Map(prev);
          selectedImages.forEach((id) => newMap.delete(id));
          return newMap;
        });
        setSelectedImages(new Set());

        toast({
          title: "Images deleted",
          description: `Successfully deleted ${result.deleted} ${
            result.deleted === 1 ? "image" : "images"
          }`,
        });
      }

      if (result.failed > 0) {
        toast({
          title: "Some deletions failed",
          description: `${result.failed} ${
            result.failed === 1 ? "image" : "images"
          } could not be deleted`,
          variant: "destructive",
        });
      }
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
  }, [selectedImages, toast]);

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
    const isOnTv = tvMappings.has(image.id);
    if (usageFilter === "onTv") return isOnTv;
    if (usageFilter === "notOnTv") return !isOnTv;
    return true;
  });

  // Sort images based on sort order
  const sortedImages = [...filteredImages].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
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
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"} active
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
        {selectedImages.size > 0 && (
          <>
            <Button
              variant="default"
              onClick={() => setSyncModalOpen(true)}
              disabled={syncing || selectedImages.size === 0}
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                `Sync (${selectedImages.size})`
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedImages.size})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <span className="text-sm font-medium text-muted-foreground">
              Tags:
            </span>
            <TagFilter
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>

          {/* Usage Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Status:
            </span>
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
            <span className="text-sm font-medium text-muted-foreground">
              Sort:
            </span>
            <Select
              value={sortOrder}
              onValueChange={(value: SortOrderType) => setSortOrder(value)}
            >
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
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
        selectedCount={selectedImages.size}
        newCount={newCount}
        removeCount={removeCount}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedImages.size}{" "}
              {selectedImages.size === 1 ? "image" : "images"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected {selectedImages.size === 1 ? "image" : "images"} from
              your gallery and remove the{" "}
              {selectedImages.size === 1 ? "file" : "files"} from disk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync progress bar */}
      {syncing && (
        <div className="px-6 py-2 border-b border-border bg-muted">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-300"
                style={{
                  width:
                    syncProgress && syncProgress.total > 0
                      ? `${(syncProgress.current / syncProgress.total) * 100}%`
                      : "100%",
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 min-w-[120px] justify-end">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {syncProgress && syncProgress.total > 0
                  ? `${
                      syncProgress.stage === "connecting"
                        ? "Connecting..."
                        : `${syncProgress.current} of ${syncProgress.total}`
                    }`
                  : "Syncing..."}
              </span>
            </div>
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
                const isSelected = selectedImages.has(image.id);
                const isSynced = tvMappings.has(image.id);
                const tags = imageTags.get(image.id) || [];
                const isEditingTags = editingTagsForImage === image.id;
                return (
                  <div key={image.id} className="mb-4 break-inside-avoid">
                    <div
                      className={`relative group cursor-pointer rounded-lg overflow-hidden bg-muted border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-border"
                      }`}
                      onClick={() => toggleImageSelection(image.id)}
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
                          setEditingTagsForImage(
                            isEditingTags ? null : image.id
                          );
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
                                style={{
                                  backgroundColor: tag.color || "#6b7280",
                                }}
                              >
                                {tag.name}
                                {isEditingTags && tag.id !== undefined && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(image.id, tag.id!);
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
                                  const randomColor =
                                    TAG_COLORS[
                                      Math.floor(
                                        Math.random() * TAG_COLORS.length
                                      )
                                    ];
                                  handleAddTag(
                                    image.id,
                                    tagInputValue,
                                    randomColor
                                  );
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
                                {tagSuggestions
                                  .slice(0, 5)
                                  .map((suggestion) => (
                                    <button
                                      key={suggestion.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddTag(
                                          image.id,
                                          suggestion.name,
                                          suggestion.color ?? undefined
                                        );
                                      }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent"
                                    >
                                      <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{
                                          backgroundColor:
                                            suggestion.color || "#6b7280",
                                        }}
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

          {/* Observer target for infinite scroll - only render when there's more to load */}
          {hasMore && <div ref={observerTarget} className="h-20 w-full" />}

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
