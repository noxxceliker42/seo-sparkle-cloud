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
    const { jobId, taskId } = await req.json();

    const kieKey = Deno.env.get("KIE_AI_API_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Poll NanoBanana task status:
    const statusRes = await fetch("https://api.kie.ai/api/v1/jobs/taskStatus", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskId }),
      signal: AbortSignal.timeout(8000),
    });

    if (!statusRes.ok) {
      console.error("Task status error:", statusRes.status);
      return new Response(
        JSON.stringify({ status: "generating", error: `Status check failed: ${statusRes.status}` }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const statusData = await statusRes.json();
    console.log("Task Status:", JSON.stringify(statusData).substring(0, 500));

    const state = statusData?.data?.status || statusData?.status || statusData?.state || "";

    const isDone = ["SUCCESS", "success", "completed", "COMPLETED"].includes(state);
    const isFailed = ["FAILED", "failed", "error", "ERROR"].includes(state);

    const imageUrl =
      statusData?.data?.output?.[0] ||
      statusData?.data?.url ||
      statusData?.result?.url ||
      statusData?.imageUrl ||
      statusData?.url ||
      null;

    if (isDone && imageUrl) {
      await supabase
        .from("image_jobs")
        .update({
          status: "completed",
          image_url: imageUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ status: "completed", imageUrl }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (isFailed) {
      await supabase.from("image_jobs").update({ status: "failed" }).eq("id", jobId);

      return new Response(
        JSON.stringify({ status: "failed" }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Still generating:
    return new Response(
      JSON.stringify({ status: "generating" }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-image error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
