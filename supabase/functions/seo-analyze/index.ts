import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword, firm, city, uniqueData, infoGain } = await req.json();

    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Keyword ist erforderlich." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("KIE_AI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "KIE_AI_API_KEY ist nicht konfiguriert." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context parts
    const contextParts: string[] = [];
    if (firm) contextParts.push(`Firma: ${firm}`);
    if (city) contextParts.push(`Stadt: ${city}`);
    if (uniqueData) contextParts.push(`Unique Data: ${uniqueData}`);
    if (infoGain) contextParts.push(`Information Gain: ${infoGain}`);
    const contextStr = contextParts.length > 0 ? `\nKontext: ${contextParts.join(", ")}` : "";

    const prompt = `Du bist SEO-Experte für den deutschsprachigen Markt.
Analysiere das Keyword: "${keyword}"${contextStr}

Antworte NUR mit reinem JSON ohne Markdown-Backticks:
{
  "intent": "Informational|Commercial|Transactional|Local",
  "intent_detail": "Begründung 1 Satz",
  "page_type": "Pillar Page|Supporting Info|Supporting Commercial|Transactional/Local|Deep Page",
  "page_type_why": "Begründung 1 Satz",
  "paa": [{"question": "...", "intent": "..."}],
  "lsi": ["Begriff1", ...],
  "secondary_keywords": ["KW1", ...],
  "content_gaps": ["Lücke1", ...],
  "cluster": { "informational": [...], "commercial": [...], "transactional": [...], "deep_pages": [...] },
  "schema_recommendation": ["FAQPage", "HowTo", ...],
  "information_gain_suggestions": ["Punkt1", ...],
  "discover_angle": "Wie Seite für Google Discover optimiert wird"
}

Regeln:
- paa: 8-10 Fragen mit Intent
- lsi: 12-15 Begriffe
- content_gaps: 4-5 Punkte
- information_gain_suggestions: mindestens 3 Punkte (2026 NEU)
- discover_angle: konkreter Vorschlag (2026 NEU)
- Nur reines JSON, keine Backticks, kein Markdown`;

    // Kie.AI Claude endpoint uses Anthropic message format
    // Endpoint: https://api.kie.ai/claude/v1/messages
    // Response format: Anthropic (data.content[0].text)
    const response = await fetch("https://api.kie.ai/claude/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        messages: [
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kie.AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Kie.AI API Fehler: ${response.status}`, details: errorText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Anthropic format: data.content[0].text
    // Content is an array of blocks, find the text block
    let rawContent: string | undefined;
    if (data?.content && Array.isArray(data.content)) {
      const textBlock = data.content.find((block: { type: string; text?: string }) => block.type === "text");
      rawContent = textBlock?.text;
    }

    if (!rawContent) {
      console.error("Unexpected Kie.AI response structure:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Unerwartete API-Antwort", raw: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip markdown backticks
    const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_parseErr) {
      console.error("JSON parse error, raw:", cleaned);
      return new Response(
        JSON.stringify({ error: "JSON-Parsing fehlgeschlagen", raw: cleaned }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        keyword,
        analysis: parsed,
        credits_consumed: data.credits_consumed,
        model: data.model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("seo-analyze error:", err);
    return new Response(
      JSON.stringify({ error: `Interner Fehler: ${(err as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
