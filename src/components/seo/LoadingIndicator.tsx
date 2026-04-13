import { Loader2, Check, AlertCircle } from "lucide-react";

export type LoadState = "idle" | "loading" | "done" | "error";

interface LoadingIndicatorProps {
  label: string;
  state: LoadState;
  error?: string;
}

export function LoadingIndicator({ label, state, error }: LoadingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {state === "loading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      {state === "done" && <Check className="h-4 w-4 text-green-600" />}
      {state === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
      {state === "idle" && <span className="h-4 w-4 rounded-full border border-border" />}
      <span className={state === "error" ? "text-destructive" : state === "done" ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      {error && <span className="text-xs text-destructive">— {error}</span>}
    </div>
  );
}
