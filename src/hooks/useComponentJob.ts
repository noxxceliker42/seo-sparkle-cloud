import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ComponentJob, TriggerGenerationPayload } from "@/types/studio";

function mapRow(row: any): ComponentJob {
  return {
    ...row,
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
  } as ComponentJob;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 60000;

export function useComponentJob() {
  const [job, setJob] = useState<ComponentJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const inFlightRef = useRef(false);

  const getJobByJobId = useCallback(async (jobId: string) => {
    const { data, error } = await supabase
      .from("component_jobs")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  }, []);

  const pollJob = useCallback(
    async (jobId: string): Promise<ComponentJob> => {
      const start = Date.now();
      cancelRef.current = false;
      while (!cancelRef.current && Date.now() - start < MAX_POLL_MS) {
        const current = await getJobByJobId(jobId);
        if (current) {
          setJob(current);
          if (current.status === "completed") {
            setIsGenerating(false);
            return current;
          }
          if (current.status === "error") {
            setIsGenerating(false);
            setError(current.error_message ?? "Generierung fehlgeschlagen");
            return current;
          }
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      setIsGenerating(false);
      throw new Error("Timeout beim Warten auf Generierung");
    },
    [getJobByJobId]
  );

  const triggerGeneration = useCallback(
    async (payload: TriggerGenerationPayload) => {
      if (inFlightRef.current) {
        console.warn("[useComponentJob] triggerGeneration ignored — already in flight");
        return null as any;
      }
      inFlightRef.current = true;
      setIsGenerating(true);
      setError(null);
      setJob(null);
      try {
        // Route via secure n8n-proxy edge function (no secrets in frontend)
        const { data, error: invokeError } = await supabase.functions.invoke(
          "n8n-proxy",
          {
            body: {
              webhookType: "studio-component",
              webhookPath: "seo-studio-component",
              payload,
            },
          }
        );
        if (invokeError) throw invokeError;

        const jobId: string | undefined = data?.jobId ?? data?.job_id;
        if (!jobId) throw new Error("Keine jobId von n8n erhalten");

        // Insert local tracking row for immediate UI feedback
        const { data: userRes } = await supabase.auth.getUser();
        await supabase.from("component_jobs").insert({
          job_id: jobId,
          firm_id: payload.firmId,
          user_id: userRes.user?.id ?? payload.userId,
          component_type: payload.componentType,
          variant: payload.variant,
          name: payload.name,
          design_philosophy: payload.designPhilosophy,
          status: "generating",
        });

        return pollJob(jobId);
      } catch (e: any) {
        setIsGenerating(false);
        setError(e.message ?? "Fehler beim Starten der Generierung");
        throw e;
      }
    },
    [pollJob]
  );

  const getJobResult = useCallback(
    async (jobId: string) => {
      const j = await getJobByJobId(jobId);
      if (!j) return null;
      return {
        html: j.html_output,
        css: j.css_output,
        js: j.js_output,
        warnings: j.warnings,
        qaScore: j.qa_score,
      };
    },
    [getJobByJobId]
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setIsGenerating(false);
  }, []);

  return {
    job,
    isGenerating,
    error,
    triggerGeneration,
    pollJobStatus: pollJob,
    getJobResult,
    cancel,
  };
}
