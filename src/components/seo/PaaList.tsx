import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PaaListProps {
  aiPaa: Array<{ question: string; intent: string }>;
  serpPaa: Array<{ question: string; url: string; snippet: string }>;
  selectedPaa: Set<string>;
  onTogglePaa: (question: string) => void;
}

const intentColor: Record<string, string> = {
  informational: "bg-blue-100 text-blue-800",
  commercial: "bg-amber-100 text-amber-800",
  transactional: "bg-green-100 text-green-800",
  local: "bg-purple-100 text-purple-800",
};

function IntentBadge({ intent }: { intent: string }) {
  const key = intent.toLowerCase();
  const color = intentColor[key] || "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {intent}
    </span>
  );
}

export function PaaList({ aiPaa, serpPaa, selectedPaa, onTogglePaa }: PaaListProps) {
  const serpQuestions = new Set(serpPaa.map((p) => p.question.toLowerCase()));

  return (
    <div className="space-y-2">
      {serpPaa.map((p, i) => {
        const isSelected = selectedPaa.has(p.question);
        return (
          <button
            key={`serp-${i}`}
            onClick={() => onTogglePaa(p.question)}
            className={`flex w-full items-start gap-2 rounded-md border p-3 text-left transition-colors ${
              isSelected
                ? "border-green-500 bg-green-50"
                : "border-border bg-card hover:bg-accent/50"
            }`}
          >
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              isSelected ? "border-green-600 bg-green-600 text-white" : "border-border"
            }`}>
              {isSelected && <Check className="h-3 w-3" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{p.question}</p>
              {p.snippet && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.snippet}</p>}
            </div>
            <div className="flex shrink-0 gap-1.5 items-center">
              <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 h-5 hover:bg-green-600">DataForSEO ✓</Badge>
            </div>
          </button>
        );
      })}
      {aiPaa
        .filter((p) => !serpQuestions.has(p.question.toLowerCase()))
        .map((p, i) => {
          const isSelected = selectedPaa.has(p.question);
          return (
            <button
              key={`ai-${i}`}
              onClick={() => onTogglePaa(p.question)}
              className={`flex w-full items-start gap-2 rounded-md border p-3 text-left transition-colors ${
                isSelected
                  ? "border-green-500 bg-green-50"
                  : "border-border/60 bg-card/50 hover:bg-accent/50"
              }`}
            >
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                isSelected ? "border-green-600 bg-green-600 text-white" : "border-border"
              }`}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{p.question}</p>
              </div>
              <div className="flex shrink-0 gap-1.5 items-center">
                <IntentBadge intent={p.intent} />
                <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 h-5 hover:bg-orange-500">Kie.AI</Badge>
              </div>
            </button>
          );
        })}
    </div>
  );
}
