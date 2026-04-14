import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobResult {
  analysis?: unknown;
  serp?: unknown;
  volume?: unknown;
  rawJson?: string;
}

const STORAGE_KEY_JOB = "seo_active_job";
const STORAGE_KEY_KW = "seo_active_keyword";
const STORAGE_KEY_STARTED = "seo_analysis_started";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export function useAnalysisJob() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [resumedResult, setResumedResult] = useState<JobResult | null>(null);
  const [resumedKeyword, setResumedKeyword] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const activeJobIdRef = useRef<string | null>(null);
  const onCompleteRef = useRef<((result: JobResult) => void) | null>(null);
  const onErrorRef = useRef<((msg: string) => void) | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
    setIsPolling(false);
  }, []);

  const clearJob = useCallback(() => {
    stopPolling();
    setActiveJobId(null);
    activeJobIdRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY_JOB);
      localStorage.removeItem(STORAGE_KEY_KW);
      localStorage.removeItem(STORAGE_KEY_STARTED);
    } catch { /* SSR or private browsing */ }
  }, [stopPolling]);

  const startPolling = useCallback((
    jobId: string,
    onComplete: (result: JobResult) => void,
    onError: (msg: string) => void,
  ) => {
    // Prevent duplicate polling
    if (intervalRef.current) clearInterval(intervalRef.current);

    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    isPollingRef.current = true;
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
          clearJob();
          onCompleteRef.current?.(data.result_json as JobResult);
          toast.success("Analyse abgeschlossen");
        }

        if (data.status === "error") {
          clearJob();
          onErrorRef.current?.(data.error_message || "Analyse fehlgeschlagen");
          toast.error(data.error_message || "Analyse fehlgeschlagen");
        }
      } catch {
        // Network error during poll — continue polling
      }
    }, 2500);
  }, [clearJob]);

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
      activeJobIdRef.current = jobId;
      try {
        localStorage.setItem(STORAGE_KEY_JOB, jobId);
        localStorage.setItem(STORAGE_KEY_KW, keyword);
        localStorage.setItem(STORAGE_KEY_STARTED, Date.now().toString());
      } catch { /* ignore */ }

      return jobId;
    } catch (err) {
      console.error("Job creation error:", err);
      return null;
    }
  }, []);

  const completeJob = useCallback(async (jobId: string, result: JobResult) => {
    try {
      await (supabase.from("analysis_jobs") as any)
        .update({
          status: "completed",
          result_json: result,
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

  // Resume on mount — check for saved job in localStorage
  useEffect(() => {
    const checkSavedJob = async () => {
      let savedJobId: string | null = null;
      try {
        savedJobId = localStorage.getItem(STORAGE_KEY_JOB);
      } catch { return; }

      if (!savedJobId) return;

      // Check age
      try {
        const started = parseInt(localStorage.getItem(STORAGE_KEY_STARTED) || "0");
        if (Date.now() - started > MAX_AGE_MS) {
          localStorage.removeItem(STORAGE_KEY_JOB);
          localStorage.removeItem(STORAGE_KEY_KW);
          localStorage.removeItem(STORAGE_KEY_STARTED);
          return;
        }
      } catch { /* ignore */ }

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

        if (data.status === "running") {
          setActiveJobId(savedJobId);
          activeJobIdRef.current = savedJobId;
          setResumedKeyword(data.keyword);
          toast.info("Analyse wird fortgesetzt...");
          // Caller should call startPolling when they detect activeJobId
        } else if (data.status === "completed" && data.result_json) {
          setResumedResult(data.result_json as JobResult);
          setResumedKeyword(data.keyword);
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

  // Page Visibility API — detect tab switch and check job status
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;

      const jobId = activeJobIdRef.current;
      if (!jobId) return;

      // Restart polling if it was throttled by the browser
      if (!isPollingRef.current && onCompleteRef.current && onErrorRef.current) {
        startPolling(jobId, onCompleteRef.current, onErrorRef.current);
      }

      // Also check immediately
      try {
        const { data } = await supabase
          .from("analysis_jobs")
          .select("status, result_json, error_message")
          .eq("id", jobId)
          .single();

        if (data?.status === "completed" && data.result_json) {
          clearJob();
          setResumedResult(data.result_json as JobResult);
          toast.success("Analyse abgeschlossen");
        } else if (data?.status === "error") {
          clearJob();
          toast.error(data.error_message || "Analyse fehlgeschlagen");
        }
      } catch { /* ignore */ }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [clearJob, startPolling]);

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
