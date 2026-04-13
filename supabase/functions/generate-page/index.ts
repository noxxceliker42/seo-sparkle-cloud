import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECTION_LABELS: Record<string, string> = {
  "01": "Hero-Sektion",
  "02": "Problem-Spiegelung",
  "03": "TOC (Inhaltsverzeichnis)",
  "04": "Symptome + Ursachen",
  "05": "Selbsthilfe (HowTo)",
  "06": "Fehlercode-Liste",
  "07": "Unique Data Sektion",
  "08": "Information Gain (NEU 2026)",
  "09": "Ablauf vor Ort",
  "10": "Preise / Risikoumkehr",
  "11": "Reparatur vs. Neukauf",
  "12": "Qualität",
  "13": "Marken",
  "14": "FAQ",
  "15": "Autor + Kontakt",
};

function buildDesignTokens(preset: string, primaryColor: string): string {
  const presets: Record<string, { heroBg: string; faqBg: string; radius: string }> = {
    trust: { heroBg: "#eff6ff", faqBg: "#f8fafc", radius: "12px" },
    professional: { heroBg: "#f9fafb", faqBg: "#f3f4f6", radius: "8px" },
    eco: { heroBg: "#f0fdf4", faqBg: "#f7fef9", radius: "16px" },
    premium: { heroBg: "#faf5ff", faqBg: "#fdf4ff", radius: "10px" },
    warm: { heroBg: "#fff7ed", faqBg: "#fffbeb", radius: "14px" },
    minimal: { heroBg: "#fafafa", faqBg: "#f5f5f5", radius: "4px" },
  };
  const p = presets[preset] || presets.trust;
  return `:root { --c-primary: ${primaryColor}; --c-hero-bg: ${p.heroBg}; --faq-bg: ${p.faqBg}; --radius-card: ${p.radius}; }`;
}

