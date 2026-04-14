import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/ProcessLogger";
import { useLogContext } from "@/context/LogContext";
import { Button } from "@/components/ui/button";
import { X, Copy, RotateCcw, CheckCircle, AlertTriangle, XCircle, Loader2, MinusCircle, Bug } from "lucide-react";

function statusIcon(status: LogEntry["status"]) {
  switch (status) {
    case "running":
      return <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />;
    case "success":
      return <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />;
    case "warning":
      return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
    case "skipped":
      return <MinusCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
  }
}

function statusColor(status: LogEntry["status"]) {
  switch (status) {
    case "running": return "text-blue-300";
    case "success": return "text-green-300";
    case "warning": return "text-yellow-300";
    case "error": return "text-red-300";
    case "skipped": return "text-slate-500";
  }
}

export function LogPanel() {
  const {
    entries, isVisible, setVisible, totalSteps,
    processName, onRetry,
  } = useLogContext();

  const scrollRef = useRef<HTMLDivElement>(null);

  const isRunning = entries.some(e => e.status === "running");
  const hasError = entries.some(e => e.status === "error");
  const doneCount = entries.filter(e => ["success", "warning", "error", "skipped"].includes(e.status)).length;
  const progress = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  const isComplete = !isRunning && entries.length > 0 && doneCount >= totalSteps;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const copyLog = () => {
    const text = entries
      .map(e => `[${e.status.toUpperCase()}] ${e.stepName}: ${e.message}${e.durationMs ? ` (${e.durationMs}ms)` : ""}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  // Nothing to show
  if (entries.length === 0) return null;

  // Collapsed floating button
  if (!isVisible) {
    const dotColor = hasError ? "bg-red-500" : isRunning ? "bg-blue-500" : "bg-green-500";
    return (
      <button
        onClick={() => setVisible(true)}
        className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs font-bold text-white transition-all hover:scale-105 ${
          hasError ? "bg-red-600 hover:bg-red-700" : isRunning ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${dotColor} ${isRunning ? "animate-pulse" : ""}`} />
        <Bug className="h-3.5 w-3.5" />
        Debug Log ({entries.length})
      </button>
    );
  }

  // Dot color for header
  const headerDotClass = hasError
    ? "bg-red-500"
    : isRunning
    ? "bg-blue-500 animate-pulse"
    : "bg-green-500";

  // Progress bar color
  const barColor = hasError ? "bg-red-500" : isComplete ? "bg-green-500" : "bg-blue-500";

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[420px] max-h-[480px] rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
      style={{ backgroundColor: "#0f172a", fontFamily: "ui-monospace, monospace" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0" style={{ backgroundColor: "#1e293b" }}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${headerDotClass}`} />
          <span className="text-xs font-bold text-slate-200">{processName || "Prozess"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700" onClick={copyLog}>
            <Copy className="h-3 w-3 mr-1" /> Kopieren
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => setVisible(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {(isRunning || isComplete) && totalSteps > 0 && (
        <div className="px-3 py-2" style={{ backgroundColor: "#1e293b", borderTop: "1px solid #334155" }}>
          <div className="flex justify-between text-[9px] text-slate-400 mb-1">
            <span>Fortschritt · {doneCount}/{totalSteps} Schritte</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ maxHeight: "300px" }}>
        {entries.map((entry, i) => (
          <div key={`${entry.stepName}-${entry.stepIndex}-${i}`} className="flex items-start gap-2 px-3 py-1.5 hover:bg-slate-800/50" style={{ borderBottom: "1px solid #1e293b" }}>
            <div className="mt-0.5">{statusIcon(entry.status)}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-medium ${statusColor(entry.status)}`}>
                {entry.stepName}
              </div>
              <div className="text-[9px] text-slate-500 truncate">{entry.message}</div>

              {/* Error detail with hint */}
              {entry.status === "error" && entry.detail && typeof entry.detail === "object" && (entry.detail as any)?.hint && (
                <div className="mt-1 pl-2 text-[9px] leading-relaxed" style={{ borderLeft: "2px solid #ef4444" }}>
                  <div className="text-red-400">{(entry.detail as any).message || "Fehler"}</div>
                  <div className="text-slate-400">{(entry.detail as any).hint}</div>
                </div>
              )}

              {/* Warning detail */}
              {entry.status === "warning" && entry.detail && (
                <div className="mt-1 pl-2 text-[9px] text-yellow-300/80 leading-relaxed" style={{ borderLeft: "2px solid #fde68a" }}>
                  {typeof entry.detail === "string" ? entry.detail : JSON.stringify(entry.detail)}
                </div>
              )}
            </div>
            {entry.durationMs != null && (
              <span className="text-[9px] text-slate-600 shrink-0 tabular-nums">{entry.durationMs}ms</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between shrink-0" style={{ backgroundColor: "#1e293b", borderTop: "1px solid #334155" }}>
        <span className="text-[9px] text-slate-500">
          {isRunning ? "Läuft..." : hasError ? "Fehler aufgetreten" : isComplete ? "Abgeschlossen" : `${entries.length} Einträge`}
        </span>
        {hasError && onRetry && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/50" onClick={onRetry}>
            <RotateCcw className="h-3 w-3 mr-1" /> Erneut versuchen
          </Button>
        )}
      </div>
    </div>
  );
}
