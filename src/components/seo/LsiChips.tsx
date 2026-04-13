import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, CheckCheck, XCircle } from "lucide-react";

interface LsiChipsProps {
  terms: string[];
  selected: Set<string>;
  rejected: Set<string>;
  onToggle: (term: string) => void;
  onSelectAll: () => void;
  onRejectAll: () => void;
}

export function LsiChips({ terms, selected, rejected, onToggle, onSelectAll, onRejectAll }: LsiChipsProps) {
  if (!terms.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSelectAll} className="h-8 gap-1 text-xs">
          <CheckCheck className="h-3.5 w-3.5" />
          Alle auswählen
        </Button>
        <Button variant="outline" size="sm" onClick={onRejectAll} className="h-8 gap-1 text-xs">
          <XCircle className="h-3.5 w-3.5" />
          Alle ablehnen
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => {
          const isSelected = selected.has(term);
          const isRejected = rejected.has(term);
          return (
            <button
              key={term}
              onClick={() => onToggle(term)}
              className="focus:outline-none"
            >
              <Badge
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer select-none gap-1 px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                    : isRejected
                    ? "line-through opacity-50 text-muted-foreground"
                    : ""
                }`}
              >
                {isSelected ? (
                  <Check className="h-3 w-3" />
                ) : isRejected ? (
                  <X className="h-3 w-3" />
                ) : null}
                {term}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
