import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";
import { useState } from "react";

interface TagBadgeProps {
  name: string;
  confidence: number; // 0.0 to 1.0
  source: 'ai' | 'manual';
  onRemove?: () => void;
}

export function TagBadge({ name, confidence, source, onRemove }: TagBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Convert confidence to percentage for display
  const confidencePercent = Math.round(confidence * 100);

  // Manual tags: solid background with checkmark, no percentage
  // AI tags: light gray background with confidence percentage
  const getBadgeClasses = () => {
    if (source === 'manual') {
      // Manual tags: solid primary color, more prominent
      return "bg-primary text-primary-foreground border-primary";
    } else {
      // AI tags: light gray, muted appearance (outlined style)
      return "bg-secondary text-secondary-foreground border-secondary";
    }
  };

  return (
    <div
      className="relative inline-flex group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Badge className={cn("border", getBadgeClasses())}>
        {name} {source === 'manual' ? (
          <Check className="ml-1 h-3 w-3 inline" />
        ) : (
          `${confidencePercent}%`
        )}
      </Badge>
      {onRemove && isHovered && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-2 -top-2 h-5 w-5 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
