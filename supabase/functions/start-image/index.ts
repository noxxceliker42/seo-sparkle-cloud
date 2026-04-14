import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
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
      slot, pageId, firmId, altText, userId, keyword,
      mode, referenceImageUrl, editStrength,
    } = await req.json();

    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    if (!kieKey) throw new Error("KIE_AI_API_KEY fehlt");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prompt = (promptPositive || "").trim().substring(0, 20000);
    const genMode = mode || "text-to-image";

    if ((genMode === "image-to-image" || genMode === "image-edit") && !referenceImageUrl) {
      return new Response(
        JSON.stringify({ error: "referenceImageUrl fehlt für Image-to-Image" }),
        { status: 400, headers: cors }
      );
    }

    // Step 1: Insert job row first to get jobId
    const { data: job, error: insertErr } = await supabase
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
        status: "generating",
        mode: genMode,
        reference_image_url: referenceImageUrl || null,
        edit_strength: editStrength ?? null,
      })
      .select("id")
      .single();

    if (insertErr || !job) {
      throw new Error("DB insert failed: " + (insertErr?.message || "no job"));
    }

    const jobId = job.id;

    // Step 2: Build request based on mode
    let nanoEndpoint: string;
    let nanoBody: Record<string, unknown>;

    if (genMode === "image-to-image" || genMode === "image-edit") {
      nanoEndpoint = "https://api.kie.ai/api/v1/images/edits";
      nanoBody = {
        prompt,
        image: referenceImageUrl,
        model: "nano-banana-2",
        n: 1,
        ...(editStrength !== undefined && { strength: editStrength }),
        ...(aspectRatio && { aspect_ratio: aspectRatio }),
        ...(resolution && { image_size: resolution }),
      };
    } else {
      nanoEndpoint = "https://api.kie.ai/api/v1/images/generations";
      nanoBody = {
        prompt,
        negative_prompt: promptNegative || "",
        model: "nano-banana-2",
        width: width || 1200,
        height: height || 675,
        aspect_ratio: aspectRatio || "16:9",
        image_size: resolution || "1K",
        n: 1,
      };
    }

    console.log("NanoBanana Mode:", genMode, "Endpoint:", nanoEndpoint);

    const nanoRes = await fetch(nanoEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nanoBody),
      signal: AbortSignal.timeout(60000),
    });

    if (!nanoRes.ok) {
      const errText = await nanoRes.text();
      console.error("NanoBanana error:", nanoRes.status, errText);
      await supabase.from("image_jobs").update({ status: "failed" }).eq("id", jobId);
      throw new Error(`NanoBanana ${nanoRes.status}: ${errText}`);
    }

    const nanoData = await nanoRes.json();
    console.log("NanoBanana full response:", JSON.stringify(nanoData));

    // Extract URL from all possible fields
    const imageUrl =
      nanoData?.data?.[0]?.url ||
      nanoData?.data?.[0]?.imageUrl ||
      nanoData?.data?.[0]?.image_url ||
      nanoData?.images?.[0]?.url ||
      nanoData?.images?.[0] ||
      nanoData?.result?.[0]?.url ||
      nanoData?.result?.url ||
      nanoData?.url ||
      nanoData?.imageUrl ||
      nanoData?.image_url ||
      nanoData?.output?.[0] ||
      nanoData?.output?.[0]?.url ||
      nanoData?.data?.output?.[0] ||
      nanoData?.data?.url ||
      null;

    // taskId only as fallback
    const taskId =
      nanoData?.data?.[0]?.taskId ||
      nanoData?.data?.[0]?.task_id ||
      nanoData?.data?.taskId ||
      nanoData?.taskId ||
      nanoData?.task_id ||
      nanoData?.id ||
      null;

    console.log("Extracted imageUrl:", imageUrl);
    console.log("Extracted taskId:", taskId);

    // FALL A — URL directly available (synchronous)
    if (imageUrl) {
      console.log("Synchrone URL — direkt zu Cloudinary");
      const cloudinaryUrl = await uploadToCloudinary(imageUrl, slot || "free", keyword || "", jobId);

      await supabase
        .from("image_jobs")
        .update({
          nano_url: imageUrl,
          cloudinary_url: cloudinaryUrl,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ jobId, status: "completed", imageUrl, cloudinaryUrl }),
        { headers: cors }
      );
    }

    // FALL B — Only taskId (asynchronous, polling needed)
    if (taskId) {
      console.log("Asynchrone taskId:", taskId);
      await supabase
        .from("image_jobs")
        .update({ task_id: taskId, status: "generating" })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ jobId, taskId, status: "generating" }),
        { headers: cors }
      );
    }

    // FALL C — Neither URL nor taskId
    console.error("Kein imageUrl und keine taskId:", JSON.stringify(nanoData));
    await supabase.from("image_jobs").update({ status: "failed" }).eq("id", jobId);

    return new Response(
      JSON.stringify({ error: "Keine URL und keine taskId in Response", rawResponse: nanoData }),
      { status: 500, headers: cors }
    );
  } catch (err) {
    console.error("start-image error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: cors }
    );
  }
});
