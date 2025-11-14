import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  confidence: number; // 0.0 to 1.0
}

export function TagBadge({ name, confidence }: TagBadgeProps) {
  // Convert confidence to percentage for display
  const confidencePercent = Math.round(confidence * 100);

  // Determine background and text color classes based on confidence ranges
  // Using Tailwind classes for discrete confidence levels
  const getConfidenceClasses = () => {
    if (confidence >= 0.9) {
      return "bg-gray-900 text-white border-gray-900";
    } else if (confidence >= 0.75) {
      return "bg-gray-700 text-white border-gray-700";
    } else if (confidence >= 0.6) {
      return "bg-gray-600 text-white border-gray-600";
    } else if (confidence >= 0.4) {
      return "bg-gray-400 text-gray-900 border-gray-400";
    } else if (confidence >= 0.25) {
      return "bg-gray-300 text-gray-900 border-gray-300";
    } else {
      return "bg-gray-200 text-gray-900 border-gray-200";
    }
  };

  return (
    <Badge className={cn("border", getConfidenceClasses())}>
      {name} ({confidencePercent}%)
    </Badge>
  );
}
