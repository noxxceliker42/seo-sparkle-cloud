import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KIE_BASE = "https://api.kie.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const apiKey = Deno.env.get("KIE_AI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "KIE_AI_API_KEY ist nicht konfiguriert." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE 1: Full pipeline with imageId (DB-backed)
    if (body.imageId) {
      return await handleFullPipeline(req, body.imageId, apiKey);
    }

    // MODE 2: Simple task creation (legacy / standalone)
    const { prompt, aspect_ratio, resolution, output_format } = body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt ist erforderlich." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "nano-banana-2",
        input: {
          prompt: prompt.trim().substring(0, 20000),
          image_input: [],
          aspect_ratio: aspect_ratio || "auto",
          resolution: resolution || "1K",
          output_format: output_format || "jpg",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NanoBanana API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `NanoBanana API Fehler: ${response.status}`, details: errorText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    if (data.code && data.code !== 200) {
      return new Response(
        JSON.stringify({ error: data.msg || "API Fehler", code: data.code }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        taskId: data.data?.taskId || data.taskId,
        state: "submitted",
        data: data.data || data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-image error:", err);
    return new Response(
      JSON.stringify({ error: `Interner Fehler: ${(err as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleFullPipeline(req: Request, imageId: string, apiKey: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const authHeader = req.headers.get("authorization") || "";

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Step A: Load image record
  const { data: imgRecord, error: fetchErr } = await supabase
    .from("page_images")
    .select("*")
    .eq("id", imageId)
    .single();

  if (fetchErr || !imgRecord) {
    return new Response(
      JSON.stringify({ error: "Bild-Eintrag nicht gefunden", details: fetchErr?.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step B: Start NanoBanana task
  const aspectRatio = imgRecord.width === imgRecord.height ? "1:1" :
    imgRecord.width / imgRecord.height > 1.5 ? "16:9" : "3:2";

  const nanoRes = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input: {
        prompt: imgRecord.nano_prompt,
        image_input: [],
        aspect_ratio: aspectRatio,
        resolution: imgRecord.width >= 1200 ? "1K" : "512",
        output_format: "jpg",
      },
    }),
  });

  if (!nanoRes.ok) {
    const errText = await nanoRes.text();
    console.error("NanoBanana create task error:", nanoRes.status, errText);
    await supabase.from("page_images").update({ nano_status: "failed" }).eq("id", imageId);
    return new Response(
      JSON.stringify({ error: `NanoBanana Fehler: ${nanoRes.status}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const nanoData = await nanoRes.json();
  const taskId = nanoData.data?.taskId || nanoData.taskId;

  if (!taskId) {
    console.error("No taskId from NanoBanana:", JSON.stringify(nanoData));
    await supabase.from("page_images").update({ nano_status: "failed" }).eq("id", imageId);
    return new Response(
      JSON.stringify({ error: "Keine Task-ID von NanoBanana erhalten" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update status to generating
  await supabase.from("page_images").update({
    nano_task_id: taskId,
    nano_status: "generating",
  }).eq("id", imageId);

  // Step C: Poll until complete (max ~60s)
  let nanoUrl: string | null = null;
  let attempts = 0;
  while (!nanoUrl && attempts < 20) {
    await new Promise((r) => setTimeout(r, 3000));
    attempts++;

    const statusRes = await fetch(`${KIE_BASE}/api/v1/jobs/taskStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ taskId }),
    });

    if (!statusRes.ok) {
      console.error("Poll status error:", statusRes.status);
      continue;
    }

    const statusData = await statusRes.json();
    console.log(`Poll attempt ${attempts}:`, JSON.stringify(statusData).substring(0, 300));

    const status = statusData.data?.status || statusData.status;
    if (status === "SUCCESS" || status === "completed" || status === "COMPLETED") {
      nanoUrl = statusData.data?.output?.[0] || statusData.data?.url || statusData.imageUrl;
      if (!nanoUrl && statusData.data?.output && typeof statusData.data.output === "string") {
        nanoUrl = statusData.data.output;
      }
    }
    if (status === "FAILED" || status === "failed") {
      await supabase.from("page_images").update({ nano_status: "failed" }).eq("id", imageId);
      return new Response(
        JSON.stringify({ error: "NanoBanana Generierung fehlgeschlagen" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  if (!nanoUrl) {
    await supabase.from("page_images").update({ nano_status: "failed" }).eq("id", imageId);
    return new Response(
      JSON.stringify({ error: "NanoBanana Timeout — kein Bild nach 60 Sekunden" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step D: Upload to Cloudinary
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const uploadPreset = Deno.env.get("CLOUDINARY_UPLOAD_PRESET");

  if (!cloudName || !uploadPreset) {
    // Save nano URL without Cloudinary
    await supabase.from("page_images").update({
      nano_url: nanoUrl,
      nano_status: "completed",
    }).eq("id", imageId);

    return new Response(
      JSON.stringify({ success: true, nanoUrl, cloudinaryUrl: null, message: "Cloudinary nicht konfiguriert" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const slug = (imgRecord.section_context || imgRecord.slot)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);

  const formData = new FormData();
  formData.append("file", nanoUrl);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "seo-os");
  formData.append("public_id", `${slug}-${imgRecord.slot}-${Date.now()}`);
  formData.append("tags", `seo-os,${imgRecord.slot}`);

  const cloudRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!cloudRes.ok) {
    const cloudErr = await cloudRes.text();
    console.error("Cloudinary upload error:", cloudRes.status, cloudErr);
    await supabase.from("page_images").update({
      nano_url: nanoUrl,
      nano_status: "completed",
    }).eq("id", imageId);

    return new Response(
      JSON.stringify({ success: true, nanoUrl, cloudinaryUrl: null, error: "Cloudinary Upload fehlgeschlagen" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const cloudData = await cloudRes.json();
  const cloudinaryUrl = (cloudData.secure_url || "").replace("/upload/", "/upload/f_auto,q_auto/");

  // Step E: Update DB
  await supabase.from("page_images").update({
    nano_url: nanoUrl,
    cloudinary_url: cloudinaryUrl,
    cloudinary_public_id: cloudData.public_id,
    nano_status: "uploaded",
  }).eq("id", imageId);

  // Step F: Replace placeholder in HTML
  const { data: page } = await supabase
    .from("seo_pages")
    .select("html_output")
    .eq("id", imgRecord.page_id)
    .single();

  if (page?.html_output) {
    const updatedHtml = page.html_output
      .replace(`PLACEHOLDER_${imgRecord.slot}`, cloudinaryUrl)
      .replace(`PLACEHOLDER_ALT_${imgRecord.slot}`, imgRecord.alt_text || "");

    await supabase.from("seo_pages").update({
      html_output: updatedHtml,
    }).eq("id", imgRecord.page_id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      cloudinaryUrl,
      altText: imgRecord.alt_text,
      nanoUrl,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
