"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Tag as TagIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tagsApi } from "@/lib/api";
import { Tag } from "@/types";

interface TagInputProps {
  tags: Tag[];
  onAddTag: (tagName: string, tagColor?: string) => Promise<void>;
  onRemoveTag: (tagId: number) => Promise<void>;
  placeholder?: string;
  compact?: boolean;
}

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export function TagInput({ 
  tags, 
  onAddTag, 
  onRemoveTag, 
  placeholder = "Add tag...",
  compact = false
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load suggestions when input changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (inputValue.length === 0) {
        setSuggestions([]);
        return;
      }

      try {
        const allTags = await tagsApi.list(inputValue);
        // Filter out tags that are already added
        const existingTagIds = new Set(tags.map((t) => t.id));
        const filteredTags = allTags.filter((t) => !existingTagIds.has(t.id));
        setSuggestions(filteredTags);
      } catch (error) {
        console.error("Failed to load tag suggestions:", error);
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(loadSuggestions, 150);
    return () => clearTimeout(debounce);
  }, [inputValue, tags]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddTag = useCallback(async (tagName: string, tagColor?: string) => {
    if (!tagName.trim() || isAdding) return;
    
    setIsAdding(true);
    try {
      await onAddTag(tagName.trim(), tagColor);
      setInputValue("");
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setIsAdding(false);
    }
  }, [onAddTag, isAdding]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleAddTag(suggestions[selectedIndex].name, suggestions[selectedIndex].color ?? undefined);
      } else if (inputValue.trim()) {
        // Create new tag with a random color
        const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
        handleAddTag(inputValue, randomColor);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Existing tags display */}
      {tags.length > 0 && (
        <div className={`flex flex-wrap gap-1 ${compact ? "mb-1" : "mb-2"}`}>
          {tags.map((tag) => (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1 rounded-full text-white ${
                compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
              }`}
              style={{ backgroundColor: tag.color || "#6b7280" }}
            >
              {tag.name}
              {tag.id !== undefined && (
                <button
                  onClick={() => onRemoveTag(tag.id!)}
                  className="hover:bg-white/20 rounded-full p-0.5"
                >
                  <X className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={compact ? "h-7 text-xs" : "h-8 text-sm"}
          disabled={isAdding}
        />
        
        {/* Suggestions dropdown */}
        {showSuggestions && (suggestions.length > 0 || inputValue.trim()) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleAddTag(suggestion.name, suggestion.color ?? undefined)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                  index === selectedIndex ? "bg-accent" : ""
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: suggestion.color || "#6b7280" }}
                />
                {suggestion.name}
              </button>
            ))}
            {inputValue.trim() && !suggestions.some((s) => s.name.toLowerCase() === inputValue.toLowerCase()) && (
              <button
                onClick={() => {
                  const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
                  handleAddTag(inputValue, randomColor);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                  selectedIndex === suggestions.length ? "bg-accent" : ""
                }`}
              >
                <Plus className="h-3 w-3" />
                Create &quot;{inputValue}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  compact?: boolean;
}

export function TagFilter({ selectedTags, onTagsChange, compact = false }: TagFilterProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all available tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await tagsApi.list();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Failed to load tags:", error);
      }
    };
    loadTags();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearTags = () => {
    onTagsChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant={selectedTags.length > 0 ? "default" : "outline"}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={compact ? "h-7 text-xs" : "h-8 text-sm"}
      >
        <TagIcon className={compact ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1"} />
        {selectedTags.length > 0 ? `Tags (${selectedTags.length})` : "Tags"}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-48 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {availableTags.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No tags available</div>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                      selectedTags.includes(tag.name) ? "bg-accent" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color || "#6b7280" }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <div className="border-t border-border">
                  <button
                    onClick={clearTags}
                    className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

