const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword, pageType, firm, branche } = await req.json();

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: "keyword is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: "Antworte NUR als JSON-Objekt. Kein Markdown, kein erklärenderText.",
        messages: [
          {
            role: "user",
            content: `Keyword: "${keyword}"
Seitentyp: ${pageType || "service"}
Firma: ${firm || "unbekannt"}
Branche: ${branche || "allgemein"}

Erstelle konkrete, branchenspezifische Vorschläge für eine SEO-Seite:
{
  "uniqueData": "konkrete einzigartige Daten, Fakten oder Statistiken für diese Seite (1-2 Sätze, spezifisch für die Branche)",
  "informationGain": "konkreter Mehrwert den diese Seite bietet und den Wettbewerber nicht haben (1-2 Sätze, spezifisch)",
  "uspFokus": "1 konkreter USP passend zur Firma (max 10 Wörter)"
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Anthropic API ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const raw = data?.content?.[0]?.text || "{}";

    // Parse JSON, stripping markdown fences if present
    const cleaned = raw.replace(/```json\s?|```/g, "").trim();
    let suggestions: Record<string, string>;
    try {
      suggestions = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
      suggestions = { uniqueData: "", informationGain: "", uspFokus: "" };
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-field-suggestions error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
