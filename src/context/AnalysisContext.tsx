import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisJobResult {
  analysis?: unknown;
  serp?: unknown;
  volume?: unknown;
  rawJson?: string;
}

interface AnalysisState {
  isRunning: boolean;
  keyword: string;
  jobId: string;
  result: AnalysisJobResult | null;
  error: string;
}

interface StartAnalysisInput {
  keyword: string;
  mode: string;
  firm?: string | null;
  city?: string | null;
}

interface AnalysisContextValue extends AnalysisState {
  startAnalysis: (input: StartAnalysisInput) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
}

const EMPTY_STATE: AnalysisState = {
  isRunning: false,
  keyword: "",
  jobId: "",
  result: null,
  error: "",
};

const AnalysisContext = createContext<AnalysisContextValue>({
  ...EMPTY_STATE,
  startAnalysis: async () => {},
  clearResult: () => {},
  clearError: () => {},
});

const STORAGE_KEY = "seo_os_analysis";

function readStorage(): Partial<AnalysisState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStorage(state: AnalysisState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      isRunning: state.isRunning,
      keyword: state.keyword,
      jobId: state.jobId,
      // Don't persist full result to avoid storage quota issues
    }));
  } catch {
    // ignore
  }
}

function clearStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, _setState] = useState<AnalysisState>(() => {
    const stored = readStorage();
    if (stored.isRunning && stored.jobId) {
      return {
        isRunning: true,
        keyword: stored.keyword || "",
        jobId: stored.jobId,
        result: null,
        error: "",
      };
    }
    return EMPTY_STATE;
  });

  const stateRef = useRef(state);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setState = useCallback((updater: AnalysisState | ((prev: AnalysisState) => AnalysisState)) => {
    _setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      stateRef.current = next;
      writeStorage(next);
      return next;
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const applyCompleted = useCallback((keyword: string, result: AnalysisJobResult, notify = true) => {
    stopPolling();
    clearStorage();
    setState({
      isRunning: false,
      jobId: "",
      keyword,
      result,
      error: "",
    });
    if (notify) toast.success("Analyse abgeschlossen — Ergebnisse wurden geladen");
  }, [stopPolling, setState]);

  const applyError = useCallback((keyword: string, message: string, notify = true) => {
    stopPolling();
    clearStorage();
    setState({
      isRunning: false,
      jobId: "",
      keyword,
      result: null,
      error: message,
    });
    if (notify) toast.error(message);
  }, [stopPolling, setState]);

  const pollJob = useCallback(async (jobId: string) => {
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("status, keyword, result_json, error_message")
      .eq("id", jobId)
      .single();

    if (error || !data) return null;

    const jobKeyword = data.keyword || stateRef.current.keyword;

    if (data.status === "completed" && data.result_json) {
      applyCompleted(jobKeyword, data.result_json as AnalysisJobResult);
      return data;
    }

    if (data.status === "error") {
      applyError(jobKeyword, data.error_message || "Fehler bei der Analyse");
      return data;
    }

    return data;
  }, [applyCompleted, applyError]);

  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      void pollJob(jobId);
    }, 2500);
  }, [pollJob]);

  // Restore on mount
  useEffect(() => {
    const stored = readStorage();
    if (stored.isRunning && stored.jobId) {
      // Check current status
      void (async () => {
        const { data } = await supabase
          .from("analysis_jobs")
          .select("status, keyword, result_json, error_message")
          .eq("id", stored.jobId)
          .single();

        if (!data) {
          clearStorage();
          setState(EMPTY_STATE);
          return;
        }

        const kw = stored.keyword || data.keyword || "";

        if (data.status === "completed" && data.result_json) {
          applyCompleted(kw, data.result_json as AnalysisJobResult, false);
        } else if (data.status === "error") {
          applyError(kw, data.error_message || "Fehler", false);
        } else {
          // Still running — start polling
          startPolling(stored.jobId!);
        }
      })();
    }

    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Visibility change — resume polling after tab switch
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      const cur = stateRef.current;
      if (cur.isRunning && cur.jobId && !pollingRef.current) {
        startPolling(cur.jobId);
        // Also do an immediate check
        void pollJob(cur.jobId);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [startPolling, pollJob]);

  const startAnalysis = useCallback(async ({ keyword, mode, firm, city }: StartAnalysisInput) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    stopPolling();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setState((prev) => ({ ...prev, error: "Bitte melde dich an." }));
      return;
    }

    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert({ user_id: user.id, keyword: trimmed, mode, status: "running" })
      .select("id, keyword")
      .single();

    if (jobError || !job) {
      setState((prev) => ({ ...prev, error: jobError?.message || "Job konnte nicht angelegt werden." }));
      return;
    }

    setState({
      isRunning: true,
      keyword: trimmed,
      jobId: job.id,
      result: null,
      error: "",
    });

    // Start polling BEFORE the edge function call
    startPolling(job.id);

    // Fire-and-forget: the orchestrator runs server-side
    supabase.functions.invoke("analyze-orchestrator", {
      body: { jobId: job.id, keyword: trimmed, firm: firm || undefined, city: city || undefined },
    }).then(({ error, data }) => {
      if (error || data?.error) {
        const msg = error?.message || data?.error || "Analyse fehlgeschlagen";
        // Update job in DB so polling picks it up
        void supabase.from("analysis_jobs").update({
          status: "error",
          error_message: msg,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
      }
    }).catch((err) => {
      console.error("Orchestrator invoke error:", err);
      void supabase.from("analysis_jobs").update({
        status: "error",
        error_message: (err as Error).message,
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
    });
  }, [stopPolling, startPolling, setState]);

  const clearResult = useCallback(() => {
    setState((prev) => ({ ...prev, result: null }));
  }, [setState]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "" }));
  }, [setState]);

  return (
    <AnalysisContext.Provider value={{
      ...state,
      startAnalysis,
      clearResult,
      clearError,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}
