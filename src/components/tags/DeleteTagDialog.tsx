import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Tag } from "@/types";

interface DeleteTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: Tag | null;
  usageCount: number;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation dialog for deleting a tag
 *
 * This component displays a warning dialog when the user attempts to delete a tag,
 * showing how many texts will be affected by the deletion.
 *
 * Features:
 * - Shows tag name being deleted
 * - Displays usage count (number of texts affected)
 * - Cancel and Delete buttons with appropriate styling
 * - Delete button uses destructive variant (red/warning)
 * - Handles loading state during deletion
 * - Prevents closing dialog while deletion is in progress
 *
 * @example
 * ```tsx
 * <DeleteTagDialog
 *   open={deleteDialogOpen}
 *   onOpenChange={setDeleteDialogOpen}
 *   tag={tagToDelete}
 *   usageCount={45}
 *   onConfirm={async () => {
 *     await deleteTag.mutateAsync({ id: tagToDelete.id });
 *   }}
 * />
 * ```
 */
export function DeleteTagDialog({
  open,
  onOpenChange,
  tag,
  usageCount,
  onConfirm,
}: DeleteTagDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error("Failed to delete tag:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing dialog while deletion is in progress
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  if (!tag) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Tag</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{tag.name}"?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {usageCount > 0 ? (
              <>
                This will remove the tag from {usageCount}{" "}
                {usageCount === 1 ? "text" : "texts"}. This action cannot be
                undone.
              </>
            ) : (
              <>This tag is not currently used. This action cannot be undone.</>
            )}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
