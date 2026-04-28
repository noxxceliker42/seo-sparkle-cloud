import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM =
  "Du bist Elite-UI/UX-Designer und CSS-Experte. Antworte AUSSCHLIESSLICH als valides JSON ohne Markdown-Codeblöcke.";

function buildPrompt(p: {
  shortInput: string;
  componentType: string;
  branche: string;
  firm: string;
}) {
  return `Ein Kunde gibt folgende Design-Stichworte: "${p.shortInput}"

Kontext:
- Komponente: ${p.componentType}
- Branche: ${p.branche}
- Firma: ${p.firm}

Vervollständige diese Stichworte zu einem KOMPLETTEN Design-System. Interpretiere die Stichworte kreativ und professionell.

Beispiele:
- "Luxury Gold" → Gold (#d4af37) auf Schwarz (#0a0a0f), Serifen-Schrift, subtiler Gold-Glow
- "Dark Tech" → Neon-Cyan auf fast-schwarz, Monospace, Glow-Effekte
- "Warm Organic" → Erdtöne, runde Formen, organische Blob-Shapes
- "Clean Medical" → Mint/Weiß, klare Hierarchie
- "Berlin Street" → Urban, hoher Kontrast, null border-radius

Antworte NUR als valides JSON in dieser Struktur:
{
  "name": "Kreativer Design-Name",
  "mood": "2-3 Sätze die das Gefühl beschreiben",
  "css": "--c-primary:#HEX;--c-primary-dark:#HEX;--c-accent:#HEX;--c-bg:#HEX;--c-text:#HEX;--radius:Xpx",
  "rules": ["Regel 1", "Regel 2", "Regel 3", "Regel 4"],
  "animations": ["Animation 1", "Animation 2"],
  "textures": "Texturen und visuelle Effekte",
  "googleFonts": ["Display Font", "Body Font"],
  "colors": {
    "primary": "#HEX",
    "primaryDark": "#HEX",
    "accent": "#HEX",
    "background": "#HEX",
    "text": "#HEX"
  },
  "expandedDescription": "Vollständige Design-Philosophie in 3-4 Sätzen, als Prompt für den HTML-Generator verwendbar"
}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nicht eingeloggt" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const shortInput = String(body.shortInput ?? "").slice(0, 500).trim();
    const componentType = String(body.componentType ?? "header");
    const branche = String(body.branche ?? "hausgeraete");
    const firm = String(body.firm ?? "");

    if (shortInput.length < 3) {
      return new Response(JSON.stringify({ error: "shortInput zu kurz (min. 3 Zeichen)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY fehlt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [
          { role: "user", content: buildPrompt({ shortInput, componentType, branche, firm }) },
        ],
      }),
    });

    if (!aRes.ok) {
      const errText = await aRes.text();
      return new Response(JSON.stringify({ error: `Anthropic ${aRes.status}: ${errText}` }), {
        status: aRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aRes.json();
    const text: string = data?.content?.[0]?.text ?? "{}";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Server-Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
