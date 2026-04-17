import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelCurrentJob } from "@/hooks/useGenerationJob";

const STORAGE_KEY = "seo_os_generation_job";
const POLL_MS = 1500;
const TIMEOUT_MS = 10 * 60 * 1000;

interface StoredJob {
  jobId: string;
  keyword?: string;
  timestamp?: string;
}

function readJob(): StoredJob | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.jobId) return null;
    // Auto-timeout
    if (parsed.timestamp) {
      const age = Date.now() - new Date(parsed.timestamp).getTime();
      if (age > TIMEOUT_MS) {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem("currentGenerationJob");
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Globaler Floating-Indikator: zeigt unten rechts „Seite wird generiert…"
 * mit Abbrechen-Button — egal auf welcher Route der Nutzer ist.
 * Pollt sessionStorage alle 1.5s, damit er auch zwischen Hook-Instanzen
 * synchron bleibt.
 */
export function GlobalGenerationIndicator() {
  const [job, setJob] = useState<StoredJob | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setJob(readJob());
    const interval = setInterval(() => {
      setJob((prev) => {
        const next = readJob();
        // Avoid unnecessary re-renders
        if (prev?.jobId === next?.jobId) return prev;
        return next;
      });
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!job) return null;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelCurrentJob();
      setJob(null);
      toast.error("Generierung abgebrochen", {
        description: "Die Generierung wurde gestoppt.",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-red-200 bg-card/95 px-4 py-3 shadow-lg backdrop-blur"
    >
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      <span className="text-sm text-muted-foreground">
        Seite wird generiert{job.keyword ? `: „${job.keyword}"` : "…"}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="ml-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        onClick={handleCancel}
        disabled={cancelling}
      >
        {cancelling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        Abbrechen
      </Button>
    </div>
  );
}