function buildMasterPrompt(f: Record<string, unknown>): string {
  const activeSections = (f.activeSections as string[]) || [];
  const sectionList = activeSections
    .map((id) => `${id} ${SECTION_LABELS[id] || id}`)
    .join(" · ");

  const designTokens = buildDesignTokens(
    (f.designPreset as string) || "trust",
    (f.primaryColor as string) || "#1d4ed8"
  );

  return `Du bist SEO-Experte. Erstelle eine vollständige SEO-Seite.

KEYWORD: "${f.keyword}"
INTENT: ${f.intent}
SEITENTYP: ${f.pageType}
SEKUNDÄR-KEYWORDS: ${f.secondaryKeywords || "keine"}
LSI-BEGRIFFE: ${f.lsiTerms || "keine"}
NEGATIVE KEYWORDS: ${f.negativeKeywords || "keine"}
PILLAR-URL: ${f.pillarUrl || "keine"}
PILLAR-TITEL: ${f.pillarTitle || "keine"}
GESCHWISTER-SEITEN: ${f.siblingPages || "keine"}
DEEP PAGES: ${f.deepPages || "keine"}
CONTENT-GAP: ${f.contentGap || "keine"}
PAA-FRAGEN: ${f.paaQuestions || "keine"}

FIRMA: ${f.firmName}
STRASSE: ${f.street || ""}
PLZ: ${f.zip || ""} STADT: ${f.city || ""}
TELEFON: ${f.phone || ""}
WEBSITE: ${f.website || ""}
SERVICEGEBIET: ${f.serviceArea || ""}
UNIQUE DATA: ${f.uniqueData || "keine"}

AUTOR: ${f.authorName || ""}
BERUFSBEZEICHNUNG: ${f.authorTitle || ""}
ERFAHRUNG: ${f.experienceYears || ""} Jahre
ZERTIFIKATE: ${f.certificates || ""}
REVIEWER: ${f.reviewer || ""}
FALLSTUDIE: ${f.caseStudy || "keine"}

KVA-PREIS: ${f.kvaPrice || "k.A."} €
PREISSPANNE: ${f.priceRange || "k.A."}
PREISKARTE 1: ${f.priceCard1 || "keine"}
PREISKARTE 2: ${f.priceCard2 || "keine"}
PREISKARTE 3: ${f.priceCard3 || "keine"}
REPARATUR VS NEUKAUF: ${f.repairVsBuy || "keine"}

TONE OF VOICE: ${f.toneOfVoice || "Sachlich-kompetent"}
BILD-STRATEGIE: ${f.imageStrategy || "Platzhalter"}
RATING: ${f.rating || "4.9"} / 5 (${f.reviewCount || "0"} Bewertungen)
BREADCRUMB: ${f.breadcrumb || "Start > Seite"}
SCHEMA-BLÖCKE: ${((f.schemaBlocks as string[]) || []).join(", ")}

INFORMATION GAIN (2026): ${f.informationGain || "keine"}
DISCOVER-READY: ${f.discoverReady || "Platzhalter"}
COMPARATIVE VALUE CHECK: ${f.comparativeCheck || "Noch ausstehend"}

AKTIVE SEKTIONEN: ${sectionList}

SEO-REGELN (alle einhalten):
1. Keyword "${f.keyword}" NUR in H1 + URL-Slug + Title + Erster Hero-Satz. Danach nur Synonyme.
2. Reiner Intent, kein Mix.
3. Interne Links zu Pillar + Geschwister.
4. AIDA+T: Problem zuerst, CTA nach Sek.9.
5. E-E-A-T: Modellnummer, Fachbegriffe, Autorbox.
6. Information Gain Sektion: "${f.informationGain || ""}" — prominente eigene Sektion.
7. Mount-AI-Schutz: Jede Sektion hat echten Informationsgehalt.
8. Schema: ${((f.schemaBlocks as string[]) || []).join("+")} in JSON-LD.
9. CWV: Inline CSS, width/height fix, ein Script.
10. Discover-Ready: Hero-Bild 1200x675, max-image-preview:large im Head.
11. Comparative Value: besser als Top-3 für "${f.keyword}".
12. Voice Search: Fragesätze in H2.
13. NAP: "${f.firmName}" + "${f.street || ""}" + "${f.city || ""}" + "${f.phone || ""}" überall identisch.
14. Duplikat-Schutz: page-uid Kommentar, variierte Micro-Texte.

DESIGN-TOKENS (Inline CSS, Pre-Set: "${f.designPreset}"):
${designTokens}

AUSGABE-FORMAT:
1. META-BLOCK (3 Zeilen Plaintext):
Title: [max 60 Zeichen]
Description: [140-155 Zeichen]
Keywords: [kommasepariert]

2. \`\`\`html
[vollständiger Body mit allen aktiven Sektionen, Inline CSS]
\`\`\`

3. \`\`\`html
[JSON-LD Schema-Blöcke: ${((f.schemaBlocks as string[]) || []).join(", ")}]
\`\`\`

Antworte SOFORT mit dem Output, keine Erklärungen vorher.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.json();

    if (!formData.keyword || typeof formData.keyword !== "string") {
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

    const masterPrompt = buildMasterPrompt(formData);

    // Call Kie.AI (OpenAI-compatible format)
    const aiResponse = await fetch("https://kieai.erweima.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [
          { role: "user", content: masterPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Kie.AI error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Kie.AI Fehler: ${aiResponse.status}`, details: errorText, masterPrompt }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData?.choices?.[0]?.message?.content || "";

    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: "Leere Antwort von Kie.AI", masterPrompt }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse output: META-BLOCK, HTML body, JSON-LD
    const lines = rawContent.split("\n");
    let metaTitle = "";
    let metaDesc = "";
    let metaKeywords = "";
    let htmlOutput = "";
    let jsonLd = "";

    // Extract meta block
    for (const line of lines) {
      const l = line.trim();
      if (l.toLowerCase().startsWith("title:")) metaTitle = l.replace(/^title:\s*/i, "").trim();
      else if (l.toLowerCase().startsWith("description:")) metaDesc = l.replace(/^description:\s*/i, "").trim();
      else if (l.toLowerCase().startsWith("keywords:")) metaKeywords = l.replace(/^keywords:\s*/i, "").trim();
    }

    // Extract HTML blocks
    const htmlBlocks: string[] = [];
    const htmlRegex = /```html\s*\n([\s\S]*?)```/g;
    let match;
    while ((match = htmlRegex.exec(rawContent)) !== null) {
      htmlBlocks.push(match[1].trim());
    }

    if (htmlBlocks.length >= 2) {
      htmlOutput = htmlBlocks[0];
      jsonLd = htmlBlocks.slice(1).join("\n\n");
    } else if (htmlBlocks.length === 1) {
      // Try to separate JSON-LD from HTML
      const block = htmlBlocks[0];
      const jsonLdIdx = block.indexOf('<script type="application/ld+json">');
      if (jsonLdIdx > -1) {
        htmlOutput = block.substring(0, jsonLdIdx).trim();
        jsonLd = block.substring(jsonLdIdx).trim();
      } else {
        htmlOutput = block;
      }
    }

    // Save to Supabase
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    let pageId: string | null = null;
    if (supabaseUrl && supabaseKey && authHeader) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: insertData } = await supabase.from("seo_pages").insert({
            user_id: user.id,
            keyword: formData.keyword,
            firm: formData.firmName || null,
            city: formData.city || null,
            intent: formData.intent || null,
            page_type: formData.pageType || null,
            html_output: htmlOutput,
            json_ld: jsonLd,
            meta_title: metaTitle,
            meta_desc: metaDesc,
            score: 0,
            status: "draft",
            design_preset: formData.designPreset || "trust",
            active_sections: formData.activeSections || [],
          }).select("id").single();

          pageId = insertData?.id || null;
        }
      } catch (dbErr) {
        console.error("DB save error (non-fatal):", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pageId,
        metaTitle,
        metaDesc,
        metaKeywords,
        htmlOutput,
        jsonLd,
        masterPrompt,
        rawContent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-page error:", err);
    return new Response(
      JSON.stringify({ error: `Interner Fehler: ${(err as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
