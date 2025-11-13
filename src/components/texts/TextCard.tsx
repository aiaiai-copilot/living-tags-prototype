import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tags/TagBadge";
import { useAutoTag } from "@/hooks/useAutoTag";
import type { TextWithTags } from "@/types";
import { RefreshCw } from "lucide-react";

interface TextCardProps {
  text: TextWithTags;
}

export function TextCard({ text }: TextCardProps) {
  const autoTag = useAutoTag();

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

  // Sort tags by confidence in descending order (highest first)
  const sortedTags = [...text.tags].sort((a, b) => b.confidence - a.confidence);

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
        {text.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sortedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                confidence={tag.confidence}
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No tags assigned</span>
        )}
      </CardContent>
    </Card>
  );
}
