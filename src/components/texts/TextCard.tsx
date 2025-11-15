import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tags/TagBadge";
import { InlineTagEditor } from "@/components/tags/InlineTagEditor";
import { useAutoTag } from "@/hooks/useAutoTag";
import { useAddManualTag } from "@/hooks/useAddManualTag";
import { useRemoveTag } from "@/hooks/useRemoveTag";
import { useDeleteText } from "@/hooks/useDeleteText";
import { useTags } from "@/hooks/useTags";
import type { TextWithTags } from "@/types";
import { RefreshCw, Trash2 } from "lucide-react";

interface TextCardProps {
  text: TextWithTags;
}

export function TextCard({ text }: TextCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const autoTag = useAutoTag();
  const addManualTag = useAddManualTag();
  const removeTag = useRemoveTag();
  const deleteText = useDeleteText();
  const { data: availableTags = [] } = useTags();

  const handleRetag = async () => {
    try {
      await autoTag.mutateAsync({
        textId: text.id,
        content: text.content,
      });
    } catch (error) {
      console.error("Failed to re-tag text:", error);
    }
  };

  const handleTagAdded = async (tagId: string) => {
    try {
      await addManualTag.mutateAsync({
        textId: text.id,
        tagId,
      });
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleTagRemoved = async (tagId: string) => {
    try {
      await removeTag.mutateAsync({
        textId: text.id,
        tagId,
      });
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      await deleteText.mutateAsync(text.id);
    } catch (error) {
      console.error("Failed to delete text:", error);
    }
    setConfirmDelete(false);
  };

  // Sort tags: manual tags first, then by confidence (highest first)
  const sortedTags = [...text.tags].sort((a, b) => {
    // Manual tags come first
    if (a.source === 'manual' && b.source === 'ai') return -1;
    if (a.source === 'ai' && b.source === 'manual') return 1;
    // Within same source, sort by confidence
    return b.confidence - a.confidence;
  });

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-3 mb-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap flex-1">
            {text.content}
          </p>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetag}
              disabled={autoTag.isPending}
              title="Re-tag with AI"
            >
              <RefreshCw
                className={`h-4 w-4 ${autoTag.isPending ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant={confirmDelete ? "destructive" : "ghost"}
              size="sm"
              onClick={handleDelete}
              disabled={deleteText.isPending}
              title={confirmDelete ? "Click again to confirm" : "Delete text"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {sortedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              confidence={tag.confidence}
              source={tag.source}
              onRemove={() => handleTagRemoved(tag.id)}
            />
          ))}
          <InlineTagEditor
            currentTagIds={text.tags.map(t => t.id)}
            availableTags={availableTags}
            onTagAdded={handleTagAdded}
            disabled={addManualTag.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
