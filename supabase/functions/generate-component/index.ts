import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BrandKitPayload {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string | null;
  logo_alt?: string | null;
  name?: string;
}

const stripFences = (s: string) =>
  s
    .replace(/^\s*```(?:html|HTML)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      component_type,
      brand_kit,
      firm_name,
    }: {
      prompt: string;
      component_type: string;
      brand_kit: BrandKitPayload;
      firm_name?: string;
    } = await req.json();

    if (!prompt || !component_type) {
      return new Response(
        JSON.stringify({ error: "prompt and component_type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const kit = brand_kit || {};
    const systemPrompt = `Du bist HTML-Komponenten-Experte.
Generiere EINE einzelne, vollständige HTML-Komponente.

PFLICHT:
- Antworte NUR mit HTML-Code (KEIN Markdown, KEIN \`\`\`)
- Inline <style> mit CSS-Variablen verwenden:
  --c-primary, --c-bg, --c-accent, --radius
- data-section, data-section-id, data-section-label, data-editable="true" setzen
- Mobile-First (@media max-width:768px)
- Alle Klick-Events inline (onclick="...")
- Kein externes CSS oder JS
- Professionelle, conversion-starke Qualität
- Komponente ist self-contained (eigenes <style>-Block + Markup)

CSS-VARIABLEN bereits gesetzt im umgebenden Style:
:root {
  --c-primary: ${kit.primary_color || "#1d4ed8"};
  --c-bg: ${kit.secondary_color || "#ffffff"};
  --c-accent: ${kit.accent_color || "#dc2626"};
  --radius: 8px;
}

FIRMA: ${firm_name || ""}
${kit.logo_url ? `LOGO-URL: ${kit.logo_url}` : ""}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Erstelle diese Komponente:
Typ: ${component_type}
Beschreibung: ${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Anthropic error:", response.status, t);
      return new Response(
        JSON.stringify({ error: `Anthropic ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const raw = data?.content?.[0]?.text || "";
    const html = stripFences(raw);

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-component error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
