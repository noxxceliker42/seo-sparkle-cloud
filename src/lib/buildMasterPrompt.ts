/**
 * Client-side replica of the edge function's buildPrompt()
 * Used for the Prompt Review Screen before generation.
 */

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

function truncateList(value: unknown, max: number): string {
  if (!value || typeof value !== "string") return "keine";
  const items = value.split(/[,·|]/).map(s => s.trim()).filter(Boolean);
  if (items.length <= max) return value as string;
  return items.slice(0, max).join(", ") + ` … (${items.length - max} weitere)`;
}

export function buildMasterPrompt(data: Record<string, any>): string {
  const ds = DESIGN_SYSTEMS[data.designPreset || "trust"] || DESIGN_SYSTEMS.trust;
  const outputMode = data.outputMode || "standalone";
  const isContao = outputMode === "tinymce";
  const sections = Array.isArray(data.activeSections)
    ? data.activeSections.join(" · ")
    : "01 Hero · 02 Problem · 04 Symptome · 05 Selbsthilfe · 07 Unique Data · 08 Info Gain · 09 Ablauf · 10 Preise · 14 FAQ · 15 Autor";

  return `Du bist SEO- und Frontend-Experte.
Erstelle eine vollständige, professionelle SEO-Seite.

══════════════════════════════════════
SEITEN-KONTEXT
══════════════════════════════════════
KEYWORD: "${data.keyword || "Keyword"}"
SEITENTYP: ${data.pageType || "pillar_page"}
PILLAR-TIER: ${data.pillarTier || "1"}
INTENT: ${data.intent || "Informational"}
OUTPUT-MODE: ${outputMode}
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
${outputMode === "tinymce" ? `
TINYMCE-SAFE PFLICHTREGELN:
- Kein @media erlaubt
- UTF-8 direkt (keine Entities nötig)
- Emojis als Design-Elemente erlaubt (sparsam)
- Inline <script> am Ende erlaubt
` : ""}

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
