import { useCallback, useEffect, useRef, useState } from "react";
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

const STORAGE_JOB_ID = "analysisJobId";
const STORAGE_KEYWORD = "analysisKeyword";

function readStoredJob() {
  try {
    return {
      jobId: sessionStorage.getItem(STORAGE_JOB_ID),
      keyword: sessionStorage.getItem(STORAGE_KEYWORD),
    };
  } catch {
    return { jobId: null, keyword: null };
  }
}

function writeStoredJob(jobId: string, keyword: string) {
  try {
    sessionStorage.setItem(STORAGE_JOB_ID, jobId);
    sessionStorage.setItem(STORAGE_KEYWORD, keyword);
  } catch {
    // ignore storage errors
  }
}

function clearStoredJob() {
  try {
    sessionStorage.removeItem(STORAGE_JOB_ID);
    sessionStorage.removeItem(STORAGE_KEYWORD);
  } catch {
    // ignore storage errors
  }
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    isRunning: false,
    keyword: "",
    jobId: "",
    result: null,
    error: "",
  });

  const stateRef = useRef(state);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const applyCompletedState = useCallback((keyword: string, result: AnalysisJobResult, notify = true) => {
    stopPolling();
    clearStoredJob();
    setState((prev) => ({
      ...prev,
      isRunning: false,
      jobId: "",
      keyword,
      result,
      error: "",
    }));
    if (notify) {
      toast.success("Analyse abgeschlossen — Ergebnisse wurden geladen");
    }
  }, [stopPolling]);

  const applyErrorState = useCallback((keyword: string, message: string, notify = true) => {
    stopPolling();
    clearStoredJob();
    setState((prev) => ({
      ...prev,
      isRunning: false,
      jobId: "",
      keyword,
      error: message,
    }));
    if (notify) {
      toast.error(message);
    }
  }, [stopPolling]);

  const pollJob = useCallback(async (jobId: string) => {
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("status, keyword, result_json, error_message")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      return null;
    }

    const jobKeyword = data.keyword || stateRef.current.keyword;

    if (data.status === "completed" && data.result_json) {
      applyCompletedState(jobKeyword, data.result_json as AnalysisJobResult);
      return data;
    }

    if (data.status === "error") {
      applyErrorState(jobKeyword, data.error_message || "Fehler bei der Analyse");
      return data;
    }

    return data;
  }, [applyCompletedState, applyErrorState]);

  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      void pollJob(jobId);
    }, 2000);
  }, [pollJob]);

  const restoreJob = useCallback(async (notifyResume = false) => {
    const { jobId, keyword } = readStoredJob();
    if (!jobId) return;

    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("status, keyword, result_json, error_message")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      clearStoredJob();
      stopPolling();
      return;
    }

    const jobKeyword = keyword || data.keyword || stateRef.current.keyword;

    if (data.status === "running") {
      setState((prev) => ({
        ...prev,
        isRunning: true,
        keyword: jobKeyword,
        jobId,
        result: null,
        error: "",
      }));
      startPolling(jobId);
      if (notifyResume) {
        toast.info("Analyse wird fortgesetzt");
      }
      return;
    }

    if (data.status === "completed" && data.result_json) {
      applyCompletedState(jobKeyword, data.result_json as AnalysisJobResult, notifyResume);
      return;
    }

    if (data.status === "error") {
      applyErrorState(jobKeyword, data.error_message || "Fehler bei der Analyse", notifyResume);
      return;
    }

    clearStoredJob();
    stopPolling();
  }, [applyCompletedState, applyErrorState, startPolling, stopPolling]);

  useEffect(() => {
    void restoreJob(false);

    return () => {
      stopPolling();
    };
  }, [restoreJob, stopPolling]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const { jobId } = readStoredJob();
      if (!jobId) return;

      if (stateRef.current.isRunning && !pollingRef.current) {
        startPolling(jobId);
      }

      void restoreJob(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [restoreJob, startPolling]);

  const startAnalysis = useCallback(async ({ keyword, mode, firm, city }: StartAnalysisInput) => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;

    stopPolling();
    clearStoredJob();
    setState((prev) => ({
      ...prev,
      isRunning: false,
      jobId: "",
      keyword: trimmedKeyword,
      result: null,
      error: "",
    }));

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setState((prev) => ({
        ...prev,
        error: "Bitte melde dich an, um eine Analyse zu starten.",
      }));
      return;
    }

    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert({
        user_id: user.id,
        keyword: trimmedKeyword,
        mode,
        status: "running",
      })
      .select("id, keyword")
      .single();

    if (jobError || !job) {
      setState((prev) => ({
        ...prev,
        error: jobError?.message || "Analyse-Job konnte nicht angelegt werden.",
      }));
      return;
    }

    writeStoredJob(job.id, trimmedKeyword);
    setState({
      isRunning: true,
      keyword: trimmedKeyword,
      jobId: job.id,
      result: null,
      error: "",
    });
    startPolling(job.id);

    const { data, error } = await supabase.functions.invoke("analyze-orchestrator", {
      body: {
        jobId: job.id,
        keyword: trimmedKeyword,
        firm: firm || undefined,
        city: city || undefined,
      },
    });

    if (error || data?.error) {
      const errorMessage = error?.message || data?.error || "Analyse fehlgeschlagen";
      await supabase
        .from("analysis_jobs")
        .update({
          status: "error",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await pollJob(job.id);
    }
  }, [pollJob, startPolling, stopPolling]);

  const clearResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      result: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: "",
    }));
  }, []);

  return {
    ...state,
    startAnalysis,
    clearResult,
    clearError,
  };
}
