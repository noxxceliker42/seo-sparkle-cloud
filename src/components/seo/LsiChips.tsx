import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface LsiChipsProps {
  terms: string[];
  selected: Set<string>;
  onToggle: (term: string) => void;
}

export function LsiChips({ terms, selected, onToggle }: LsiChipsProps) {
  if (!terms.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {terms.map((term) => {
        const isSelected = selected.has(term);
        return (
          <button
            key={term}
            onClick={() => onToggle(term)}
            className="focus:outline-none"
          >
            <Badge
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer select-none gap-1 px-3 py-1.5 text-sm transition-colors"
            >
              {isSelected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-40" />}
              {term}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
