import { TextCard } from "./TextCard";
import type { TextWithTags } from "@/types";

interface TextListProps {
  texts: TextWithTags[];
  loading: boolean;
}

export function TextList({ texts, loading }: TextListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading texts...</p>
        </div>
      </div>
    );
  }

  if (texts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No texts found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search or add a new text
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1">
      {texts.map((text) => (
        <TextCard key={text.id} text={text} />
      ))}
    </div>
  );
}
