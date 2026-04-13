import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { prompt, aspect_ratio, resolution, output_format, action } = await req.json();

    const apiKey = Deno.env.get("KIE_AI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "KIE_AI_API_KEY ist nicht konfiguriert." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: poll — check task status
    if (action === "poll") {
      const { taskId } = await req.json().catch(() => ({ taskId: undefined }));
      // taskId comes from original body
      const tId = (await req.json().catch(() => null)) || prompt; // fallback
      return new Response(
        JSON.stringify({ error: "Use dedicated poll endpoint" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt ist erforderlich." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create image generation task
    const response = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
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

    // If API returned error code
    if (data.code && data.code !== 200) {
      return new Response(
        JSON.stringify({ error: data.msg || "API Fehler", code: data.code }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return task info — client needs to poll for completion
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
