import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce logic: wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [localValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="w-full max-w-2xl">
      <Input
        type="text"
        placeholder="Search by tags..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="w-full"
      />
    </div>
  );
}
