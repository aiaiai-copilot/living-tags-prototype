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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const textSchema = z.object({
  text: z.string().min(10, "Text must be at least 10 characters long"),
});

type TextFormData = z.infer<typeof textSchema>;

interface AddTextModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => Promise<void>;
}

export function AddTextModal({
  open,
  onOpenChange,
  onSubmit,
}: AddTextModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TextFormData>({
    resolver: zodResolver(textSchema),
  });

  const handleFormSubmit = async (data: TextFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(data.text);
      reset();
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add text"
      );
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
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Text</DialogTitle>
          <DialogDescription>
            Enter text to analyze and tag with AI.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4">
            <div>
              <Textarea
                {...register("text")}
                placeholder="Enter your text here..."
                className="min-h-[150px]"
                disabled={isSubmitting}
              />
              {errors.text && (
                <p className="text-sm text-destructive mt-1">
                  {errors.text.message}
                </p>
              )}
            </div>

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
              {isSubmitting ? "Analyzing with AI..." : "Add Text"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
