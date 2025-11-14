import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTags } from "@/hooks/useTags";
import { useCreateTag } from "@/hooks/useCreateTag";
import { useUpdateTag } from "@/hooks/useUpdateTag";
import { useDeleteTag } from "@/hooks/useDeleteTag";
import { useTagUsageCount } from "@/hooks/useTagUsageCount";
import { useTagUsageCounts } from "@/hooks/useTagUsageCounts";
import { AddTagDialog } from "@/components/tags/AddTagDialog";
import { DeleteTagDialog } from "@/components/tags/DeleteTagDialog";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useState } from "react";
import type { Tag } from "@/types";

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagManager({ open, onOpenChange }: TagManagerProps) {
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Get usage counts for all tags (bulk query)
  const { data: usageCounts = {} } = useTagUsageCounts();

  // Get usage count for the tag being deleted
  const { data: usageCount = 0 } = useTagUsageCount(tagToDelete?.id ?? null);

  // Handler to enter edit mode
  const handleStartEdit = (tagId: string, currentName: string) => {
    setEditingTagId(tagId);
    setEditingValue(currentName);
    setEditError(null);
  };

  // Handler to cancel edit mode
  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingValue("");
    setEditError(null);
  };

  // Handler to save tag name changes
  const handleSaveEdit = async (tagId: string) => {
    // Validate trimmed name is not empty
    const trimmedName = editingValue.trim();
    if (trimmedName.length === 0) {
      setEditError("Tag name cannot be empty");
      return;
    }

    // Validate length (1-50 characters)
    if (trimmedName.length > 50) {
      setEditError("Tag name must be at most 50 characters");
      return;
    }

    try {
      await updateTag.mutateAsync({ id: tagId, name: trimmedName });
      // Success - exit edit mode
      handleCancelEdit();
    } catch (error) {
      // Show error inline
      setEditError(error instanceof Error ? error.message : "Failed to update tag");
    }
  };

  // Handler for keyboard shortcuts in edit mode
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, tagId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(tagId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Handler to open delete confirmation dialog
  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  // Handler to confirm tag deletion
  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;
    await deleteTag.mutateAsync({ id: tagToDelete.id });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 sm:w-96">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>
              Tag Glossary ({tags?.length || 0})
            </SheetTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add tag</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading tags...
            </div>
          ) : tags && tags.length > 0 ? (
            tags.map((tag) => {
              const isEditing = editingTagId === tag.id;

              return (
                <div
                  key={tag.id}
                  className="rounded-md border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
                >
                  {isEditing ? (
                    // Edit mode
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, tag.id)}
                          className="h-8 text-sm flex-1"
                          autoFocus
                          placeholder="Tag name..."
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleSaveEdit(tag.id)}
                          disabled={updateTag.isPending}
                        >
                          <Check className="h-4 w-4" />
                          <span className="sr-only">Save</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={handleCancelEdit}
                          disabled={updateTag.isPending}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Cancel</span>
                        </Button>
                      </div>
                      {editError && (
                        <p className="text-xs text-destructive">
                          {editError}
                        </p>
                      )}
                    </div>
                  ) : (
                    // Normal display mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {tag.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({usageCounts[tag.id] ?? 0})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleStartEdit(tag.id, tag.name)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit {tag.name}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(tag)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete {tag.name}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">
              No tags found. Click the + button to add your first tag.
            </div>
          )}
        </div>
      </SheetContent>

      <AddTagDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={async (name: string) => {
          return await createTag.mutateAsync({ name });
        }}
      />

      <DeleteTagDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tag={tagToDelete}
        usageCount={usageCount}
        onConfirm={handleConfirmDelete}
      />
    </Sheet>
  );
}
