import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tags/TagBadge";
import { InlineTagEditor } from "@/components/tags/InlineTagEditor";
import { useAutoTag } from "@/hooks/useAutoTag";
import { useAddManualTag } from "@/hooks/useAddManualTag";
import { useRemoveTag } from "@/hooks/useRemoveTag";
import { useTags } from "@/hooks/useTags";
import type { TextWithTags } from "@/types";
import { RefreshCw } from "lucide-react";

interface TextCardProps {
  text: TextWithTags;
}

export function TextCard({ text }: TextCardProps) {
  const autoTag = useAutoTag();
  const addManualTag = useAddManualTag();
  const removeTag = useRemoveTag();
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetag}
            disabled={autoTag.isPending}
            className="shrink-0"
            title="Re-tag with AI"
          >
            <RefreshCw
              className={`h-4 w-4 ${autoTag.isPending ? "animate-spin" : ""}`}
            />
          </Button>
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
