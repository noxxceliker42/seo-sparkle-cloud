import { Badge } from "@/components/ui/badge";

interface PaaListProps {
  aiPaa: Array<{ question: string; intent: string }>;
  serpPaa: Array<{ question: string; url: string; snippet: string }>;
}

export function PaaList({ aiPaa, serpPaa }: PaaListProps) {
  // Merge: SERP PAA marked as verified, AI PAA as suggestions
  const serpQuestions = new Set(serpPaa.map((p) => p.question.toLowerCase()));

  return (
    <div className="space-y-2">
      {serpPaa.map((p, i) => (
        <div key={`serp-${i}`} className="flex items-start gap-2 rounded-md border border-border bg-card p-3">
          <Badge variant="default" className="mt-0.5 shrink-0 text-xs">SERP</Badge>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{p.question}</p>
            {p.snippet && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.snippet}</p>}
          </div>
        </div>
      ))}
      {aiPaa
        .filter((p) => !serpQuestions.has(p.question.toLowerCase()))
        .map((p, i) => (
          <div key={`ai-${i}`} className="flex items-start gap-2 rounded-md border border-border/60 bg-card/50 p-3">
            <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">KI</Badge>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{p.question}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Intent: {p.intent}</p>
            </div>
          </div>
        ))}
    </div>
  );
}
