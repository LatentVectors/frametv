"use client";

import React, { useState, useEffect } from "react";
import { ImageOff, CheckCircle2, Tag as TagIcon, X, Plus, Loader2 } from "lucide-react";
import { ImageData, useSidebar } from "@/contexts/SidebarContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { sourceImagesApi, tagsApi } from "@/lib/api/database";
import { Tag } from "@/types";

interface ImageThumbnailProps {
  image: ImageData;
  size: number;
}

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

/**
 * ImageThumbnail Component
 * Displays a draggable thumbnail for an image in a square container
 * Shows placeholder icon if thumbnail fails to load
 * Shows visual indicator if image is used in a saved composition (usage_count > 0)
 * Shows tag icon on hover for managing tags
 * Preserves aspect ratio using object-contain
 */
export function ImageThumbnail({ image, size }: ImageThumbnailProps) {
  const { openImageModal } = useSidebar();
  const [imageError, setImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagInputValue, setTagInputValue] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [addingTag, setAddingTag] = useState(false);

  const sourceImageId = image.id;
  const thumbnailUrl = sourceImageId ? sourceImagesApi.getThumbnailUrl(sourceImageId) : "";

  // Load tags when popover opens
  useEffect(() => {
    if (tagPopoverOpen && sourceImageId) {
      setLoadingTags(true);
      sourceImagesApi.getTags(sourceImageId)
        .then(setTags)
        .catch((err) => {
          console.error("Failed to load tags:", err);
          setTags([]);
        })
        .finally(() => setLoadingTags(false));
    }
  }, [tagPopoverOpen, sourceImageId]);

  // Load tag suggestions when input changes
  useEffect(() => {
    if (tagInputValue.length === 0) {
      setTagSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      try {
        const allTags = await tagsApi.list(tagInputValue);
        // Filter out tags already on the image
        const existingTagIds = new Set(tags.map((t) => t.id));
        setTagSuggestions(allTags.filter((t) => !existingTagIds.has(t.id)));
      } catch (error) {
        console.error("Failed to load tag suggestions:", error);
        setTagSuggestions([]);
      }
    };

    const debounce = setTimeout(loadSuggestions, 150);
    return () => clearTimeout(debounce);
  }, [tagInputValue, tags]);

  const handleAddTag = async (tagName: string, tagColor?: string) => {
    if (!sourceImageId || !tagName.trim() || addingTag) return;

    setAddingTag(true);
    try {
      const newTag = await sourceImagesApi.addTag(sourceImageId, tagName.trim(), tagColor);
      setTags((prev) => [...prev, newTag]);
      setTagInputValue("");
      setTagSuggestions([]);
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!sourceImageId) return;

    try {
      await sourceImagesApi.removeTag(sourceImageId, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Set the file path and source image ID as drag data (JSON encoded)
    const dragData = JSON.stringify({
      filepath: image.filepath,
      sourceImageId: image.id,
    });
    e.dataTransfer.setData("text/plain", image.filepath);
    e.dataTransfer.setData("image/sidebar", dragData); // Custom type to distinguish sidebar drags
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDoubleClick = () => {
    if (!imageError) {
      openImageModal(image);
    }
  };

  const isUsed = image.usage_count > 0;

  return (
    <div
      draggable={!imageError}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-lg overflow-hidden cursor-move transition-all bg-muted group ${
        isDragging ? "opacity-50" : "opacity-100"
      } ${isUsed ? "border-2 border-blue-500" : "border-2 border-transparent hover:border-primary"}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
      }}
    >
      {imageError || !thumbnailUrl ? (
        // Show placeholder icon if thumbnail fails to load or URL is missing
        <div
          className="flex items-center justify-center bg-muted w-full h-full"
        >
          <ImageOff className="w-12 h-12 text-muted-foreground" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={thumbnailUrl}
            alt={image.filename}
            className="max-w-full max-h-full object-contain rounded-md"
            onError={handleImageError}
            draggable={false} // Prevent default image drag behavior
            style={{ userSelect: "none" }}
          />
        </div>
      )}

      {/* Used indicator badge - top left with green checkmark */}
      {isUsed && (
        <div className="absolute top-1 left-1 bg-green-500 text-white rounded-full p-0.5 z-10">
          <CheckCircle2 className="h-3 w-3" />
        </div>
      )}

      {/* Tag icon - bottom right, visible on hover */}
      {sourceImageId && (
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={`absolute bottom-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background transition-opacity ${
                isHovered || tagPopoverOpen || tags.length > 0 ? "opacity-100" : "opacity-0"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <TagIcon className={`h-3.5 w-3.5 ${tags.length > 0 ? "text-primary" : "text-muted-foreground"}`} />
              {tags.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {tags.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-64 p-3" 
            align="end" 
            side="top"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="text-sm font-medium">Tags</div>
              
              {/* Loading state */}
              {loadingTags ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Existing tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                          style={{ backgroundColor: tag.color || "#6b7280" }}
                        >
                          {tag.name}
                          <button
                            onClick={() => tag.id !== undefined && handleRemoveTag(tag.id)}
                            className="hover:bg-white/20 rounded-full p-0.5"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tag input */}
                  <div className="relative">
                    <Input
                      type="text"
                      value={tagInputValue}
                      onChange={(e) => setTagInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tagInputValue.trim()) {
                          e.preventDefault();
                          const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
                          handleAddTag(tagInputValue, randomColor);
                        } else if (e.key === "Escape") {
                          setTagPopoverOpen(false);
                        }
                      }}
                      placeholder="Add tag..."
                      className="h-8 text-sm"
                      disabled={addingTag}
                    />
                    
                    {/* Suggestions dropdown */}
                    {tagSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                        {tagSuggestions.slice(0, 5).map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => handleAddTag(suggestion.name, suggestion.color ?? undefined)}
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

                    {/* Create new tag option */}
                    {tagInputValue.trim() && !tagSuggestions.some((s) => s.name.toLowerCase() === tagInputValue.toLowerCase()) && (
                      <button
                        onClick={() => {
                          const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
                          handleAddTag(tagInputValue, randomColor);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 text-left text-xs hover:bg-accent rounded"
                        disabled={addingTag}
                      >
                        <Plus className="h-3 w-3" />
                        Create &quot;{tagInputValue}&quot;
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Filename tooltip on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 dark:bg-black/80 text-white text-xs p-1 truncate opacity-0 hover:opacity-100 transition-opacity">
        {image.filename}
      </div>
    </div>
  );
}
