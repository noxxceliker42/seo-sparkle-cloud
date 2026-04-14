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

  return content.trim();
}

function parseKieAiResponse(rawContent: string): {
  htmlOutput: string;
  jsonLdOutput: string;
  metaTitle: string;
  metaDesc: string;
  metaKeywords: string;
} {
  console.log('=== PARSING START ===');
  console.log('Raw content length:', rawContent.length);
  console.log('Raw content preview (first 500):', rawContent.substring(0, 500));

  // META-BLOCK extraction (lines before first ```)
  const metaMatch = rawContent.match(/^([\s\S]*?)```/);
  const metaBlock = metaMatch?.[1]?.trim() || '';
  console.log('META-BLOCK:', metaBlock);

  // Title extraction
  const titleMatch = metaBlock.match(/(?:SEO-Titel|Title|Titel):\s*(.+)/i);
  const metaTitle = titleMatch?.[1]?.trim() || '';

  // Description extraction
  const descMatch = metaBlock.match(/(?:Meta-Desc|Description|Beschreibung):\s*(.+)/i);
  const metaDesc = descMatch?.[1]?.trim() || '';

  // Keywords extraction
  const kwMatch = metaBlock.match(/(?:Keywords|Meta-Keywords):\s*(.+)/i);
  const metaKeywords = kwMatch?.[1]?.trim() || '';

  // HTML blocks extraction (all ```html ... ``` or ``` ... ```)
  const htmlBlocks = [...rawContent.matchAll(/```(?:html)?\s*\n?([\s\S]*?)```/gi)]
    .map(m => m[1].trim())
    .filter(b => b.length > 0);

  console.log('Found HTML blocks:', htmlBlocks.length);
  htmlBlocks.forEach((b, i) => console.log(`Block ${i} length: ${b.length}, preview: ${b.substring(0, 100)}`));

  let htmlOutput = '';
  let jsonLdOutput = '';

  if (htmlBlocks.length >= 2) {
    htmlOutput = htmlBlocks[0];
    jsonLdOutput = htmlBlocks[1];
  } else if (htmlBlocks.length === 1) {
    const block = htmlBlocks[0];
    // Check if JSON-LD is embedded in the single block
    const jsonLdMatch = block.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      // Extract JSON-LD separately
      jsonLdOutput = jsonLdMatch[0];
      htmlOutput = block;
    } else {
      htmlOutput = block;
    }
  } else {
    // No code blocks found — try to use the entire content as HTML (minus meta block)
    console.warn('No code blocks found in Kie.AI response');
    const afterMeta = rawContent.replace(metaBlock, '').trim();
    if (afterMeta.includes('<')) {
      htmlOutput = afterMeta;
    }
  }

  console.log('Parsed metaTitle:', metaTitle);
  console.log('Parsed metaDesc length:', metaDesc.length);
  console.log('Parsed htmlOutput length:', htmlOutput.length);
  console.log('Parsed jsonLdOutput length:', jsonLdOutput.length);
  console.log('=== PARSING END ===');

  return { htmlOutput, jsonLdOutput, metaTitle, metaDesc, metaKeywords };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.json();
    console.log('=== GENERATE-PAGE START ===');
    console.log('Empfangene Daten:', JSON.stringify({
      keyword: formData?.keyword,
      firm: formData?.firmName,
      hasActiveSections: !!(formData?.activeSections?.length),
      activeSectionsCount: formData?.activeSections?.length,
    }));

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

    // Call Kie.AI (Anthropic-Format)
    console.log('Calling Kie.AI...');
    const aiResponse = await fetch("https://api.kie.ai/claude/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        messages: [{ role: "user", content: masterPrompt }],
        max_tokens: 16000,
        stream: false,
      }),
    });

    console.log('Kie.AI Response Status:', aiResponse.status);

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
      if (aiResponse.status === 400) {
        return new Response(
          JSON.stringify({ error: `Kie.AI: Ungültige Anfrage (400) — ${errBody}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Kie.AI HTTP ${aiResponse.status}: ${errBody}`, masterPrompt }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let rawContent: string;
    try {
      rawContent = extractKieContent(aiData);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message, masterPrompt }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Kie.AI content length:', rawContent.length);
    console.log('Kie.AI content preview:', rawContent.substring(0, 300));

    // Parse output using robust parser
    const { htmlOutput, jsonLdOutput, metaTitle, metaDesc, metaKeywords } = parseKieAiResponse(rawContent);

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
          const { data: insertData, error: saveError } = await supabase.from("seo_pages").insert({
            user_id: user.id,
            keyword: formData.keyword,
            firm: formData.firmName || null,
            city: formData.city || null,
            intent: formData.intent || null,
            page_type: formData.pageType || null,
            html_output: htmlOutput,
            json_ld: jsonLdOutput,
            meta_title: metaTitle,
            meta_desc: metaDesc,
            score: 0,
            status: "draft",
            design_preset: formData.designPreset || "trust",
            active_sections: formData.activeSections || [],
          }).select("id").single();

          if (saveError) {
            console.error("DB save error (non-fatal):", saveError);
          }
          pageId = insertData?.id || null;

          // If cluster context: link seo_page to cluster_page
          if (formData.clusterPageId && pageId) {
            const { error: clusterErr } = await supabase.from("cluster_pages").update({
              seo_page_id: pageId,
              status: "generated",
              updated_at: new Date().toISOString(),
            }).eq("id", formData.clusterPageId);
            if (clusterErr) console.error("Cluster page link error (non-fatal):", clusterErr);
          }
        }
      } catch (dbErr) {
        console.error("DB save error (non-fatal):", dbErr);
      }
    }

    const responsePayload = {
      success: true,
      pageId,
      metaTitle,
      metaDesc,
      metaKeywords,
      htmlOutput,
      jsonLd: jsonLdOutput,
      masterPrompt,
    };

    console.log('=== GENERATE-PAGE END ===');
    console.log('Response: success=true, htmlLength=', htmlOutput.length, ', jsonLdLength=', jsonLdOutput.length, ', metaTitle=', metaTitle);

    return new Response(
      JSON.stringify(responsePayload),
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
