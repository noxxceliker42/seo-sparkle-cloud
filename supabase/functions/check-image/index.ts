import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function uploadToCloudinary(
  imageUrl: string, slot: string, keyword: string, jobId: string
): Promise<string | null> {
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const uploadPreset = Deno.env.get("CLOUDINARY_UPLOAD_PRESET");
  if (!cloudName || !uploadPreset) return null;

  const slug = (keyword || "image")
    .toLowerCase()
    .replace(/[äöüß]/g, (c: string) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c] || c))
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);

  const fd = new FormData();
  fd.append("file", imageUrl);
  fd.append("upload_preset", uploadPreset);
  fd.append("folder", "seo-os");
  fd.append("public_id", `${slug}-${slot}-${jobId.slice(0, 8)}`);
  fd.append("tags", `seo-os,${slot}`);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: fd }
    );
    const data = await res.json();
    return data.secure_url
      ? data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/")
      : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { jobId, taskId, slot, keyword } = await req.json();

    const kieKey = Deno.env.get("KIE_AI_API_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Poll NanoBanana task status
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
      return new Response(
        JSON.stringify({ status: "generating" }),
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
      // Upload to Cloudinary
      const cloudUrl = await uploadToCloudinary(imageUrl, slot || "free", keyword || "", jobId);

      await supabase
        .from("image_jobs")
        .update({
          nano_url: imageUrl,
          cloudinary_url: cloudUrl,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ status: "completed", imageUrl, cloudinaryUrl: cloudUrl }),
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
