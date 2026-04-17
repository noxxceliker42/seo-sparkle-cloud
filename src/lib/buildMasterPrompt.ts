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

const TERM_BANK: Record<string, string> = {
  hausgeraete: `Waschmaschinen: Heizelement, NTC-Sensor, Laugenpumpe, Pressostat, Invertermotor, AquaStop, Motorkohlen, Tacho-Generator, Türverriegelung, Einlaufventil. Kühlschränke: Verdampfer, Abtauheizung, Kompressor, NeoFrost, Kondensator, Thermostat. Geschirrspüler: Umwälzpumpe, Spülarm, EverClean-Filter, Enthärter, Wasserstandssensor. Trockner: Wärmepumpe, Kondensatbehälter, Temperaturbegrenzer, Antriebsriemen.`,
  kfz: `OBD-Schnittstelle, Fehlerspeicher, CAN-Bus, Lambdasonde, DPF-Regeneration, Kolbenringe, Nockenwelle, Steuerkette, Turbolader, Einspritzventil, Bremsbelag, Bremsscheibe, ABS-Sensor, Stoßdämpfer.`,
  handwerk: `VDE-Prüfung, FI-Schutzschalter, Potenzialausgleich, DGUV Vorschrift 3, Trinkwasserverordnung, Druckminderer, Brennwertkessel, Hydraulischer Abgleich, Heizlastberechnung, BEG-Förderung.`,
  immobilien: `Bodenrichtwert, Sachwertverfahren, Ertragswertverfahren, Verkehrswert, Auflassungsvormerkung, Grundbucheintrag, Annuitätendarlehen, KfW-Förderung.`,
  gesundheit: `Anamnese, Differenzialdiagnose, Laborwerte, Physiotherapie, Ergotherapie, Arthroskopie, Bandscheibenvorfall, Gonarthrose, Rotatorenmanschette.`,
  gastronomie: `HACCP-Konzept, Critical Control Point, Allergenmanagement, TSE-Pflicht, Hygienepass, Betriebserlaubnis, Zapfanlage.`,
  "steuer-recht": `AfA, Gewerbesteuer, Vorsteuerabzug, ELSTER, GmbH-Gründung, Handelsregister, Stammkapital, Kündigungsschutzgesetz, Sozialplan.`,
  "it-tech": `CI/CD-Pipeline, Containerisierung, Microservices, API-REST, Penetrationstest, OWASP Top 10, Zero-Trust, VLAN, VPN-Tunnel.`,
  "beauty-wellness": `Hautanalyse, Hydratation, Retinol, Hyaluronsäure-Filler, Faszienmassage, Lymphdrainage, Triggerpunkttherapie, Gelnägel.`,
  bildung: `Scaffolding, Kompetenzorientierung, Systemisches Coaching, Ressourcenorientierung, Blended Learning, SCORM-Standard, LMS.`,
  ecommerce: `Conversion Rate Optimization, Warenkorbabbruch, A/B-Test, Fulfillment, Retourenquote, ROAS, Customer Lifetime Value.`,
  "bau-sanierung": `Baugenehmigung, GRZ/GFZ, Statik, Wärmeschutznachweis, Rohbau, Fassadendämmung, KfW-Effizienzhaus, Blower-Door-Test.`,
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
  const branche = data.branche || "hausgeraete";
  const sprache = data.sprache || "de";
  const sections = Array.isArray(data.activeSections)
    ? data.activeSections.join(" · ")
    : "01 Hero · 02 Problem · 04 Symptome · 05 Selbsthilfe · 07 Unique Data · 08 Info Gain · 09 Ablauf · 10 Preise · 14 FAQ · 15 Autor";

  const SEARCH_INTENT_ERKLAERUNG: Record<string, string> = {
    informational: "Nutzer sucht Wissen und Orientierung — keine direkte Kaufabsicht. Seite muss umfassend informieren und intern zu kommerziellen Seiten führen.",
    commercial: "Nutzer vergleicht Anbieter — bereit zur Kontaktaufnahme. Seite muss differenzieren, USPs betonen, Vertrauen aufbauen.",
    transactional: "Nutzer ist kaufbereit — will jetzt Termin oder Angebot. Seite muss maximale Conversion-Elemente haben.",
  };

  const intent = (data.intent || "Informational").toLowerCase();

  // ── Conditional blocks (Schritt 4: Felder aus erweitertem Modal) ──

  // Tonalität
  const toneRaw = String(data.toneOfVoice || "").toLowerCase().trim();
  const toneBlock = toneRaw && toneRaw !== "sachlich" && toneRaw !== "sachlich-kompetent"
    ? `
══════════════════════════════════════
TONALITÄT
══════════════════════════════════════
${
  toneRaw === "freundlich" ? "Freundlich-nahbar. Du-Ansprache möglich. Warm und persönlich." :
  toneRaw === "premium" ? "Premium-exklusiv. Gehoben, distanziert, kein Umgangssprachlich." :
  toneRaw === "technisch" ? "Technisch-präzise. Fachbegriffe erwünscht. Zahlen und Fakten." :
  toneRaw === "emotional" ? "Emotional-empathisch. Schmerzpunkte ansprechen. Verständnisvoll." :
  "Sachlich-kompetent."
}
`
    : "";

  // Schema-Markup
  const schemaArr: string[] = Array.isArray(data.schemaBlocks) ? data.schemaBlocks : [];
  const schemaBlock = schemaArr.length > 0
    ? `
══════════════════════════════════════
SCHEMA-MARKUP AKTIVIERT
══════════════════════════════════════
Folgende Schema-Typen MÜSSEN als JSON-LD implementiert werden:
${schemaArr.join(", ")}

Pflicht-Regeln:
- FAQPage: alle FAQ-Fragen als Question/Answer Items
- LocalBusiness: NAP-Daten vollständig (name, address, telephone, openingHours, geo)
- HowTo: Schritt-für-Schritt mit name, text, image pro Step
- BreadcrumbList: immer mit position + name + item
- Service: Dienstleistungs-Details (serviceType, areaServed, provider)
- WebPage: name, description, breadcrumb, mainEntity
`
    : "";

  // Preiskarten — unterstützt sowohl priceCards-Array als auch priceCard1/2/3
  const cards: Array<{ label: string; price: string }> = (() => {
    if (Array.isArray(data.priceCards) && data.priceCards.length) {
      return data.priceCards
        .map((c: any) => ({ label: String(c?.label || "").trim(), price: String(c?.price || "").trim() }))
        .filter((c: any) => c.label && c.price);
    }
    return [data.priceCard1, data.priceCard2, data.priceCard3]
      .map((s, i) => {
        if (!s) return null;
        const str = String(s).trim();
        if (!str) return null;
        // "Label — 79€" oder "Label: 79€" → splitten
        const m = str.match(/^(.+?)\s*[—:\-–]\s*(.+)$/);
        return m ? { label: m[1].trim(), price: m[2].trim() } : { label: `Karte ${i + 1}`, price: str };
      })
      .filter(Boolean) as Array<{ label: string; price: string }>;
  })();

  const priceCardsBlock = cards.length > 0
    ? `
══════════════════════════════════════
PREISKARTEN (als visuelles Grid darstellen)
══════════════════════════════════════
${cards.map((c, i) => `- Karte ${i + 1}: ${c.label} — ${c.price}`).join("\n")}

Format pro Karte: Name (H3) + Preis prominent + 3 enthaltene Leistungen als Bullet-Liste.
Layout: 3-Spalten-Grid auf Desktop, 1-Spalte auf Mobile. Mittlere Karte als "Empfohlen" hervorheben.
`
    : "";

  // Repair vs Buy
  const repairVsBuyBlock = data.repairVsBuy === true
    ? `
══════════════════════════════════════
REPARIEREN vs. KAUFEN VERGLEICH (Pflicht-Sektion)
══════════════════════════════════════
Zeige konkret wann sich Reparatur lohnt vs. Neukauf.
Faustregel: Reparatur lohnt wenn Reparaturkosten < 50% des Neupreises.
Mit echten Zahlen für die Gerätekategorie aus dem Keyword "${data.keyword || ""}".
Layout: 2-Spalten-Vergleichsbox mit "Reparieren wenn …" vs. "Neu kaufen wenn …".
`
    : "";

  // E-E-A-T Erweiterung
  const reviewer = String(data.reviewer || "").trim();
  const caseStudy = String(data.caseStudy || "").trim();
  const eeatExtBlock = (reviewer || caseStudy)
    ? `
══════════════════════════════════════
E-E-A-T ERWEITERUNG
══════════════════════════════════════
${reviewer ? `FACHLICHE PRÜFUNG:
Dieser Artikel wurde fachlich geprüft von: ${reviewer}
→ Als sichtbares Trust-Signal in Autor-Box oder eigener Zeile einbauen ("Fachlich geprüft von …").
` : ""}${caseStudy ? `FALLBEISPIEL / REFERENZ (als echte Case Study einbauen):
${caseStudy}
→ Als konkretes Beispiel mit Ortsteil + Gerät/Modell + Ergebnis in passendem Abschnitt einbauen.
` : ""}`
    : "";

  // Bild-Strategie
  const imageStrategy = String(data.imageStrategy || "nanobanana").toLowerCase();
  const imageStrategyBlock = imageStrategy === "nanobanana"
    ? `
══════════════════════════════════════
BILD-STRATEGIE: NANOBANANA-PLATZHALTER (PFLICHT)
══════════════════════════════════════
Für JEDE Sektion die ein Bild benötigt MUSS exakt dieser Platzhalter verwendet werden:

Hero Section (PFLICHT auf jeder Seite):
<img
  src="NANOBANANA_PLACEHOLDER"
  data-nb-slot="hero"
  data-nb-prompt="${data.keyword || ""} ${data.pageType || ""}, professionell, premium Qualität, ${branche}, ${data.city || "Berlin"}, Techniker bei der Arbeit"
  data-nb-width="1200"
  data-nb-height="675"
  data-nb-ratio="16:9"
  alt="${data.keyword || ""}"
  class="nb-image-slot"
  loading="eager"
>

Für H2-Sektionen (nur wenn Bild Mehrwert bringt):
<img
  src="NANOBANANA_PLACEHOLDER"
  data-nb-slot="section-[sektionsname]"
  data-nb-prompt="[spezifischer Kontext dieser Sektion], professionell, ${branche}"
  data-nb-width="800"
  data-nb-height="450"
  data-nb-ratio="16:9"
  alt="[Sektions-Beschreibung]"
  class="nb-image-slot"
  loading="lazy"
>

VERBOTEN:
- src mit echten URLs oder Pfaden
- <img> ohne data-nb-slot
- <div class="img-placeholder"> statt <img>
- Andere Platzhalter-Formate
`
    : imageStrategy === "placeholder"
    ? `
══════════════════════════════════════
BILD-STRATEGIE: EINFACHE PLATZHALTER
══════════════════════════════════════
Bilder nur als einfache Platzhalter-Divs darstellen (z.B. <div class="img-placeholder" aria-label="…">).
Kein NANOBANANA_PLACEHOLDER verwenden. Kein <img>-Tag mit data-nb-slot.
`
    : `
══════════════════════════════════════
BILD-STRATEGIE: KEINE BILDER
══════════════════════════════════════
Keine <img>-Tags und keine Bild-Platzhalter im Output. Reine Textseite.
Bild-Slots in den Sektionen werden komplett weggelassen.
`;

  // 2026 Features
  const discoverReady = data.discoverReady === true;
  const comparativeCheck = data.comparativeCheck === true;
  const infoGainFlag = data.informationGainFlag === true;

  const features2026Block = (discoverReady || comparativeCheck || infoGainFlag)
    ? `
══════════════════════════════════════
2026 FEATURES
══════════════════════════════════════
${discoverReady ? `GOOGLE DISCOVER OPTIMIERUNG:
- Titel zwischen 50-90 Zeichen (emotional, neugierig)
- Hero-Bild mindestens 1200px breit (16:9)
- Ersten Absatz als eigenständige Zusammenfassung
- Keine Click-Bait, aber starke Emotion im H1
- max-image-preview:large im Robots-Meta
` : ""}${comparativeCheck ? `WETTBEWERBS-VERGLEICH EINBAUEN:
- Mindestens 1 Sektion die uns von Wettbewerbern abhebt
- Konkrete Zahlen/Fakten statt Floskeln
- "Warum wir" Sektion mit messbaren Vorteilen (z.B. Reaktionszeit, Garantie, Preis)
` : ""}${(infoGainFlag || discoverReady) ? `AI OVERVIEW OPTIMIERUNG:
- Jeden Hauptpunkt in 2 prägnanten Sätzen zusammenfassen
- Direkte Antworten auf Fragen ohne Umschweife
- Strukturierte Listen wo möglich
- Erste 150 Wörter als vollständige Zusammenfassung der ganzen Seite
` : ""}`
    : "";


  return `Du bist gleichzeitig:
- Senior SEO-Stratege (Topical Authority, Content Cluster, Topic Universe, Search Intent Präzision)
- Conversion-Copywriter (AIDA-Struktur, lokale USPs, Vertrauensaufbau, CTA-Hierarchie)
- Branchenexperte (${branche} — Fachbegriffe aus Term-Bank, echte Terminologie, keine Floskeln)
- HTML-Architekt (${outputMode}-Modus, CMS-optimiert, performance-orientiert)
- EEAT-Optimierer (Autorbox, Fachprüfung, Erfahrungsbelege, Aktualisierungsdaten)

KERNPRINZIP: Schreibe niemals generisch. Jede Seite ist konkret, fachlich präzise, konversionsorientiert und visuell hochwertig. KI-Floskeln sind absolut verboten.
${toneBlock}
══════════════════════════════════════
SEITEN-KONTEXT
══════════════════════════════════════
KEYWORD: "${data.keyword || "Keyword"}"
SEITENTYP: ${data.pageType || "pillar_page"}
PILLAR-TIER: ${data.pillarTier || "1"}
INTENT: ${data.intent || "Informational"}
INTENT-ERKLÄRUNG: ${SEARCH_INTENT_ERKLAERUNG[intent] || ""}
OUTPUT-MODE: ${outputMode}
BRANCHE: ${branche}
SPRACHE: ${sprache}
USP-FOKUS: ${data.uspFokus || ""}
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
E-MAIL: ${data.email || "nicht angegeben"}
WEBSITE: ${data.website || ""}
ÖFFNUNGSZEITEN: ${data.oeffnungszeiten || "nicht angegeben"}
SERVICEGEBIET: ${data.serviceArea || "Berlin und Umland"}
${schemaBlock}
══════════════════════════════════════
AUTOR & E-E-A-T
══════════════════════════════════════
AUTOR: ${data.authorName || data.author || ""}
BERUFSBEZEICHNUNG: ${data.authorTitle || data.role || ""}
ERFAHRUNG: ${data.experienceYears || data.experience || ""} Jahre
ZERTIFIKATE: ${data.certificates || ""}
${eeatExtBlock}
══════════════════════════════════════
CONTENT-STRATEGIE
══════════════════════════════════════
UNIQUE DATA: ${data.uniqueData || "keine"}
INFORMATION GAIN (2026): ${data.informationGain || data.infoGain || "keine"}
RATING: ${data.rating || "4.9"} / 5 (${data.reviewCount || "0"} Bewertungen)
TONE OF VOICE: ${data.toneOfVoice || "Sachlich-kompetent"}

══════════════════════════════════════
BRANCHEN-FACHBEGRIFFE (TERM-BANK)
══════════════════════════════════════
${TERM_BANK[branche] || "keine branchenspezifischen Begriffe"}
${sprache !== "de" ? `
══════════════════════════════════════
SPRACHHINWEIS
══════════════════════════════════════
WICHTIG: Gesamte Seite auf ${sprache === "en" ? "Englisch" : "Türkisch"} generieren.
NAP-Daten bleiben auf Deutsch. Schema-Markup in Originalsprache.
` : ""}
══════════════════════════════════════
PREISE
══════════════════════════════════════
KVA-PREIS: ${data.kvaPrice || "k.A."} €
PREISSPANNE: ${data.priceRange || "k.A."}
${priceCardsBlock}${repairVsBuyBlock}
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
SPRACHLICHE QUALITÄTSREGELN (PFLICHT)
══════════════════════════════════════
- Gemischte Satzlänge: kurze und lange Sätze wechselnd (nie 5 gleich lange)
- Direkte Ansprache: "Sie" (formell), kein "du", kein "wir" als Floskeln
- Konkrete Zahlen statt vage Aussagen: "in 2-3 Stunden" statt "schnell", "ab 89 Euro" statt "günstig"
- Verbotene Floskeln: erstklassig, kompetent, top, optimal, professionell (ohne Beleg), günstig (ohne Zahl), schnell (ohne Zeitangabe)
- Max. 3x dasselbe Keyword pro Seite — danach nur Synonyme und LSI-Begriffe
- Keine Werksbindung ohne Nachweis: kein "autorisierter Fachbetrieb"
- Testimonials nur mit konkretem Ortsteil + Gerät/Modell + echtem Detail
${imageStrategyBlock}${features2026Block}
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
