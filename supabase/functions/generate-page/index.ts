import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reqId = Math.random().toString(36).slice(2, 9);
  console.log(`[${reqId}] === GENERATE-PAGE START ===`);

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test ping
    if ((body as Record<string, unknown>)?.test === true) {
      const kieKey = Deno.env.get("KIE_AI_API_KEY");
      return new Response(JSON.stringify({
        ok: true, message: "generate-page läuft",
        keyPresent: !!kieKey, keyPrefix: kieKey?.slice(0, 8) + "...",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const kieKey = Deno.env.get("KIE_AI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log(`[${reqId}] KIE_KEY:`, !!kieKey, "SUPA_URL:", !!supabaseUrl, "SVC_KEY:", !!serviceKey);

    if (!kieKey) {
      return new Response(JSON.stringify({
        error: "KIE_AI_API_KEY nicht konfiguriert",
        hint: "Lovable Cloud → Secrets → KIE_AI_API_KEY eintragen",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Dynamic import to avoid top-level crash
    console.log(`[${reqId}] Loading supabase-js...`);
    let createClient: any;
    try {
      const mod = await import("https://esm.sh/@supabase/supabase-js@2.39.0");
      createClient = mod.createClient;
      console.log(`[${reqId}] supabase-js loaded OK`);
    } catch (importErr: unknown) {
      const ie = importErr as Error;
      console.error(`[${reqId}] supabase-js import FAILED:`, ie.message);
      return new Response(JSON.stringify({ error: "Supabase client import failed", detail: ie.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl ?? "", serviceKey ?? "");

    const prompt = buildPrompt(body);
    console.log(`[${reqId}] Prompt length: ${prompt.length}`);

    // Kie.AI call with timeout
    console.log(`[${reqId}] Calling Kie.AI...`);
    let kieResponse: Response;
    try {
      kieResponse = await fetch("https://api.kie.ai/claude/v1/messages", {
        method: "POST",
        headers: { "Authorization": `Bearer ${kieKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 16000,
          stream: false,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(120000),
      });
    } catch (fetchErr: unknown) {
      const err = fetchErr as Error;
      console.error(`[${reqId}] Kie.AI fetch FAILED:`, err.name, err.message);
      if (err.name === "AbortError" || err.name === "TimeoutError") {
        return new Response(JSON.stringify({ error: "Kie.AI Timeout nach 120 Sekunden" }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Kie.AI nicht erreichbar: ${err.message}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[${reqId}] Kie.AI responded: ${kieResponse.status}`);

    console.log(`[${reqId}] Kie.AI status: ${kieResponse.status}`);

    if (!kieResponse.ok) {
      const errText = await kieResponse.text();
      console.error(`[${reqId}] Kie.AI error:`, errText.slice(0, 300));
      return new Response(JSON.stringify({
        error: `Kie.AI HTTP ${kieResponse.status}`, detail: errText.slice(0, 500),
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const kieData = await kieResponse.json();
    const rawContent: string = kieData?.content?.[0]?.text || "";

    console.log(`[${reqId}] Content length: ${rawContent.length}`);

    if (!rawContent.trim()) {
      return new Response(JSON.stringify({
        error: "Leere Antwort von Kie.AI", stopReason: kieData?.stop_reason,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { htmlOutput, jsonLdOutput, metaTitle, metaDesc } = parseResponse(rawContent);
    console.log(`[${reqId}] HTML: ${htmlOutput.length}, JSON-LD: ${jsonLdOutput.length}`);

    // Save to DB
    let pageId: string | null = null;
    const authHeader = req.headers.get("authorization") || "";
    if (supabaseUrl && authHeader) {
      try {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const { data: savedPage, error: saveError } = await supabase
            .from("seo_pages")
            .insert({
              keyword: (body.keyword as string) || "",
              firm: (body.firmName as string) || (body.firm as string) || "",
              city: (body.city as string) || "",
              html_output: htmlOutput,
              json_ld: jsonLdOutput,
              meta_title: metaTitle,
              meta_desc: metaDesc,
              intent: (body.intent as string) || null,
              page_type: (body.pageType as string) || null,
              status: "draft",
              design_preset: (body.designPreset as string) || "trust",
              active_sections: (body.activeSections as string[]) || [],
              user_id: user.id,
              score: 0,
            })
            .select("id")
            .single();
          if (saveError) console.error(`[${reqId}] DB save error:`, saveError);
          pageId = savedPage?.id || null;

          if (body.clusterPageId && pageId) {
            await supabase.from("cluster_pages").update({
              seo_page_id: pageId, status: "generated", updated_at: new Date().toISOString(),
            }).eq("id", body.clusterPageId);
          }
        }
      } catch (dbErr) {
        console.error(`[${reqId}] DB error (non-fatal):`, dbErr);
      }
    }

    console.log(`[${reqId}] === GENERATE-PAGE SUCCESS ===`);

    return new Response(JSON.stringify({
      success: true, pageId, metaTitle, metaDesc,
      htmlOutput, jsonLd: jsonLdOutput, masterPrompt: prompt,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[${reqId}] UNHANDLED:`, error.message, error.stack?.slice(0, 500));
    return new Response(JSON.stringify({
      error: error.message || "Unbekannter Fehler", success: false,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// --- Helper functions ---

function parseResponse(raw: string): {
  htmlOutput: string; jsonLdOutput: string; metaTitle: string; metaDesc: string;
} {
  const htmlBlocks = [...raw.matchAll(/```(?:html)?\s*\n?([\s\S]*?)```/gi)]
    .map((m) => m[1].trim()).filter((b) => b.length > 0);

  const titleMatch = raw.match(/(?:Title|Titel|SEO-Titel):\s*(.+)/i);
  const descMatch = raw.match(/(?:Description|Beschreibung|Meta-Desc):\s*(.+)/i);

  let htmlOutput = htmlBlocks[0] || "";
  if (!htmlOutput) {
    const bodyMatch = raw.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
    htmlOutput = bodyMatch?.[1] || raw;
  }

  const jsonLdOutput = htmlBlocks[1] || extractJsonLd(htmlOutput);

  return {
    htmlOutput,
    jsonLdOutput,
    metaTitle: titleMatch?.[1]?.trim()?.slice(0, 60) || "",
    metaDesc: descMatch?.[1]?.trim()?.slice(0, 155) || "",
  };
}

function extractJsonLd(html: string): string {
  const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i);
  return match?.[0] || "";
}

function buildPrompt(data: Record<string, unknown>): string {
  const sections = Array.isArray(data.activeSections)
    ? (data.activeSections as string[]).join(" · ")
    : "01 Hero · 02 Problem · 04 Symptome · 05 Selbsthilfe · 07 Unique Data · 08 Info Gain · 09 Ablauf · 10 Preise · 14 FAQ · 15 Autor";

  return `Du bist SEO-Experte. Erstelle eine vollständige SEO-Seite.

KEYWORD: "${data.keyword || "Keyword"}"
INTENT: ${data.intent || "Informational"}
SEITENTYP: ${data.pageType || "Supporting Info"}
SEKUNDÄR-KEYWORDS: ${data.secondaryKeywords || "keine"}
LSI-BEGRIFFE: ${data.lsiTerms || data.lsi || "keine"}
NEGATIVE KEYWORDS: ${data.negativeKeywords || "keine"}
PILLAR-URL: ${data.pillarUrl || "keine"}
PILLAR-TITEL: ${data.pillarTitle || "keine"}
GESCHWISTER-SEITEN: ${data.siblingPages || "keine"}
DEEP PAGES: ${data.deepPages || "keine"}
CONTENT-GAP: ${data.contentGap || "keine"}
PAA-FRAGEN: ${data.paaQuestions || data.paa || "keine"}

FIRMA: ${data.firmName || data.firm || ""}
STRASSE: ${data.street || ""}
PLZ: ${data.zip || ""} STADT: ${data.city || "Berlin"}
TELEFON: ${data.phone || ""}
WEBSITE: ${data.website || ""}
SERVICEGEBIET: ${data.serviceArea || ""}
UNIQUE DATA: ${data.uniqueData || "keine"}

AUTOR: ${data.authorName || data.author || ""}
BERUFSBEZEICHNUNG: ${data.authorTitle || data.role || ""}
ERFAHRUNG: ${data.experienceYears || data.experience || ""} Jahre
ZERTIFIKATE: ${data.certificates || ""}
REVIEWER: ${data.reviewer || ""}
FALLSTUDIE: ${data.caseStudy || "keine"}

KVA-PREIS: ${data.kvaPrice || "k.A."} €
PREISSPANNE: ${data.priceRange || "k.A."}
PREISKARTE 1: ${data.priceCard1 || "keine"}
PREISKARTE 2: ${data.priceCard2 || "keine"}
PREISKARTE 3: ${data.priceCard3 || "keine"}
REPARATUR VS NEUKAUF: ${data.repairVsBuy || "keine"}

TONE OF VOICE: ${data.toneOfVoice || "Sachlich-kompetent"}
BILD-STRATEGIE: ${data.imageStrategy || "Platzhalter"}
RATING: ${data.rating || "4.9"} / 5 (${data.reviewCount || "0"} Bewertungen)
BREADCRUMB: ${data.breadcrumb || "Start > Seite"}
SCHEMA-BLÖCKE: ${Array.isArray(data.schemaBlocks) ? (data.schemaBlocks as string[]).join(", ") : "FAQPage, HowTo, LocalBusiness"}

INFORMATION GAIN (2026): ${data.informationGain || data.infoGain || "keine"}
DISCOVER-READY: ${data.discoverReady || "Platzhalter"}

DESIGN-TOKENS (Inline CSS, Pre-Set: "${data.designPreset || "trust"}"):
:root {
  --c-primary: ${data.primaryColor || "#dc2626"};
  --c-hero-bg: ${data.heroBg || "#fff5f5"};
  --faq-bg: #f8fafc;
  --radius-card: 12px;
}

AKTIVE SEKTIONEN: ${sections}

BILD-PLATZHALTER:
Setze an sinnvollen Stellen Bild-Platzhalter mit data-img-slot Attributen.
Format: <img src="PLACEHOLDER_[SLOT]" data-img-slot="[SLOT]" data-img-context="[Kontext]" alt="PLACEHOLDER_ALT_[SLOT]" width="[W]" height="[H]" loading="[eager/lazy]">
Erlaubte Slots: hero (1200x675, eager), howto (800x450, lazy), ablauf (800x450, lazy), unique (800x450, lazy), autor (80x80, lazy)

SEO-REGELN (alle einhalten):
1. Keyword nur in H1 + Title + URL-Slug + erster Hero-Satz. Danach Synonyme.
2. Reiner Intent, kein Mix.
3. Interne Links zu Pillar + Geschwister.
4. AIDA+T: Problem zuerst, CTA nach Sek.9.
5. E-E-A-T: Modellnummer, Fachbegriffe, Autorbox.
6. Information Gain Sektion prominent.
7. Mount-AI-Schutz: Jede Sektion hat echten Informationsgehalt.
8. Schema in JSON-LD.
9. CWV: Inline CSS, width/height fix, ein Script.
10. Discover-Ready: Hero-Bild 1200x675, max-image-preview:large im Head.
11. Voice Search: Fragesätze in H2.
12. NAP überall identisch.
13. Duplikat-Schutz: page-uid Kommentar, variierte Micro-Texte.

AUSGABE-FORMAT:
1. META-BLOCK (3 Zeilen Plaintext):
Title: [max 60 Zeichen]
Description: [140-155 Zeichen]
Keywords: [kommasepariert]

2. \`\`\`html
[vollständiger Body mit allen aktiven Sektionen, Inline CSS, Bild-Platzhalter]
\`\`\`

3. \`\`\`html
[JSON-LD Schema-Blöcke]
\`\`\`

Antworte SOFORT mit dem Output, keine Erklärungen vorher.`;
}
