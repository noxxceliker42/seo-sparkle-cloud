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

  const reqId = Math.random().toString(36).slice(2, 8);
  console.log(`[${reqId}] START`);

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test-Ping
    if (body?.test === true) {
      const key = Deno.env.get("ANTHROPIC_API_KEY");
      console.log(`[${reqId}] TEST PING - key:`, !!key);
      return new Response(
        JSON.stringify({ ok: true, keyPresent: !!key }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log(`[${reqId}] Keys - anthropic:`, !!anthropicKey, "supabase:", !!supabaseUrl);

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY fehlt",
          hint: "Lovable Cloud → Secrets → ANTHROPIC_API_KEY",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0");
    const supabase = createClient(supabaseUrl ?? "", serviceKey ?? "");

    // Get user_id
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
      return new Response(
        JSON.stringify({ error: "Nicht authentifiziert" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${reqId}] Keyword:`, body?.keyword);
    console.log(`[${reqId}] Prompt wird gebaut...`);

    const prompt = buildPrompt(body);
    console.log(`[${reqId}] Prompt Länge:`, prompt.length);

    // ═══════════════════════════════════════
    // ANTHROPIC STREAMING CALL
    // Stream löst das 150s Supabase-Timeout:
    // Response beginnt sofort beim ersten Token,
    // Timeout gilt pro Chunk, nicht für Gesamtdauer.
    // ═══════════════════════════════════════
    console.log(`[${reqId}] Anthropic Streaming Call startet...`);
    const startTime = Date.now();

    let apiResponse: Response;
    try {
      apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 64000,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (fetchErr: any) {
      console.error(`[${reqId}] Fetch Error:`, fetchErr.message);
      return new Response(
        JSON.stringify({ error: "Anthropic nicht erreichbar: " + fetchErr.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${reqId}] Anthropic Status:`, apiResponse.status);

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error(`[${reqId}] Anthropic Error:`, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `Anthropic ${apiResponse.status}: ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════
    // BEDINGUNG C: TransformStream + waitUntil
    // Response wird SOFORT zurückgegeben,
    // Stream-Verarbeitung läuft im Hintergrund.
    // ═══════════════════════════════════════
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const processStream = async () => {
      const reader = apiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let outputTokens = 0;
      let inputTokens = 0;
      let stopReason = "unknown";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]" || !data) continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content_block_delta" &&
                  parsed.delta?.type === "text_delta") {
                fullContent += parsed.delta.text || "";
              }

              if (parsed.type === "message_delta") {
                outputTokens = parsed.usage?.output_tokens || outputTokens;
                if (parsed.delta?.stop_reason) {
                  stopReason = parsed.delta.stop_reason;
                }
              }

              if (parsed.type === "message_start" && parsed.message?.usage) {
                inputTokens = parsed.message.usage.input_tokens;
              }
            } catch {}
          }
        }
      } finally {
        reader.releaseLock();
      }

      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`[${reqId}] Content: ${fullContent.length} Zeichen`);
      console.log(`[${reqId}] Tokens: ${inputTokens} in / ${outputTokens} out`);
      console.log(`[${reqId}] Dauer: ${duration}s`);
      console.log(`[${reqId}] Stop: ${stopReason}`);
      console.log(`[${reqId}] Vollständig: ${fullContent.trim().endsWith("</html>")}`);

      if (!fullContent.trim()) {
        await writer.write(encoder.encode(JSON.stringify({
          error: "Leere Antwort von Anthropic",
          stopReason,
          success: false,
        })));
        await writer.close();
        return;
      }

      const parsed = parseFullResponse(fullContent);

      // In seo_pages speichern
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
      } catch (dbErr: any) {
        console.error(`[${reqId}] Save Error:`, dbErr.message);
      }

      // Update cluster_pages if applicable
      if (body.clusterPageId && pageId) {
        await supabase.from("cluster_pages").update({
          seo_page_id: pageId,
          status: "generated",
          updated_at: new Date().toISOString(),
        }).eq("id", body.clusterPageId);
      }

      // generation_jobs aktualisieren falls jobId vorhanden
      if (body.jobId) {
        try {
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
              tokens_used: outputTokens,
              stop_reason: stopReason,
              duration_seconds: duration,
              completed_at: new Date().toISOString(),
            })
            .eq("id", body.jobId);
        } catch {}
      }

      console.log(`[${reqId}] === SUCCESS === pageId: ${pageId}`);

      await writer.write(encoder.encode(JSON.stringify({
        success: true,
        html: parsed.htmlOutput,
        bodyContent: parsed.bodyContent,
        cssBlock: parsed.cssBlock,
        jsonLd: parsed.jsonLdOutput,
        metaTitle: parsed.metaTitle,
        metaDesc: parsed.metaDesc,
        metaKeywords: parsed.metaKeywords,
        prompt: prompt,
        pageId,
        tokensUsed: outputTokens,
        duration,
        stopReason,
        isComplete: parsed.htmlOutput.trim().endsWith("</html>"),
      })));
      await writer.close();
    };

    // Response wird SOFORT zurückgegeben — kein Timeout!
    EdgeRuntime.waitUntil(processStream());

    return new Response(readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (err: any) {
    console.error(`[${reqId}] FATAL:`, err.message);
    console.error(`[${reqId}] Stack:`, err.stack?.slice(0, 300));
    return new Response(
      JSON.stringify({ error: err.message || "Unbekannter Fehler", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════
// PARSE RESPONSE
// ═══════════════════════════════════════

function parseFullResponse(raw: string): {
  htmlOutput: string; bodyContent: string; cssBlock: string;
  jsonLdOutput: string; metaTitle: string; metaDesc: string; metaKeywords: string;
} {
  const metaBlock = raw.split("```")[0];
  const titleMatch = metaBlock.match(/^Title:\s*(.+)$/mi);
  const descMatch = metaBlock.match(/^Description:\s*(.+)$/mi);
  const keywordsMatch = metaBlock.match(/^Keywords:\s*(.+)$/mi);

  const htmlBlocks = [...raw.matchAll(/```html\s*([\s\S]*?)```/gi)]
    .map((m) => m[1].trim()).filter((b) => b.length > 0);

  let htmlOutput = htmlBlocks[0] || "";
  if (!htmlOutput) {
    const docMatch = raw.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
    htmlOutput = docMatch?.[1] || raw;
  }
  if (!htmlOutput.trim().endsWith("</html>")) {
    htmlOutput = htmlOutput.trim() + "\n</body>\n</html>";
  }

  const jsonLdOutput = htmlBlocks[1] || extractJsonLd(htmlOutput);
  const bodyMatch = htmlOutput.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch?.[1]?.trim() || htmlOutput;
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

// ═══════════════════════════════════════
// BUILD PROMPT
// ═══════════════════════════════════════

function buildPrompt(data: Record<string, unknown>): string {
  const ds = DESIGN_SYSTEMS[(data.designPreset as string) || "trust"] || DESIGN_SYSTEMS.trust;
  const isContao = data.contaoMode === true;
  const sections = Array.isArray(data.activeSections)
    ? (data.activeSections as string[]).join(" · ")
    : "01 Hero · 02 Problem · 04 Symptome · 05 Selbsthilfe · 07 Unique Data · 08 Info Gain · 09 Ablauf · 10 Preise · 14 FAQ · 15 Autor";

  return `Du bist SEO- und Frontend-Experte.
Erstelle eine vollständige, professionelle SEO-Seite.

══════════════════════════════════════
SEITEN-KONTEXT
══════════════════════════════════════
KEYWORD: "${data.keyword || "Keyword"}"
SEITENTYP: ${data.pageType || "Pillar Page"}
INTENT: ${data.intent || "Informational"}
SEKUNDÄR-KEYWORDS: ${truncateList(data.secondaryKeywords, 5)}
LSI-BEGRIFFE: ${truncateList(data.lsiTerms || data.lsi, 8)}
GESCHWISTER-SEITEN: ${truncateList(data.siblingPages, 3)}
DEEP PAGES: ${truncateList(data.deepPages, 2)}
CONTENT-GAP: ${truncateList(data.contentGap, 2)}
PAA-FRAGEN: ${data.paaQuestions || data.paa || "keine"}

══════════════════════════════════════
FIRMEN-DATEN (NAP — überall identisch)
══════════════════════════════════════
FIRMA: ${data.firmName || data.firm || ""}
STRASSE: ${data.street || ""}
PLZ + STADT: ${data.zip || ""} ${data.city || "Berlin"}
TELEFON: ${data.phone || ""}
WEBSITE: ${data.website || ""}
SERVICEGEBIET: ${data.serviceArea || "Berlin und Umland"}

══════════════════════════════════════
AUTOR & E-E-A-T
══════════════════════════════════════
AUTOR: ${data.authorName || data.author || ""}
BERUFSBEZEICHNUNG: ${data.authorTitle || data.role || ""}
ERFAHRUNG: ${data.experienceYears || data.experience || ""} Jahre
ZERTIFIKATE: ${data.certificates || ""}

══════════════════════════════════════
CONTENT-STRATEGIE
══════════════════════════════════════
UNIQUE DATA: ${data.uniqueData || "keine"}
INFORMATION GAIN (2026): ${data.informationGain || data.infoGain || "keine"}
RATING: ${data.rating || "4.9"} / 5 (${data.reviewCount || "0"} Bewertungen)
TONE OF VOICE: ${data.toneOfVoice || "Sachlich-kompetent"}

══════════════════════════════════════
PREISE
══════════════════════════════════════
KVA-PREIS: ${data.kvaPrice || "k.A."} €
PREISSPANNE: ${data.priceRange || "k.A."}

══════════════════════════════════════
DESIGN-SYSTEM: ${ds.name}
══════════════════════════════════════
Mood: ${ds.description}
Typografie Headlines: ${ds.typography.headlines}
Typografie Body: ${ds.typography.body}
Headline Weight: ${ds.typography.headlineWeight}
Body Line-Height: ${ds.typography.bodyLineHeight}
Hero-Layout: ${ds.layout.heroType}
Section Spacing: ${ds.layout.sectionSpacing}
Card-Radius: ${ds.layout.cardRadius}
Card-Shadow: ${ds.layout.cardShadow}
Max-Width: ${ds.layout.maxWidth}
Button-Stil: ${ds.components.buttonStyle}
Card-Hover: ${ds.components.cardHover}
${ds.specialRules ? "Spezialregeln:\n" + ds.specialRules : ""}

CSS-VARIABLEN:
:root {
  ${ds.cssVars}
}

CSS-MODUS: ${isContao
    ? "CONTAO-INLINE — ALLE Styles als style=\"\"-Attribut direkt am Element. KEIN <style>-Block. KEIN ::before/::after. KEIN @media. Nur flexbox (kein CSS Grid). Keine CSS-Variablen — alle Werte ausschreiben."
    : "STYLE-BLOCK — Zentraler <style>-Block im <head>. CSS-Variablen erlaubt. @media erlaubt."}

══════════════════════════════════════
FRONTEND-DESIGN QUALITÄTSREGELN
══════════════════════════════════════
1. Typografie hat Persönlichkeit — nutze die definierten Fonts
2. Jede Sektion muss visuell anders sein als die vorherige
3. Hero-Sektion: großzügig, einprägsam, sofort vertrauenswürdig
4. Cards mit definierten Shadows und Hover-States
5. Generöse Abstände — wirkt professioneller als enge Layouts
6. Buttons: klare primäre Aktion + sekundäre Alternative
7. Farbhierarchie: Primary dominant, Accent sparsam
8. Mobile-first: grid → flex-column auf kleinen Screens
9. Keine generischen Stock-Photo Ästhetik im Layout
10. Jeder CTA klar von Inhaltstext unterscheidbar

══════════════════════════════════════
AKTIVE SEKTIONEN
══════════════════════════════════════
${sections}

══════════════════════════════════════
BILD-PLATZHALTER
══════════════════════════════════════
Hero (Pflicht):
  <img src="PLACEHOLDER_hero" data-img-slot="hero" data-img-context="[1 Satz Englisch, konkret]" alt="PLACEHOLDER_ALT_hero" width="1200" height="675" loading="eager" fetchpriority="high">
Selbsthilfe: data-img-slot="howto" 800x450 loading="lazy"
Ablauf: data-img-slot="ablauf" 800x450 loading="lazy"
Unique Data: data-img-slot="unique" 800x450 loading="lazy"
Autor: data-img-slot="autor" 80x80 loading="lazy"

══════════════════════════════════════
SEO-REGELN (alle einhalten)
══════════════════════════════════════
1. Keyword NUR in: H1, Title, URL-Slug, erster Hero-Satz
2. Danach ausschließlich Synonyme und LSI-Begriffe
3. Reiner Intent — kein Mix
4. Interne Links zu Geschwister-Seiten (min. 3)
5. E-E-A-T: Modellnummern, Fachbegriffe, Autorbox, Erfahrung
6. Information Gain 2026 prominent in eigener Sektion
7. Mount-AI-Schutz: jede Sektion hat echten Informationsgehalt
8. Schema in JSON-LD (separater Block)
9. CWV: Inline CSS, width/height bei jedem Bild, ein Script
10. Discover-Ready: Hero 1200x675, max-image-preview:large
11. Voice Search: H2 als Fragesatz formuliert
12. NAP überall identisch
13. page-uid Kommentar im HTML gegen Duplikate

══════════════════════════════════════
SCHEMA-BLÖCKE (alle generieren)
══════════════════════════════════════
FAQPage, HowTo, LocalBusiness, BreadcrumbList

══════════════════════════════════════
AUSGABE-FORMAT (exakt einhalten)
══════════════════════════════════════

ZUERST META-BLOCK (3 Zeilen Plaintext):
Title: [max 60 Zeichen, Keyword am Anfang]
Description: [140-155 Zeichen]
Keywords: [5-8 kommasepariert]

DANN HTML-BLOCK 1 — vollständiges HTML:
\`\`\`html
<!DOCTYPE html>
<!-- page-uid: [keyword-slug]-[random-6-chars] -->
<html lang="de">
[vollständiger Head mit allen Meta-Tags]
[vollständiger Body mit allen aktiven Sektionen]
</html>
\`\`\`

DANN HTML-BLOCK 2 — nur JSON-LD Schemas:
\`\`\`html
<script type="application/ld+json">
[Schema-Blöcke]
</script>
\`\`\`

WICHTIG:
- ALLE Sektionen vollständig ausschreiben
- Kein Platzhaltertext wie "Lorem ipsum"
- HTML endet mit </html>
- Antworte SOFORT ohne Erklärungen

PFLICHT: Die letzten 2000 Tokens MÜSSEN für folgendes genutzt werden:
1. FAQ-Sektion mit allen PAA-Fragen
2. Autor-Box (Sektion 15)
3. JSON-LD Schemas (FAQPage + HowTo + LocalBusiness + BreadcrumbList)
Kürze andere Sektionen wenn nötig, aber diese 3 Punkte sind NICHT optional.`;
}
