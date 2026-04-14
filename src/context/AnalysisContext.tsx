import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ── Types ── */

interface AnalysisResult {
  kieai: unknown;
  serp: unknown;
  volume: unknown;
}

interface AnalysisState {
  keyword: string;
  mode: string;
  isRunning: boolean;
  error: string;
  jobId: string;
  result: AnalysisResult | null;
  savedAnalysisId: string | null;
}

interface StartAnalysisInput {
  keyword: string;
  mode: string;
  firm?: string | null;
  city?: string | null;
}

interface AnalysisContextValue extends AnalysisState {
  startAnalysis: (input: StartAnalysisInput) => Promise<void>;
  update: (partial: Partial<AnalysisState>) => void;
  clearResult: () => void;
  clearError: () => void;
  clearAnalysis: () => void;
}

const EMPTY_STATE: AnalysisState = {
  keyword: "",
  mode: "standard",
  isRunning: false,
  error: "",
  jobId: "",
  result: null,
  savedAnalysisId: null,
};

const SESSION_KEY = "seo_os_analysis_v2";

function readStorage(): Partial<AnalysisState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStorage(state: AnalysisState) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        keyword: state.keyword,
        mode: state.mode,
        isRunning: state.isRunning,
        jobId: state.jobId,
        savedAnalysisId: state.savedAnalysisId,
        // Don't persist full result to avoid quota issues
      }),
    );
  } catch {}
}

function clearStorage() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

const AnalysisContext = createContext<AnalysisContextValue>({
  ...EMPTY_STATE,
  startAnalysis: async () => {},
  update: () => {},
  clearResult: () => {},
  clearError: () => {},
  clearAnalysis: () => {},
});

/* ── Provider ── */

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, _setState] = useState<AnalysisState>(() => {
    const stored = readStorage();
    if (stored.isRunning && stored.jobId) {
      return {
        ...EMPTY_STATE,
        isRunning: true,
        keyword: stored.keyword || "",
        mode: stored.mode || "standard",
        jobId: stored.jobId,
        savedAnalysisId: stored.savedAnalysisId || null,
      };
    }
    return {
      ...EMPTY_STATE,
      savedAnalysisId: stored.savedAnalysisId || null,
    };
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

  const update = useCallback((partial: Partial<AnalysisState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, [setState]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /* Auto-save completed analysis to saved_analyses */
  const autoSaveAnalysis = useCallback(async (kw: string, result: AnalysisResult, mode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("firm_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data: saved } = await supabase
        .from("saved_analyses")
        .insert({
          user_id: user.id,
          firm_id: profile?.firm_id || null,
          keyword: kw,
          mode,
          result_kieai: result.kieai as import("@/integrations/supabase/types").Json,
          result_serp: result.serp as import("@/integrations/supabase/types").Json,
          result_volume: result.volume as import("@/integrations/supabase/types").Json,
          analysis_status: "completed",
        })
        .select("id")
        .single();

      if (saved?.id) {
        console.log("Analyse gespeichert:", saved.id);
        return saved.id;
      }
    } catch (err) {
      console.error("Auto-save fehlgeschlagen:", err);
    }
    return null;
  }, []);

  const applyCompleted = useCallback(async (keyword: string, resultJson: unknown, mode: string, notify = true) => {
    stopPolling();

    // Parse result_json from analysis_jobs format (old) or structured format
    const raw = resultJson as Record<string, unknown>;
    const result: AnalysisResult = {
      kieai: raw?.analysis || raw?.kieai || null,
      serp: raw?.serp || null,
      volume: raw?.volume || null,
    };

    // Auto-save to saved_analyses
    const savedId = await autoSaveAnalysis(keyword, result, mode);

    setState({
      isRunning: false,
      jobId: "",
      keyword,
      mode,
      result,
      error: "",
      savedAnalysisId: savedId || null,
    });

    if (notify) toast.success("Analyse abgeschlossen — Ergebnisse wurden geladen");
  }, [stopPolling, setState, autoSaveAnalysis]);

  const applyError = useCallback((keyword: string, message: string, notify = true) => {
    stopPolling();
    clearStorage();
    setState({
      ...EMPTY_STATE,
      keyword,
      error: message,
    });
    if (notify) toast.error(message);
  }, [stopPolling, setState]);

  const pollJob = useCallback(async (jobId: string) => {
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("status, keyword, mode, result_json, error_message")
      .eq("id", jobId)
      .maybeSingle();

    if (error || !data) return null;

    const jobKeyword = data.keyword || stateRef.current.keyword;

    if (data.status === "completed" && data.result_json) {
      void applyCompleted(jobKeyword, data.result_json, data.mode || stateRef.current.mode);
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
      void (async () => {
        const { data } = await supabase
          .from("analysis_jobs")
          .select("status, keyword, mode, result_json, error_message")
          .eq("id", stored.jobId as string)
          .maybeSingle();

        if (!data) {
          clearStorage();
          setState(EMPTY_STATE);
          return;
        }

        const kw = stored.keyword || data.keyword || "";

        if (data.status === "completed" && data.result_json) {
          void applyCompleted(kw, data.result_json, data.mode || "standard", false);
        } else if (data.status === "error") {
          applyError(kw, data.error_message || "Fehler", false);
        } else {
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
      mode,
      jobId: job.id,
      result: null,
      error: "",
      savedAnalysisId: null,
    });

    startPolling(job.id);

    // Fire-and-forget
    supabase.functions
      .invoke("analyze-orchestrator", {
        body: { jobId: job.id, keyword: trimmed, firm: firm || undefined, city: city || undefined },
      })
      .then(({ error, data }) => {
        if (error || data?.error) {
          const msg = error?.message || data?.error || "Analyse fehlgeschlagen";
          void supabase
            .from("analysis_jobs")
            .update({
              status: "error",
              error_message: msg,
              completed_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        }
      })
      .catch((err) => {
        console.error("Orchestrator invoke error:", err);
        void supabase
          .from("analysis_jobs")
          .update({
            status: "error",
            error_message: (err as Error).message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      });
  }, [stopPolling, startPolling, setState]);

  const clearResult = useCallback(() => {
    setState((prev) => ({ ...prev, result: null }));
  }, [setState]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "" }));
  }, [setState]);

  const clearAnalysis = useCallback(() => {
    stopPolling();
    clearStorage();
    _setState(EMPTY_STATE);
    stateRef.current = EMPTY_STATE;
  }, [stopPolling]);

  return (
    <AnalysisContext.Provider
      value={{
        ...state,
        startAnalysis,
        update,
        clearResult,
        clearError,
        clearAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}
