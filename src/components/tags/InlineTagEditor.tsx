import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus } from "lucide-react";
import type { Tag } from "@/types";

interface InlineTagEditorProps {
  currentTagIds: string[];
  availableTags: Tag[];
  onTagAdded: (tagId: string) => void;
  disabled?: boolean;
}

/**
 * Inline tag editor component with searchable dropdown
 * Allows users to add tags from their tag glossary to a text
 */
export function InlineTagEditor({
  currentTagIds,
  availableTags,
  onTagAdded,
  disabled = false,
}: InlineTagEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter tags based on search query
  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-tag-item]');
      const item = items[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleTagToggle = (tagId: string) => {
    // Always call onTagAdded - it will handle both:
    // 1. Adding new tags (if not assigned)
    // 2. Converting AI tags to manual (if already assigned)
    // useAddManualTag uses UPSERT which handles both cases
    onTagAdded(tagId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredTags.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredTags.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (highlightedIndex >= 0 && highlightedIndex < filteredTags.length) {
          // Add highlighted tag
          const tag = filteredTags[highlightedIndex];
          onTagAdded(tag.id);
          setSearchQuery("");
          setHighlightedIndex(-1);
        }
        break;
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Clear search and highlight when closing
      setSearchQuery("");
      setHighlightedIndex(-1);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1 text-xs"
        >
          <Plus className="h-3 w-3" />
          Add tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Search input */}
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
            autoFocus
          />

          {/* Tag list with checkboxes */}
          <div ref={listRef} className="max-h-64 overflow-y-auto space-y-2">
            {filteredTags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "No tags found" : "No tags available"}
              </p>
            ) : (
              filteredTags.map((tag, index) => {
                const isAssigned = currentTagIds.includes(tag.id);
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={tag.id}
                    data-tag-item
                    className={`flex items-center space-x-2 rounded-sm p-2 cursor-pointer ${
                      isHighlighted ? 'bg-accent' : 'hover:bg-accent'
                    }`}
                    onClick={() => handleTagToggle(tag.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={isAssigned}
                      onCheckedChange={() => {
                        handleTagToggle(tag.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label
                      htmlFor={`tag-${tag.id}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {tag.name}
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
