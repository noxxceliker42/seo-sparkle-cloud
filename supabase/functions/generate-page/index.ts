import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ─── Design Systems ───────────────────────────────────────────────────────
const DESIGN_SYSTEMS: Record<string, any> = {
  trust: {
    name: "Trust & Service",
    description: "Professionell, vertrauenswürdig, klar",
    typography: { headlines: "system-ui, -apple-system, 'Segoe UI', sans-serif", body: "system-ui, -apple-system, 'Segoe UI', sans-serif", headlineWeight: "800", bodyLineHeight: "1.7" },
    layout: { heroType: "grid-2col-image-right", sectionSpacing: "70px", cardRadius: "12px", cardShadow: "0 2px 12px rgba(0,0,0,0.08)", maxWidth: "1140px" },
    components: { buttonStyle: "filled primary + outline secondary", cardHover: "translateY(-3px) + shadow increase", heroOverlay: "none" },
    cssVars: "--c-primary: #1d4ed8; --c-primary-dark: #1e3a8a; --c-accent: #dc2626; --c-hero-bg: #fff5f5; --c-card-bg: #ffffff; --c-text: #1e293b; --c-muted: #64748b; --c-border: #e2e8f0; --radius-card: 12px; --shadow-card: 0 2px 12px rgba(0,0,0,0.08); --max-w: 1140px;",
  },
  glassmorphism: {
    name: "Midnight Executive",
    description: "Premium, dunkel, Glassmorphism",
    typography: { headlines: "'Playfair Display', 'Georgia', serif", body: "'Inter var', system-ui, sans-serif", headlineWeight: "700", bodyLineHeight: "1.8" },
    layout: { heroType: "fullwidth-dark-overlay-centered", sectionSpacing: "80px", cardRadius: "16px", cardShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: "1200px" },
    components: { buttonStyle: "glass button with border glow", cardHover: "border-color: rgba(255,255,255,0.3)", heroOverlay: "linear-gradient dark overlay" },
    cssVars: "--c-bg: #0f172a; --c-surface: #1e293b; --c-card: rgba(255,255,255,0.08); --c-primary: #3b82f6; --c-accent: #6366f1; --c-text: #f1f5f9; --c-muted: #94a3b8; --c-border: rgba(255,255,255,0.15); --radius-card: 16px; --blur: blur(12px); --shadow-card: 0 8px 32px rgba(0,0,0,0.4); --max-w: 1200px;",
    specialRules: "body { background: #0f172a; color: #f1f5f9; } .card { background: rgba(255,255,255,0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); } section:nth-child(even) { background: rgba(255,255,255,0.03); }",
  },
  editorial: {
    name: "Clean Editorial",
    description: "Journalistisch, minimalistisch, textstark",
    typography: { headlines: "'Georgia', 'Times New Roman', serif", body: "'Charter', 'Georgia', serif", headlineWeight: "700", bodyLineHeight: "1.85" },
    layout: { heroType: "single-column-text-heavy", sectionSpacing: "80px", cardRadius: "4px", cardShadow: "none", maxWidth: "900px" },
    components: { buttonStyle: "minimal text links + one strong CTA", cardHover: "border-color dark", heroOverlay: "none" },
    cssVars: "--c-primary: #1c1917; --c-accent: #dc2626; --c-hero-bg: #fafaf9; --c-card-bg: #ffffff; --c-text: #1c1917; --c-muted: #78716c; --c-border: #e5e5e4; --radius-card: 4px; --shadow-card: none; --max-w: 900px;",
  },
  eco: {
    name: "Eco Service",
    description: "Nachhaltig, organisch, vertrauenswürdig",
    typography: { headlines: "'Nunito', 'Trebuchet MS', sans-serif", body: "'Nunito', system-ui, sans-serif", headlineWeight: "800", bodyLineHeight: "1.7" },
    layout: { heroType: "grid-2col-organic-shapes", sectionSpacing: "60px", cardRadius: "20px", cardShadow: "0 4px 16px rgba(6,95,70,0.1)", maxWidth: "1100px" },
    components: { buttonStyle: "filled green + outline", cardHover: "scale(1.02) + shadow", heroOverlay: "none" },
    cssVars: "--c-primary: #065f46; --c-accent: #16a34a; --c-hero-bg: #f0fdf4; --c-text: #14532d; --c-muted: #6b7280; --c-border: #bbf7d0; --radius-card: 20px; --shadow-card: 0 4px 16px rgba(6,95,70,0.1); --max-w: 1100px;",
  },
  craft: {
    name: "Warm Craft",
    description: "Handwerklich, warm, persönlich",
    typography: { headlines: "'Merriweather', 'Georgia', serif", body: "'Source Serif Pro', 'Georgia', serif", headlineWeight: "700", bodyLineHeight: "1.75" },
    layout: { heroType: "warm-overlay-grid", sectionSpacing: "65px", cardRadius: "8px", cardShadow: "0 2px 8px rgba(154,52,18,0.1)", maxWidth: "1120px" },
    components: { buttonStyle: "warm filled + text secondary", cardHover: "translateY(-2px) + warm shadow", heroOverlay: "subtle warm tint" },
    cssVars: "--c-primary: #9a3412; --c-accent: #fb923c; --c-hero-bg: #fff7ed; --c-card-bg: #fffbf5; --c-text: #431407; --c-muted: #78716c; --c-border: #fed7aa; --radius-card: 8px; --shadow-card: 0 2px 8px rgba(154,52,18,0.1); --max-w: 1120px;",
  },
  tech: {
    name: "Tech Precision",
    description: "Technisch, präzise, modern",
    typography: { headlines: "'JetBrains Mono', 'Courier New', monospace", body: "system-ui, -apple-system, sans-serif", headlineWeight: "700", bodyLineHeight: "1.65" },
    layout: { heroType: "technical-data-grid", sectionSpacing: "60px", cardRadius: "6px", cardShadow: "0 1px 4px rgba(12,74,110,0.15)", maxWidth: "1160px" },
    components: { buttonStyle: "outlined + mono text", cardHover: "border-primary + subtle glow", heroOverlay: "none" },
    cssVars: "--c-primary: #0c4a6e; --c-accent: #0284c7; --c-hero-bg: #f0f9ff; --c-text: #0c4a6e; --c-muted: #64748b; --c-border: #bae6fd; --radius-card: 6px; --shadow-card: 0 1px 4px rgba(12,74,110,0.15); --max-w: 1160px;",
  },
};
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
      const key = Deno.env.get("ANTHROPIC_API_KEY");
      return new Response(JSON.stringify({
        ok: true, keyPresent: !!key, keyPrefix: key?.slice(0, 8) + "...",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log(`[${reqId}] ANTHROPIC_KEY:`, !!anthropicKey);
    console.log(`[${reqId}] Keyword:`, body?.keyword);

    if (!anthropicKey) {
      return new Response(JSON.stringify({
        error: "ANTHROPIC_API_KEY nicht konfiguriert",
        hint: "Lovable Cloud → Secrets → ANTHROPIC_API_KEY eintragen",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let createClient: any;
    try {
      const mod = await import("https://esm.sh/@supabase/supabase-js@2.39.0");
      createClient = mod.createClient;
    } catch (importErr: unknown) {
      const ie = importErr as Error;
      return new Response(JSON.stringify({ error: "Supabase client import failed", detail: ie.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl ?? "", serviceKey ?? "");

    // Get user_id from auth header
    let userId: string | null = (body.userId as string) || null;
    const authHeader = req.headers.get("authorization") || "";
    if (!userId && authHeader && supabaseUrl) {
      try {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) userId = user.id;
      } catch (e) {
        console.error(`[${reqId}] Auth check failed:`, e);
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .insert({
        user_id: userId,
        keyword: (body.keyword as string) || "Unbekannt",
        status: "running",
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error(`[${reqId}] Job Fehler:`, jobError);
      return new Response(JSON.stringify({ error: "Job konnte nicht angelegt werden", detail: jobError?.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${reqId}] Job ID:`, job.id);

    // Fire-and-forget
    EdgeRuntime.waitUntil(
      runGeneration(body, job.id, userId, supabase, anthropicKey, reqId)
    );

    return new Response(JSON.stringify({
      jobId: job.id,
      status: "running",
      message: "Generierung gestartet",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[${reqId}] FATAL:`, error.message);
    return new Response(JSON.stringify({ error: error.message || "Unbekannter Fehler" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- Background generation ---

async function runGeneration(
  body: Record<string, unknown>,
  jobId: string,
  userId: string,
  supabase: any,
  anthropicKey: string,
  reqId: string,
) {
  const startTime = Date.now();

  try {
    const prompt = buildPrompt(body);
    console.log(`[${reqId}] Prompt Länge:`, prompt.length);
    console.log(`[${reqId}] Anthropic Call startet...`);

    // Anthropic API — single call, NO AbortSignal, 64000 tokens
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 64000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    console.log(`[${reqId}] Anthropic Status:`, response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[${reqId}] Anthropic Fehler:`, errText.slice(0, 500));
      throw new Error(`Anthropic HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const apiData = await response.json();
    const rawContent = apiData?.content?.[0]?.text || "";
    const tokensUsed = apiData?.usage?.output_tokens || 0;
    const stopReason = apiData?.stop_reason || "unknown";
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`[${reqId}] Content Länge:`, rawContent.length);
    console.log(`[${reqId}] Output Tokens:`, tokensUsed);
    console.log(`[${reqId}] Stop Reason:`, stopReason);
    console.log(`[${reqId}] Dauer:`, duration, "Sek");

    if (!rawContent.trim()) {
      throw new Error(`Leere Antwort. stop_reason: ${stopReason}. tokens: ${tokensUsed}`);
    }

    const parsed = parseFullResponse(rawContent);

    console.log(`[${reqId}] HTML Länge:`, parsed.htmlOutput.length);
    console.log(`[${reqId}] HTML vollständig:`, parsed.htmlOutput.trim().endsWith("</html>"));
    console.log(`[${reqId}] JSON-LD Länge:`, parsed.jsonLdOutput.length);

    // Save to seo_pages
    let pageId: string | null = null;
    try {
      const { data: savedPage, error: saveError } = await supabase
        .from("seo_pages")
        .insert({
          keyword: (body.keyword as string) || "",
          firm: (body.firmName as string) || (body.firm as string) || "",
          city: (body.city as string) || "",
          html_output: parsed.htmlOutput,
          body_content: parsed.bodyContent,
          css_block: parsed.cssBlock,
          json_ld: parsed.jsonLdOutput,
          meta_title: parsed.metaTitle,
          meta_desc: parsed.metaDesc,
          meta_keywords: parsed.metaKeywords,
          intent: (body.intent as string) || null,
          page_type: (body.pageType as string) || null,
          status: "draft",
          design_preset: (body.designPreset as string) || "trust",
          contao_mode: (body.contaoMode as boolean) || false,
          active_sections: (body.activeSections as string[]) || [],
          user_id: userId,
          score: 0,
        })
        .select("id")
        .single();

      if (saveError) {
        console.error(`[${reqId}] seo_pages save error:`, saveError);
      } else {
        pageId = savedPage?.id || null;
      }
    } catch (dbErr) {
      console.error(`[${reqId}] seo_pages save exception:`, dbErr);
    }

    // Update cluster_pages if applicable
    if (body.clusterPageId && pageId) {
      await supabase.from("cluster_pages").update({
        seo_page_id: pageId, status: "generated", updated_at: new Date().toISOString(),
      }).eq("id", body.clusterPageId);
    }

    // Mark job completed
    await supabase
      .from("generation_jobs")
      .update({
        status: "completed",
        page_id: pageId,
        html_output: parsed.htmlOutput,
        body_content: parsed.bodyContent,
        css_block: parsed.cssBlock,
        json_ld: parsed.jsonLdOutput,
        meta_title: parsed.metaTitle,
        meta_desc: parsed.metaDesc,
        meta_keywords: parsed.metaKeywords,
        prompt_used: prompt,
        tokens_used: tokensUsed,
        stop_reason: stopReason,
        duration_seconds: duration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[${reqId}] === FERTIG ===`, pageId);

  } catch (err: unknown) {
    const error = err as Error;
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`[${reqId}] GENERATION ERROR:`, error.message);

    await supabase
      .from("generation_jobs")
      .update({
        status: "error",
        error_message: error.message,
        duration_seconds: duration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

// --- Parsing ---

function parseFullResponse(raw: string): {
  htmlOutput: string; bodyContent: string; cssBlock: string;
  jsonLdOutput: string; metaTitle: string; metaDesc: string; metaKeywords: string;
} {
  // Meta block before first ```
  const metaBlock = raw.split("```")[0];

  const titleMatch = metaBlock.match(/^Title:\s*(.+)$/mi);
  const descMatch = metaBlock.match(/^Description:\s*(.+)$/mi);
  const keywordsMatch = metaBlock.match(/^Keywords:\s*(.+)$/mi);

  // HTML blocks
  const htmlBlocks = [...raw.matchAll(/```html\s*([\s\S]*?)```/gi)]
    .map((m) => m[1].trim()).filter((b) => b.length > 0);

  let htmlOutput = htmlBlocks[0] || "";

  if (!htmlOutput) {
    const docMatch = raw.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
    htmlOutput = docMatch?.[1] || raw;
  }

  // Ensure HTML is complete
  if (!htmlOutput.trim().endsWith("</html>")) {
    htmlOutput = htmlOutput.trim() + "\n</body>\n</html>";
  }

  // Second block = JSON-LD
  const jsonLdOutput = htmlBlocks[1] || extractJsonLd(htmlOutput);

  // Extract body content
  const bodyMatch = htmlOutput.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch?.[1]?.trim() || htmlOutput;

  // Extract CSS block
  const styleMatch = htmlOutput.match(/(<style[^>]*>[\s\S]*?<\/style>)/i);
  const cssBlock = styleMatch?.[1] || "";

  return {
    htmlOutput,
    bodyContent,
    cssBlock,
    jsonLdOutput,
    metaTitle: titleMatch?.[1]?.trim()?.slice(0, 60) || "",
    metaDesc: descMatch?.[1]?.trim()?.slice(0, 155) || "",
    metaKeywords: keywordsMatch?.[1]?.trim() || "",
  };
}

function extractJsonLd(html: string): string {
  const matches = [...html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  )];
  return matches.map((m) => m[0]).join("\n");
}

// --- Prompt ---

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

WICHTIG: Schreibe ALLE Sektionen vollständig aus. Kürze nichts ab. Kein Platzhaltertext. Vollständiges HTML bis </html> ist Pflicht.

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
