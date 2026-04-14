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
  if (!cloudName || !uploadPreset) {
    console.error("Cloudinary not configured");
    return null;
  }

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
    if (data.secure_url) {
      return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
    }
    console.error("Cloudinary upload failed:", JSON.stringify(data).slice(0, 300));
    return null;
  } catch (err) {
    console.error("Cloudinary error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const {
      promptPositive, promptNegative, width, height,
      aspectRatio, resolution, slotLabel,
      slot, pageId, firmId, altText, userId, keyword
    } = await req.json();

    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    if (!kieKey) throw new Error("KIE_AI_API_KEY fehlt");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prompt = (promptPositive || "").trim().substring(0, 20000);

    // NanoBanana Task starten
    const nanoRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nano-banana-2",
        input: {
          prompt,
          negative_prompt: promptNegative || "",
          image_input: [],
          aspect_ratio: aspectRatio || (width === height ? "1:1" : "16:9"),
          resolution: resolution || "1K",
          output_format: "jpg",
        },
      }),
      signal: AbortSignal.timeout(12000),
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

    // Check for direct URL (sync response)
    const directUrl =
      nanoData?.data?.output?.[0] ||
      nanoData?.data?.url ||
      nanoData?.url ||
      nanoData?.imageUrl ||
      null;

    if (directUrl) {
      // Upload to Cloudinary immediately
      const cloudUrl = await uploadToCloudinary(directUrl, slot || "free", keyword || "", "direct");

      const { data: job } = await supabase
        .from("image_jobs")
        .insert({
          user_id: userId,
          firm_id: firmId || null,
          page_id: pageId || null,
          slot: slot || "free",
          slot_label: slotLabel || null,
          prompt: prompt,
          prompt_positive: promptPositive,
          prompt_negative: promptNegative || "",
          width: width || 1200,
          height: height || 675,
          alt_text: altText || "",
          nano_url: directUrl,
          cloudinary_url: cloudUrl,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      return new Response(
        JSON.stringify({
          jobId: job?.id,
          status: "completed",
          imageUrl: directUrl,
          cloudinaryUrl: cloudUrl,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (!taskId) {
      throw new Error("Keine taskId und keine URL: " + JSON.stringify(nanoData).slice(0, 200));
    }

    // Save job with taskId
    const { data: job } = await supabase
      .from("image_jobs")
      .insert({
        user_id: userId,
        firm_id: firmId || null,
        page_id: pageId || null,
        slot: slot || "free",
        slot_label: slotLabel || null,
        prompt: prompt,
        prompt_positive: promptPositive,
        prompt_negative: promptNegative || "",
        width: width || 1200,
        height: height || 675,
        alt_text: altText || "",
        task_id: taskId,
        status: "generating",
      })
      .select("id")
      .single();

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
