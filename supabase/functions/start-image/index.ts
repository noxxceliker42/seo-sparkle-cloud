import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { prompt, pageId, slot, userId } = await req.json();

    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    if (!kieKey) throw new Error("KIE_AI_API_KEY fehlt");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // NanoBanana Task starten via createTask endpoint:
    const nanoRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nano-banana-2",
        input: {
          prompt: (prompt || "").trim().substring(0, 20000),
          image_input: [],
          aspect_ratio: "16:9",
          resolution: "1K",
          output_format: "jpg",
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!nanoRes.ok) {
      const err = await nanoRes.text();
      throw new Error(`NanoBanana Start ${nanoRes.status}: ${err}`);
    }

    const nanoData = await nanoRes.json();
    console.log("NanoBanana Response:", JSON.stringify(nanoData).substring(0, 500));

    const taskId =
      nanoData?.data?.taskId ||
      nanoData?.taskId ||
      nanoData?.task_id ||
      nanoData?.id ||
      null;

    if (!taskId) {
      // Check for direct URL (sync response)
      const directUrl =
        nanoData?.data?.output?.[0] ||
        nanoData?.data?.url ||
        nanoData?.url ||
        nanoData?.imageUrl ||
        null;

      if (directUrl) {
        const { data: job } = await supabase
          .from("image_jobs")
          .insert({
            user_id: userId,
            prompt,
            page_id: pageId || null,
            slot: slot || "hero",
            status: "completed",
            image_url: directUrl,
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        return new Response(
          JSON.stringify({ jobId: job?.id, status: "completed", imageUrl: directUrl }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      throw new Error("Keine taskId und keine URL in Response: " + JSON.stringify(nanoData));
    }

    // Save job with taskId:
    const { data: job } = await supabase
      .from("image_jobs")
      .insert({
        user_id: userId,
        prompt,
        task_id: taskId,
        page_id: pageId || null,
        slot: slot || "hero",
        status: "generating",
      })
      .select("id")
      .single();

    // Return immediately — don't wait for image:
    return new Response(
      JSON.stringify({ jobId: job?.id, taskId, status: "generating" }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("start-image error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
