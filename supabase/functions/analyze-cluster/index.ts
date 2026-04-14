import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractKieContent(data: Record<string, unknown>): string {
  let content = '';

  // Anthropic-Format (Kie.AI offiziell):
  if (data?.content && Array.isArray(data.content)) {
    const textBlock = (data.content as Array<{ type: string; text?: string }>).find((b) => b.type === "text");
    if (textBlock?.text) content = textBlock.text;
  }
  // OpenAI-Format (Fallback):
  if (!content) {
    const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined;
    if (choices?.[0]?.message?.content) content = choices[0].message.content;
  }
  // Direct string:
  if (!content && typeof data?.content === 'string') {
    content = data.content;
  }

  if (!content || content.trim() === '') {
    console.error('Leere Antwort von Kie.AI. Data:', JSON.stringify(data).substring(0, 500));
    throw new Error(
      'Kie.AI leere Antwort. stop_reason: ' + ((data?.stop_reason as string) || 'unbekannt') +
      ' | Typ: ' + ((data?.type as string) || 'unbekannt')
    );
  }

  return content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pillarKeyword, firmId, existingPages } = await req.json();

    if (!pillarKeyword || typeof pillarKeyword !== "string" || pillarKeyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Pillar-Keyword ist erforderlich." }),
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

    const dfLogin = Deno.env.get("DATAFORSEO_LOGIN");
    const dfPassword = Deno.env.get("DATAFORSEO_PASSWORD");

    const existingStr = existingPages?.length
      ? `\nBereits existierende Seiten (nicht erneut vorschlagen): ${existingPages.join(", ")}`
      : "";

    const prompt = `Du bist SEO-Cluster-Architekt. Analysiere das Pillar-Keyword: '${pillarKeyword.trim()}'${existingStr}

Erstelle eine vollständige Cluster-Architektur.
Antworte NUR mit reinem JSON ohne Markdown-Backticks:
{
  "cluster_name": "Name des Themen-Clusters",
  "pillar_analysis": {
    "main_topic": "...",
    "target_audience": "...",
    "search_intent": "..."
  },
  "suggested_pages": [
    {
      "keyword": "exaktes Keyword",
      "page_type": "supporting_info|supporting_commercial|transactional_local|deep_page",
      "intent": "Informational|Commercial|Transactional|Local",
      "priority": "must_have|recommended|optional",
      "reason": "Warum diese Seite wichtig ist (1-2 Sätze)",
      "content_angle": "Welchen spezifischen Winkel die Seite abdeckt",
      "differentiator": "Was diese Seite besser macht als Wettbewerber",
      "internal_link_anchor": "Anchor-Text für Link von Pillar",
      "estimated_difficulty": 20
    }
  ],
  "cluster_logic": "Erklärung der Gesamt-Strategie",
  "priority_order": ["keyword1", "keyword2"]
}

Regeln:
- must_have: ohne diese Seite ist der Cluster unvollständig
- recommended: starker SEO-Vorteil, klar empfohlen
- optional: nice-to-have, bei ausreichend Budget
- Mindestens 3 must_have, 4-6 recommended, 2-4 optional
- Alle Seiten müssen eigenständigen Mehrwert liefern
- Keine Keyword-Kannibalisierung untereinander`;

    // CALL 1: Kie.AI (korrekter Anthropic-Endpoint)
    const aiResponse = await fetch("https://api.kie.ai/claude/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error("Kie.AI error:", aiResponse.status, errBody);
      if (aiResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Kie.AI: Ungültiger API Key (401)" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Kie.AI: Rate Limit erreicht (429) — 30 Sek warten" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Kie.AI HTTP ${aiResponse.status}: ${errBody}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let rawContent: string;
    try {
      rawContent = extractKieContent(aiData);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse error from Kie.AI:", rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Kie.AI-Antwort konnte nicht als JSON gelesen werden.", raw: rawContent.substring(0, 500) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestedPages = (parsed.suggested_pages as Array<Record<string, unknown>>) || [];
    const keywords = suggestedPages.map((p) => p.keyword as string).filter(Boolean);

    // CALL 2: DataForSEO volume (if credentials available)
    let volumeData: Record<string, { volume: number; difficulty: number; cpc: number }> = {};

    if (dfLogin && dfPassword && keywords.length > 0) {
      try {
        const dfResponse = await fetch(
          "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`${dfLogin}:${dfPassword}`)}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([{ keywords, location_code: 1003854, language_code: "de" }]),
          }
        );

        if (dfResponse.ok) {
          const dfData = await dfResponse.json();
          const items = dfData?.tasks?.[0]?.result || [];
          for (const item of items) {
            if (item.keyword) {
              volumeData[item.keyword] = {
                volume: item.search_volume || 0,
                difficulty: item.keyword_info?.keyword_difficulty || item.competition_index || 0,
                cpc: item.cpc || 0,
              };
            }
          }
        }
      } catch (e) {
        console.error("DataForSEO error (non-critical):", e);
      }
    }

    // Merge results
    const mergedPages = suggestedPages.map((page, i) => {
      const kw = (page.keyword as string) || "";
      const vol = volumeData[kw];
      return {
        keyword: kw,
        page_type: page.page_type || "supporting_info",
        intent: page.intent || "Informational",
        priority: page.priority || "recommended",
        reason: page.reason || "",
        content_angle: page.content_angle || "",
        differentiator: page.differentiator || "",
        internal_link_anchor: page.internal_link_anchor || "",
        estimated_volume: vol?.volume || 0,
        estimated_difficulty: vol?.difficulty || (page.estimated_difficulty as number) || 0,
        sort_order: i,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        cluster_name: parsed.cluster_name || pillarKeyword.trim(),
        pillar_analysis: parsed.pillar_analysis || {},
        cluster_logic: parsed.cluster_logic || "",
        priority_order: parsed.priority_order || [],
        suggested_pages: mergedPages,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-cluster error:", err);
    return new Response(
      JSON.stringify({ error: `Interner Fehler: ${(err as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
