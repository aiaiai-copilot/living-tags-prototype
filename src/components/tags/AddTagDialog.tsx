import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTexts } from "@/hooks/useTexts";
import { useBatchAutoTag } from "@/hooks/useBatchAutoTag";
import type { Tag } from "@/types";

// Zod schema for tag name validation
const tagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be at most 50 characters")
    .transform((val) => val.trim()), // Trim whitespace before validation
});

type TagFormData = z.infer<typeof tagSchema>;

interface AddTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<Tag>;
}

export function AddTagDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddTagDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoTagEnabled, setAutoTagEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch texts to get count
  const { data: texts = [] } = useTexts();
  const textCount = texts.length;

  // Batch auto-tag hook
  const { batchAutoTag, progress } = useBatchAutoTag();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
  });

  const handleFormSubmit = async (data: TagFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      // Step 1: Create the tag
      setStatusMessage("Creating tag...");
      const createdTag = await onSubmit(data.name);

      // Step 2: If auto-tag is enabled, batch process all texts
      if (autoTagEnabled && textCount > 0) {
        setStatusMessage("Starting auto-tagging...");

        const result = await batchAutoTag({
          newTagId: createdTag.id,
          onProgress: (prog) => {
            setStatusMessage(
              `Analyzing text ${prog.current} of ${prog.total}...`
            );
          },
        });

        // Show completion summary
        if (result.errorCount > 0) {
          setStatusMessage(
            `Complete! Tagged ${result.successCount} of ${result.totalProcessed} texts. ${result.errorCount} failed.`
          );
          // Show errors if any
          if (result.errors.length > 0) {
            console.error('Batch auto-tag errors:', result.errors);
          }
        } else {
          setStatusMessage(
            `Complete! Successfully tagged ${result.successCount} of ${result.totalProcessed} texts.`
          );
        }

        // Wait a moment to show the completion message
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Reset form and close dialog
      reset();
      setAutoTagEnabled(false);
      setStatusMessage(null);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create tag"
      );
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        reset();
        setErrorMessage(null);
        setStatusMessage(null);
        setAutoTagEnabled(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tag</DialogTitle>
          <DialogDescription>
            Create a new tag to organize your texts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4">
            <div>
              <Input
                {...register("name")}
                placeholder="Enter tag name..."
                disabled={isSubmitting}
                autoFocus
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Auto-tag checkbox */}
            {textCount > 0 && (
              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="auto-tag"
                  checked={autoTagEnabled}
                  onCheckedChange={(checked) =>
                    setAutoTagEnabled(checked === true)
                  }
                  disabled={isSubmitting}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="auto-tag"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Automatically tag existing texts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    This will analyze all {textCount} text{textCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Status message during processing */}
            {statusMessage && (
              <div className="bg-primary/10 border border-primary text-primary px-4 py-3 rounded-md">
                <p className="text-sm">{statusMessage}</p>
                {progress.total > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-primary/20 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(progress.current / progress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Add Tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
