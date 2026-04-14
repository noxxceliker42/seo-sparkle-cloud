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
    const { sectionText, sectionType, keyword, firmId, slot, width, height } = await req.json();

    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    if (!kieKey) throw new Error("KIE_AI_API_KEY fehlt");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load firm style profile
    let profile: Record<string, string> | null = null;
    if (firmId) {
      const { data } = await supabase
        .from("firm_style_profiles")
        .select("*")
        .eq("firm_id", firmId)
        .maybeSingle();
      profile = data;
    }

    const styleType = slot === "hero"
      ? (profile?.hero_style || "photorealistic")
      : (profile?.section_style || "illustrative");

    const w = width || (slot === "hero" ? 1200 : 800);
    const h = height || (slot === "hero" ? 675 : 450);
    const aspectRatio = w === h ? "square 1:1" : w / h > 1.5 ? "landscape 16:9" : "landscape 3:2";

    const claudePrompt = `You are an expert NanoBanana image prompt writer.

SECTION: ${sectionType || "free"}
SECTION TEXT (first 150 chars): ${(sectionText || "").slice(0, 150)}
SEO KEYWORD: ${keyword || ""}
IMAGE SLOT: ${slot || "hero"}
STYLE: ${styleType}
SETTING: ${profile?.setting || "modern German apartment, bright natural daylight, clean space"}
MOOD: ${profile?.mood || "trustworthy, clean, professional"}
COLORS: ${profile?.color_palette || "white, light grey, blue accent"}
CAMERA: ${profile?.camera_style || "front view, eye level, soft bokeh background"}
LIGHTING: ${profile?.lighting || "natural daylight from left, soft fill light"}
FORBIDDEN: ${profile?.forbidden || "no faces, no logos, no text, no watermarks"}
ASPECT RATIO: ${aspectRatio}

Write TWO prompts:

POSITIVE (max 55 words, English):
Structure: [Subject] + [Setting] + [Style] + [Lighting] + [Quality modifiers]

If style is 'photorealistic': End with 'photorealistic, sharp focus, 8K quality'
If style is 'illustrative': End with 'flat illustration style, clean lines, vector art, professional infographic'

NEGATIVE (max 20 words, English):
Always include: no faces, no logos, no text, no watermarks, plus: ${profile?.forbidden || "no brand names"}

Return ONLY this JSON, no explanation:
{"positive": "...", "negative": "...", "alt_text_de": "... (German, max 125 chars, keyword + context + city)"}`;

    const res = await fetch("https://api.kie.ai/claude/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{ role: "user", content: claudePrompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawText = data?.content?.[0]?.text || "";
    console.log("Claude prompt response:", rawText.slice(0, 300));

    // Parse JSON from response (strip backticks if present)
    const cleaned = rawText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({
        positive: parsed.positive || "",
        negative: parsed.negative || "",
        altText: parsed.alt_text_de || "",
        styleType,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-image-prompt error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
