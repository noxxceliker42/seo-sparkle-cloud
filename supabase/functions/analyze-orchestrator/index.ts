import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ── Kie.AI Analysis ──────────────────────────────────────
async function runSeoAnalyze(keyword: string, firm?: string, city?: string) {
  const apiKey = Deno.env.get("KIE_AI_API_KEY");
  if (!apiKey) throw new Error("KIE_AI_API_KEY nicht konfiguriert");

  const contextParts: string[] = [];
  if (firm) contextParts.push(`Firma: ${firm}`);
  if (city) contextParts.push(`Stadt: ${city}`);
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
- information_gain_suggestions: mindestens 3 Punkte
- discover_angle: konkreter Vorschlag
- Nur reines JSON, keine Backticks, kein Markdown`;

  const response = await fetch("https://api.kie.ai/claude/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 401) throw new Error("Kie.AI: Ungültiger API Key (401)");
    if (response.status === 429) throw new Error("Kie.AI: Rate Limit erreicht (429)");
    throw new Error(`Kie.AI HTTP ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  let rawContent: string | undefined;
  if (data?.content && Array.isArray(data.content)) {
    const textBlock = data.content.find((b: { type: string; text?: string }) => b.type === "text");
    rawContent = textBlock?.text;
  } else if (data?.choices?.[0]?.message?.content) {
    rawContent = data.choices[0].message.content;
  }

  if (!rawContent) throw new Error("Kie.AI: Leere Antwort");

  const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

// ── SERP Data ────────────────────────────────────────────
async function runSerpData(keyword: string) {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("DataForSEO Zugangsdaten fehlen");

  const encoded = btoa(`${login}:${password}`);
  const response = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
    method: "POST",
    headers: { "Authorization": `Basic ${encoded}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ keyword: keyword.trim(), location_code: 1003854, language_code: "de", device: "desktop", depth: 10 }]),
  });

  if (!response.ok) throw new Error(`DataForSEO SERP HTTP ${response.status}`);
  const data = await response.json();
  const task = data?.tasks?.[0];
  if (!task || task.status_code !== 20000) throw new Error(task?.status_message || "SERP fehlgeschlagen");

  const items = task.result?.[0]?.items || [];
  const paa_verified = items
    .filter((i: any) => i.type === "people_also_ask" || i.type === "people_also_ask_element")
    .flatMap((i: any) => i.items?.map((s: any) => ({ question: s.title || "", url: s.url || "", snippet: s.description || "" })) || [{ question: i.title || "", url: "", snippet: "" }]);
  const top_urls = items.filter((i: any) => i.type === "organic").slice(0, 10).map((i: any) => ({ url: i.url || "", title: i.title || "", description: i.description || "", position: i.rank_absolute || 0 }));
  const related = items.filter((i: any) => i.type === "related_searches").flatMap((i: any) => i.items?.map((s: any) => s.title || "") || []);

  return { paa_verified, top_urls, related, total_results: task.result?.[0]?.se_results_count || 0 };
}

// ── Keyword Volume ───────────────────────────────────────
async function runKeywordVolume(keywords: string[]) {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("DataForSEO Zugangsdaten fehlen");

  const encoded = btoa(`${login}:${password}`);
  const response = await fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
    method: "POST",
    headers: { "Authorization": `Basic ${encoded}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ keywords: keywords.map(k => k.trim()).filter(Boolean), location_code: 1003854, language_code: "de" }]),
  });

  if (!response.ok) throw new Error(`DataForSEO Volume HTTP ${response.status}`);
  const data = await response.json();
  const task = data?.tasks?.[0];
  if (!task || task.status_code !== 20000) throw new Error(task?.status_message || "Volume fehlgeschlagen");

  const results: Record<string, { volume: number; difficulty: number; cpc: number; competition: number }> = {};
  for (const item of (task.result || [])) {
    if (item.keyword) {
      results[item.keyword] = {
        volume: item.search_volume || 0,
        difficulty: item.keyword_info?.keyword_difficulty || item.competition_index || 0,
        cpc: item.cpc || 0,
        competition: item.competition || 0,
      };
    }
  }
  return results;
}

// ── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { jobId, keyword, firm, city } = await req.json();

    if (!jobId || !keyword) {
      return new Response(
        JSON.stringify({ error: "jobId und keyword erforderlich" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = getSupabaseAdmin();

    // Mark job as running
    await supabase.from("analysis_jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", jobId);

    // Immediately respond — work continues in background
    // We use waitUntil-like pattern: start work, respond early
    const doWork = async () => {
      try {
        const [analysis, serp, volume] = await Promise.allSettled([
          runSeoAnalyze(keyword, firm, city),
          runSerpData(keyword),
          runKeywordVolume([keyword]),
        ]);

        const result: Record<string, unknown> = {};
        const errors: string[] = [];

        if (analysis.status === "fulfilled") {
          result.analysis = analysis.value;
        } else {
          errors.push(`AI: ${analysis.reason?.message || "Fehler"}`);
        }

        if (serp.status === "fulfilled") {
          result.serp = serp.value;
        } else {
          errors.push(`SERP: ${serp.reason?.message || "Fehler"}`);
        }

        if (volume.status === "fulfilled") {
          result.volume = volume.value;
        } else {
          errors.push(`Volume: ${volume.reason?.message || "Fehler"}`);
        }

        result.rawJson = JSON.stringify(result, null, 2);

        // If AI analysis succeeded, mark as completed (SERP/Volume errors are non-fatal)
        if (analysis.status === "fulfilled") {
          await supabase.from("analysis_jobs").update({
            status: "completed",
            result_json: result,
            completed_at: new Date().toISOString(),
            error_message: errors.length > 0 ? errors.join("; ") : null,
          }).eq("id", jobId);
        } else {
          await supabase.from("analysis_jobs").update({
            status: "error",
            error_message: errors.join("; "),
            completed_at: new Date().toISOString(),
          }).eq("id", jobId);
        }
      } catch (err) {
        console.error("Orchestrator error:", err);
        await supabase.from("analysis_jobs").update({
          status: "error",
          error_message: (err as Error).message,
          completed_at: new Date().toISOString(),
        }).eq("id", jobId);
      }
    };

    // Run work in background, respond immediately
    // EdgeRuntime supports top-level await, so we can't truly detach.
    // Instead, we run the work and respond after it completes.
    // The key insight: this runs SERVER-SIDE, so tab switches don't matter.
    await doWork();

    return new Response(
      JSON.stringify({ success: true, jobId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("analyze-orchestrator error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
