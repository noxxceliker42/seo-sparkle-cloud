import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = "Du bist Elite-UI/UX-Designer und CSS-Experte für 2026. Antworte AUSSCHLIESSLICH als valides JSON ohne Markdown-Codeblöcke.";

function buildUserPrompt(p: {
  userDescription: string;
  componentType: string;
  branche: string;
  firm: string;
}) {
  return `Ein Kunde beschreibt seinen gewünschten Stil: "${p.userDescription}"

Komponente: ${p.componentType}
Branche: ${p.branche}
Firma: ${p.firm}

Erstelle GENAU 3 unterschiedliche Design-Vorschläge. Jeder Vorschlag muss sich DEUTLICH von den anderen unterscheiden (verschiedene Farbwelten, verschiedene Stimmungen, verschiedene Ansätze).

Antworte NUR als valides JSON in dieser Struktur:
{
  "proposals": [
    {
      "name": "Kreativer Name (2 Wörter)",
      "mood": "2 Sätze die das Gefühl beschreiben",
      "css": "--c-primary:#HEX;--c-primary-dark:#HEX;--c-accent:#HEX;--c-bg:#HEX;--c-text:#HEX;--radius:Xpx;--font-display:FontName;--font-body:FontName",
      "rules": ["Design-Regel 1", "Design-Regel 2", "Design-Regel 3"],
      "animations": ["Animation 1", "Animation 2"],
      "textures": "Texturen und visuelle Effekte",
      "googleFonts": ["Font1", "Font2"],
      "colors": {
        "primary": "#HEX",
        "primaryDark": "#HEX",
        "accent": "#HEX",
        "background": "#HEX",
        "text": "#HEX"
      }
    }
  ]
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
    const userDescription = String(body.userDescription ?? "").slice(0, 2000);
    const componentType = String(body.componentType ?? "header");
    const branche = String(body.branche ?? "hausgeraete");
    const firm = String(body.firm ?? "");

    if (!userDescription.trim()) {
      return new Response(JSON.stringify({ error: "userDescription fehlt" }), {
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
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: "user", content: buildUserPrompt({ userDescription, componentType, branche, firm }) }],
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
      // try to extract first JSON object
      const m = cleaned.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { proposals: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Server-Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
