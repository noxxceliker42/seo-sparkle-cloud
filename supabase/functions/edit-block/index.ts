import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      blockHtml,
      userPrompt,
      keyword,
      firmName,
      branche,
      designPhilosophy,
      pageType,
    } = await req.json();

    if (!blockHtml || !userPrompt) {
      return new Response(
        JSON.stringify({ error: "blockHtml und userPrompt sind erforderlich", html: null }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY fehlt");
    }

    const systemPrompt = `Du bist HTML-Editor für SEO-Seiten.
Du bearbeitest einzelne HTML-Sektionen präzise nach Nutzer-Anweisung.

SEITEN-KONTEXT:
Firma: ${firmName || ""}
Keyword: ${keyword || ""}
Branche: ${branche || ""}
Design-Philosophie: ${designPhilosophy || ""}
Seitentyp: ${pageType || ""}

PFLICHT-REGELN:
- Antworte NUR mit dem fertigen HTML-Block
- KEIN Markdown, KEIN Kommentar davor/danach
- Alle data-section Attribute EXAKT erhalten:
  data-section, data-section-id, data-section-label, data-editable
- Gleiche CSS-Variablen (--c-primary etc.)
- Mobile-First CSS erhalten
- Nur ändern was der Nutzer verlangt
- Qualität: professionell, conversion-stark`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content:
              `ANWEISUNG: ${userPrompt}\n\n` +
              `AKTUELLER HTML-BLOCK:\n${blockHtml}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic Error: ${err}`);
    }

    const data = await response.json();
    let newHtml: string = data.content?.[0]?.text || blockHtml;

    // Strip ```html code fences if model added them
    newHtml = newHtml.trim();
    if (newHtml.startsWith("```")) {
      newHtml = newHtml.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
    }

    return new Response(JSON.stringify({ html: newHtml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("edit-block error:", msg);
    return new Response(JSON.stringify({ error: msg, html: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
