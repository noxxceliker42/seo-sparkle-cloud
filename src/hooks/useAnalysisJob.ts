import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobResult {
  analysis?: unknown;
  serp?: unknown;
  volume?: unknown;
  rawJson?: string;
}

interface AnalysisJob {
  id: string;
  keyword: string;
  status: string;
  mode: string;
  result_json: JobResult | null;
  error_message: string | null;
}

const STORAGE_KEY_JOB = "seo_active_job";
const STORAGE_KEY_KW = "seo_active_keyword";

export function useAnalysisJob() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [resumedResult, setResumedResult] = useState<JobResult | null>(null);
  const [resumedKeyword, setResumedKeyword] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearJob = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveJobId(null);
    setIsPolling(false);
    try {
      localStorage.removeItem(STORAGE_KEY_JOB);
      localStorage.removeItem(STORAGE_KEY_KW);
    } catch { /* SSR or private browsing */ }
  }, []);

  const startPolling = useCallback((jobId: string, onComplete: (result: JobResult) => void, onError: (msg: string) => void) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPolling(true);

    intervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("analysis_jobs")
          .select("status, result_json, error_message")
          .eq("id", jobId)
          .single();

        if (error || !data) return;

        if (data.status === "completed" && data.result_json) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsPolling(false);
          setActiveJobId(null);
          try {
            localStorage.removeItem(STORAGE_KEY_JOB);
            localStorage.removeItem(STORAGE_KEY_KW);
          } catch { /* ignore */ }
          onComplete(data.result_json as JobResult);
        }

        if (data.status === "error") {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsPolling(false);
          setActiveJobId(null);
          try {
            localStorage.removeItem(STORAGE_KEY_JOB);
            localStorage.removeItem(STORAGE_KEY_KW);
          } catch { /* ignore */ }
          onError(data.error_message || "Analyse fehlgeschlagen");
        }
      } catch {
        // Network error during poll — continue polling
      }
    }, 2000);
  }, []);

  const createJob = useCallback(async (keyword: string, mode: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("analysis_jobs")
        .insert({
          user_id: user.id,
          keyword,
          mode,
          status: "running",
        })
        .select()
        .single();

      if (error || !data) {
        console.error("Job creation failed:", error);
        return null;
      }

      const jobId = data.id;
      setActiveJobId(jobId);
      try {
        localStorage.setItem(STORAGE_KEY_JOB, jobId);
        localStorage.setItem(STORAGE_KEY_KW, keyword);
      } catch { /* ignore */ }

      return jobId;
    } catch (err) {
      console.error("Job creation error:", err);
      return null;
    }
  }, []);

  const completeJob = useCallback(async (jobId: string, result: JobResult) => {
    try {
      await supabase
        .from("analysis_jobs")
        .update({
          status: "completed",
          result_json: result as unknown as Record<string, unknown>,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    } catch (err) {
      console.error("Job completion update failed:", err);
    }
    clearJob();
  }, [clearJob]);

  const failJob = useCallback(async (jobId: string, errorMessage: string) => {
    try {
      await supabase
        .from("analysis_jobs")
        .update({
          status: "error",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    } catch (err) {
      console.error("Job error update failed:", err);
    }
    clearJob();
  }, [clearJob]);

  // Resume on mount
  useEffect(() => {
    const checkSavedJob = async () => {
      let savedJobId: string | null = null;
      try {
        savedJobId = localStorage.getItem(STORAGE_KEY_JOB);
      } catch { return; }

      if (!savedJobId) return;

      try {
        const { data } = await supabase
          .from("analysis_jobs")
          .select("*")
          .eq("id", savedJobId)
          .single();

        if (!data) {
          clearJob();
          return;
        }

        const job = data as AnalysisJob;

        if (job.status === "running") {
          setActiveJobId(savedJobId);
          setResumedKeyword(job.keyword);
          toast.info("Analyse wird fortgesetzt...");
          // Caller should start polling when they detect activeJobId
        } else if (job.status === "completed" && job.result_json) {
          setResumedResult(job.result_json);
          setResumedKeyword(job.keyword);
          toast.success("Analyse-Ergebnis geladen");
          clearJob();
        } else {
          clearJob();
        }
      } catch {
        clearJob();
      }
    };

    checkSavedJob();
  }, [clearJob]);

  // Visibility change handler
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && activeJobId && !isPolling) {
        // Tab returned — check job status immediately
        (async () => {
          try {
            const { data } = await supabase
              .from("analysis_jobs")
              .select("status, result_json, error_message")
              .eq("id", activeJobId)
              .single();

            if (data?.status === "completed" && data.result_json) {
              setResumedResult(data.result_json as JobResult);
              toast.success("Analyse abgeschlossen");
              clearJob();
            } else if (data?.status === "error") {
              toast.error(data.error_message || "Analyse fehlgeschlagen");
              clearJob();
            }
            // If still running, the existing polling should handle it
          } catch { /* ignore */ }
        })();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeJobId, isPolling, clearJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    activeJobId,
    isPolling,
    resumedResult,
    resumedKeyword,
    createJob,
    completeJob,
    failJob,
    startPolling,
    clearJob,
    clearResumedResult: () => setResumedResult(null),
  };
}
