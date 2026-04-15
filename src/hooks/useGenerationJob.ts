import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "seo_os_generation_job";

interface GenerationJobState {
  jobId: string;
  generating: boolean;
  error: string;
  htmlWarning: string;
  result: GenerationJobResult | null;
}

export interface GenerationJobResult {
  pageId: string | null;
  htmlOutput: string;
  bodyContent: string;
  cssBlock: string;
  jsonLd: string;
  metaTitle: string;
  metaDesc: string;
  metaKeywords: string;
  promptUsed: string;
  tokensUsed: number | null;
  durationSeconds: number | null;
  stopReason: string;
}

function readStorage(): { jobId: string; keyword: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(jobId: string, keyword: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId, keyword }));
  } catch {}
}

function clearStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function useGenerationJob() {
  const [state, setState] = useState<GenerationJobState>({
    jobId: "",
    generating: false,
    error: "",
    htmlWarning: "",
    result: null,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const checkHtmlCompleteness = useCallback((html: string): string => {
    if (!html) return "";
    const isComplete = html.trim().endsWith("</html>");
    const hasFaq = html.includes('id="faq"');
    const hasSchema = html.includes("application/ld+json");
    const hasAutor = html.includes('id="autor"');
    if (isComplete && hasFaq && hasSchema && hasAutor) return "";
    const missing = [
      !isComplete && "HTML-Ende fehlt",
      !hasFaq && "FAQ-Sektion fehlt",
      !hasSchema && "JSON-LD fehlt",
      !hasAutor && "Autor-Sektion fehlt",
    ].filter(Boolean).join(", ");
    return `HTML unvollständig — Token-Limit erreicht. Fehlend: ${missing}`;
  }, []);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const { data: job } = await supabase
        .from("generation_jobs")
        .select("status, page_id, html_output, body_content, css_block, json_ld, meta_title, meta_desc, meta_keywords, prompt_used, stop_reason, error_message, tokens_used, duration_seconds")
        .eq("id", jobId)
        .single();

      if (!job) return;

      if (job.status === "completed") {
        stopPolling();
        clearStorage();
        const html = (job as any).html_output || "";
        setState({
          jobId: "",
          generating: false,
          error: "",
          htmlWarning: checkHtmlCompleteness(html),
          result: {
            pageId: (job as any).page_id || null,
            htmlOutput: html,
            bodyContent: (job as any).body_content || "",
            cssBlock: (job as any).css_block || "",
            jsonLd: (job as any).json_ld || "",
            metaTitle: (job as any).meta_title || "",
            metaDesc: (job as any).meta_desc || "",
            metaKeywords: (job as any).meta_keywords || "",
            promptUsed: (job as any).prompt_used || "",
            tokensUsed: (job as any).tokens_used || null,
            durationSeconds: (job as any).duration_seconds || null,
            stopReason: (job as any).stop_reason || "",
          },
        });
      }

      if (job.status === "error") {
        stopPolling();
        clearStorage();
        setState({
          jobId: "",
          generating: false,
          error: job.error_message || "Unbekannter Fehler bei der Generierung",
          htmlWarning: "",
          result: null,
        });
      }
    } catch (err) {
      console.error("Generation poll error:", err);
    }
  }, [stopPolling, checkHtmlCompleteness]);

  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      void pollJob(jobId);
    }, 5000);
  }, [pollJob]);

  // Restore on mount
  useEffect(() => {
    const stored = readStorage();
    if (!stored?.jobId) return;

    setState((prev) => ({ ...prev, generating: true, jobId: stored.jobId, error: "" }));

    void (async () => {
      const { data: job } = await supabase
        .from("generation_jobs")
        .select("status, page_id, html_output, body_content, css_block, json_ld, meta_title, meta_desc, meta_keywords, prompt_used, stop_reason, error_message, tokens_used, duration_seconds")
        .eq("id", stored.jobId)
        .single();

      if (!job) {
        clearStorage();
        setState({ jobId: "", generating: false, error: "", htmlWarning: "", result: null });
        return;
      }

      if (job.status === "completed") {
        clearStorage();
        const html = (job as any).html_output || "";
        setState({
          jobId: "",
          generating: false,
          error: "",
          htmlWarning: checkHtmlCompleteness(html),
          result: {
            pageId: (job as any).page_id || null,
            htmlOutput: html,
            bodyContent: (job as any).body_content || "",
            cssBlock: (job as any).css_block || "",
            jsonLd: (job as any).json_ld || "",
            metaTitle: (job as any).meta_title || "",
            metaDesc: (job as any).meta_desc || "",
            metaKeywords: (job as any).meta_keywords || "",
            promptUsed: (job as any).prompt_used || "",
            tokensUsed: (job as any).tokens_used || null,
            durationSeconds: (job as any).duration_seconds || null,
            stopReason: (job as any).stop_reason || "",
          },
        });
      } else if (job.status === "error") {
        clearStorage();
        setState({
          jobId: "",
          generating: false,
          error: job.error_message || "Fehler",
          htmlWarning: "",
          result: null,
        });
      } else {
        startPolling(stored.jobId);
      }
    })();

    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Visibility change — resume polling
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      const cur = stateRef.current;
      if (cur.generating && cur.jobId && !pollingRef.current) {
        startPolling(cur.jobId);
        void pollJob(cur.jobId);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [startPolling, pollJob]);

  const startGeneration = useCallback(async (formData: Record<string, unknown>) => {
    stopPolling();
    setState({ jobId: "", generating: true, error: "", htmlWarning: "", result: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState((prev) => ({ ...prev, generating: false, error: "Nicht eingeloggt. Bitte erneut anmelden." }));
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = (await supabase.auth.getSession()).data.session;

      const res = await fetch(`${supabaseUrl}/functions/v1/n8n-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`n8n-proxy ${res.status}: ${errText}`);
      }

      const result = await res.json();

      if (!result?.jobId) {
        throw new Error(result?.error || "n8n hat keine jobId zurückgegeben");
      }

      writeStorage(result.jobId, (formData.keyword as string) || "");
      setState((prev) => ({ ...prev, jobId: result.jobId }));
      startPolling(result.jobId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler";
      setState((prev) => ({
        ...prev,
        generating: false,
        error: msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? "n8n nicht erreichbar — Bitte VITE_N8N_WEBHOOK_URL prüfen."
          : msg,
      }));
    }
  }, [stopPolling, startPolling]);

  const clearResult = useCallback(() => {
    setState({ jobId: "", generating: false, error: "", htmlWarning: "", result: null });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "" }));
  }, []);

  return {
    ...state,
    startGeneration,
    clearResult,
    clearError,
  };
}
