import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    if (!kieKey) {
      return new Response(
        JSON.stringify({ error: "KIE_AI_API_KEY fehlt" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      prompt, promptPositive, promptNegative, width, height,
      aspectRatio, resolution, slot, slotLabel,
      firmId, userId, keyword, pageId, mode,
      referenceImageUrl, editStrength,
    } = body;

    // Accept either "prompt" or "promptPositive"
    const effectivePrompt = promptPositive || prompt || "";

    // Job in DB anlegen
    const { data: job, error: insertErr } = await supabase
      .from("image_jobs")
      .insert({
        user_id: userId,
        firm_id: firmId || null,
        slot: slot || "free",
        slot_label: slotLabel || slot || null,
        prompt: promptPositive || "",
        prompt_positive: promptPositive || "",
        prompt_negative: promptNegative || "",
        width: width || 1200,
        height: height || 675,
        status: "generating",
      })
      .select("id")
      .single();

    if (insertErr || !job) {
      throw new Error("DB insert failed: " + (insertErr?.message || "no job"));
    }

    const jobId = job.id;

    // KORREKTER KIE.AI ENDPOINT
    const nanoRes = await fetch(
      "https://api.kie.ai/api/v1/jobs/createTask",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kieKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nano-banana-2",
          input: {
            prompt: promptPositive,
            negative_prompt: promptNegative || undefined,
            aspect_ratio: aspectRatio || "16:9",
            image_size: resolution || "1K",
            output_format: "png",
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    const nanoData = await nanoRes.json();
    console.log("NanoBanana createTask response:", JSON.stringify(nanoData));

    // taskId aus Response
    const taskId =
      nanoData?.data?.taskId ||
      nanoData?.taskId ||
      nanoData?.data?.task_id ||
      nanoData?.task_id ||
      null;

    if (!taskId) {
      console.error("Keine taskId:", JSON.stringify(nanoData));
      await supabase.from("image_jobs").update({ status: "failed" }).eq("id", jobId);

      return new Response(
        JSON.stringify({ error: "Keine taskId erhalten", raw: nanoData }),
        { status: 500, headers: corsHeaders }
      );
    }

    // taskId in DB speichern
    await supabase.from("image_jobs").update({ task_id: taskId }).eq("id", jobId);
    console.log("Task erstellt:", taskId);

    return new Response(
      JSON.stringify({ jobId, taskId, status: "generating" }),
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("start-image error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
