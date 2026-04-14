import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLOT_LABELS: Record<string, string> = {
  hero: "Hero-Bild (1200×675px)",
  howto: "Selbsthilfe-Sektion (800×450px)",
  ablauf: "Ablauf vor Ort (800×450px)",
  unique: "Unsere Praxis (800×450px)",
  autor: "Autorportrait (80×80px)",
};

function generateAltText(slot: string, context: string, keyword: string, firm: string, city: string): string {
  const base = `${keyword} – ${context.toLowerCase()} – ${firm} ${city}`;
  return base.slice(0, 125);
}

async function generateImagePrompt(
  slot: string, context: string, keyword: string, firm: string, city: string, width: number, height: number, apiKey: string
): Promise<string> {
  const aspectRatio = width === height ? "square 1:1" : width / height > 1.5 ? "landscape 16:9" : "landscape 3:2";

  try {
    const res = await fetch("https://api.kie.ai/claude/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Write a NanoBanana image generation prompt in English.
Context: ${context}
Business: ${firm} in ${city}
Section: ${slot}
Aspect ratio: ${aspectRatio}
Rules:
- No faces, no identifiable people
- No brand logos or trademarks
- Professional, clean, studio quality
- Photorealistic style
- Max 50 words
- Only return the prompt, nothing else`,
        }],
      }),
    });

    if (!res.ok) {
      console.error("Kie.AI prompt generation failed:", res.status);
      return `Professional photorealistic ${context}, clean studio quality, ${aspectRatio}, no people, no logos`;
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text || data?.choices?.[0]?.message?.content;
    return text?.trim() || `Professional photorealistic ${context}, clean studio quality, ${aspectRatio}`;
  } catch (err) {
    console.error("Prompt generation error:", err);
    return `Professional photorealistic ${context}, clean studio quality, ${aspectRatio}, no people, no logos`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pageId, html, keyword, firm, city } = await req.json();

    if (!pageId || !html) {
      return new Response(
        JSON.stringify({ error: "pageId und html sind erforderlich." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("KIE_AI_API_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const authHeader = req.headers.get("authorization") || "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse HTML for image slots
    const slotRegex = /data-img-slot="([^"]+)"[^>]*data-img-context="([^"]+)"/g;
    const dimRegexFn = (slot: string) =>
      new RegExp(`data-img-slot="${slot}"[^>]*width="(\\d+)"[^>]*height="(\\d+)"`);

    const slots: Array<{
      id: string; slot: string; slotLabel: string;
      prompt: string; altText: string; width: number; height: number; status: string;
    }> = [];

    const seenSlots = new Set<string>();
    let match;
    while ((match = slotRegex.exec(html)) !== null) {
      const [, slot, context] = match;
      if (seenSlots.has(slot)) continue;
      seenSlots.add(slot);

      const dimMatch = dimRegexFn(slot).exec(html);
      const width = parseInt(dimMatch?.[1] || "800");
      const height = parseInt(dimMatch?.[2] || "450");

      const prompt = await generateImagePrompt(slot, context, keyword || "", firm || "", city || "", width, height, apiKey);
      const altText = generateAltText(slot, context, keyword || "", firm || "", city || "");

      const { data: imgRecord, error: insertErr } = await supabase
        .from("page_images")
        .insert({
          page_id: pageId,
          slot,
          slot_label: SLOT_LABELS[slot] || slot,
          nano_prompt: prompt,
          alt_text: altText,
          width,
          height,
          section_context: context,
          nano_status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Insert error for slot", slot, insertErr);
        continue;
      }

      slots.push({
        id: imgRecord.id,
        slot,
        slotLabel: SLOT_LABELS[slot] || slot,
        prompt,
        altText,
        width,
        height,
        status: "pending",
      });
    }

    return new Response(
      JSON.stringify({ success: true, slots }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-image-slots error:", err);
    return new Response(
      JSON.stringify({ error: `Interner Fehler: ${(err as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
