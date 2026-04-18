const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const FIELD_PROMPTS: Record<string, (ctx: string) => string> = {
  uniqueData: (ctx) => `${ctx}

Erstelle NUR den Wert für "uniqueData":
Konkrete einzigartige Daten/Fakten die NUR diese Firma bieten kann. 
Echte Zahlen, echte Details. Keine generischen Phrasen.
SCHLECHT: "Eigene Daten und Erfahrungen"
GUT: "Über 500 Beko-Geräte repariert in Berlin, durchschnittliche Reparaturzeit 2,3 Stunden, 92% beim ersten Besuch erfolgreich"
Antwort als JSON: {"uniqueData": "..."}`,

  informationGain: (ctx) => `${ctx}

Erstelle NUR den Wert für "informationGain":
Konkreter Mehrwert dieser spezifischen Seite gegenüber Wettbewerbern.
Was erfährt der Nutzer hier was er woanders nicht findet?
SCHLECHT: "Neue Perspektive auf das Thema"
GUT: "Vollständige Fehlercode-Liste für alle Beko Waschmaschinen ab 2015 mit Lösungsweg den kein Wettbewerber so detailliert anbietet"
Antwort als JSON: {"informationGain": "..."}`,

  uspFokus: (ctx) => `${ctx}

Erstelle NUR den Wert für "uspFokus":
Den stärksten 1 USP für dieses Keyword. Konkret, max 10 Wörter.
Antwort als JSON: {"uspFokus": "..."}`,

  themeContext: (ctx) => `${ctx}

Erstelle NUR den Wert für "themeContext":
Spezifische technische Details, Modellnummern, Fehlercodes, Symptome die typischerweise zu diesem Keyword gehören.
Was suchen Nutzer konkret? 2-3 Zeilen, kommasepariert.
Antwort als JSON: {"themeContext": "..."}`,

  differentiation: (ctx) => `${ctx}

Erstelle NUR den Wert für "differentiation":
3 konkrete Wettbewerbsvorteile die ein lokaler Reparaturservice für dieses Keyword haben sollte. 
Realistisch und umsetzbar. 3 Stichpunkte, je 1 Zeile.
Antwort als JSON: {"differentiation": "..."}`,

  paaQuestions: (ctx) => `${ctx}

Erstelle NUR den Wert für "paaQuestions":
5 typische Google "People Also Ask"-Fragen für dieses Keyword.
Realistische Nutzerfragen, die echt bei Google auftauchen. Eine Frage pro Zeile.
Antwort als JSON: {"paaQuestions": "Frage 1?\\nFrage 2?\\nFrage 3?\\nFrage 4?\\nFrage 5?"}`,

  secondaryKeywords: (ctx) => `${ctx}

Erstelle NUR den Wert für "secondaryKeywords":
8 Sekundär-Keywords (Keyword-Varianten + Long-Tail) für dieses Hauptkeyword.
Kommasepariert in einer Zeile. Realistische Suchanfragen.
Antwort als JSON: {"secondaryKeywords": "kw1, kw2, kw3, ..."}`,

  lsiTerms: (ctx) => `${ctx}

Erstelle NUR den Wert für "lsiTerms":
10 LSI-Begriffe (Latent Semantic Indexing) aus der Branche, die thematisch verwandt sind.
Fachbegriffe, Bauteile, Symptome, Konzepte. Kommasepariert in einer Zeile.
Antwort als JSON: {"lsiTerms": "begriff1, begriff2, ..."}`,

  contentGap: (ctx) => `${ctx}

Erstelle NUR den Wert für "contentGap":
Was haben Top-3 Wettbewerber für dieses Keyword NICHT, was diese Seite bieten könnte?
Konkrete Lücken in Tiefe, Aktualität, Format oder Datenqualität. 1-2 Sätze.
Antwort als JSON: {"contentGap": "..."}`,

  mainHeadline: (ctx) => `${ctx}

Erstelle 3 starke H1-Headline-Varianten für eine Landingpage zu diesem Keyword.
Jede Variante max 12 Wörter. Konkret, mit Versprechen + Zielgruppe + USP.
- Variante 1: Versprechen + Zielgruppe
- Variante 2: Problem + Lösung
- Variante 3: Ergebnis + USP
Antwort als JSON: {"headlines": ["Headline 1", "Headline 2", "Headline 3"]}`,

  painPoints: (ctx) => `${ctx}

Erstelle 6 konkrete Schmerzpunkte (Pain Points) der Zielgruppe für dieses Keyword.
Realistisch, emotional, spezifisch — keine generischen Floskeln.
Jeder Schmerzpunkt 1-2 Sätze. Konkrete Situationen die der Nutzer kennt.
Antwort als JSON: {"painPoints": ["Pain 1", "Pain 2", "Pain 3", "Pain 4", "Pain 5", "Pain 6"]}`,

  personas: (ctx) => `${ctx}

Erstelle 3 unterschiedliche Käufer-Personas für eine Landingpage zu diesem Keyword.
Jede Persona: passendes Emoji, knackiger Titel (3-5 Wörter), Beschreibung (1-2 Sätze).
Decke verschiedene Motivationen ab (z.B. Notfall, Preisbewusst, Qualitätsbewusst).
Antwort als JSON: {"personas": [
  {"emoji": "🔧", "title": "...", "description": "..."},
  {"emoji": "⏰", "title": "...", "description": "..."},
  {"emoji": "💰", "title": "...", "description": "..."}
]}`,

  urgencyBar: (ctx) => `${ctx}

Erstelle einen dringlichen Urgency-Bar Text (max 80 Zeichen) für dieses Keyword.
Erzeugt echte Dringlichkeit, kein Marketing-Geschwafel.
Antwort als JSON: {"urgencyBar": "..."}`,

  trustBadges: (ctx) => `${ctx}

Erstelle 4 Trust-Badges (kommasepariert) für die Firma.
Beispiel: "15 Jahre Erfahrung, 500+ Kunden, 4.9 Sterne Google, 6 Monate Garantie".
Antwort als JSON: {"trustBadges": "..."}`,

  testimonials: (ctx) => `${ctx}

Erstelle 2 realistische lokale Kundenstimmen für dieses Keyword.
Format: "Name (Stadtteil): Text". Eine Stimme pro Zeile.
Antwort als JSON: {"testimonials": "..."}`,

  objections: (ctx) => `${ctx}

Erstelle 3 typische Einwände mit kurzen Lösungen für dieses Keyword.
Format: "Einwand — Lösung". Einer pro Zeile.
Antwort als JSON: {"objections": "..."}`,

  howItWorks: (ctx) => `${ctx}

Erstelle 3 klare Prozessschritte für diesen Service.
Format: "1. Schritt → 2. Schritt → 3. Schritt"
Antwort als JSON: {"howItWorks": "..."}`,

  guarantee: (ctx) => `${ctx}

Erstelle einen starken, glaubwürdigen Garantie-Text (2 Sätze) für diesen Service.
Antwort als JSON: {"guarantee": "..."}`,

  valueStack: (ctx) => `${ctx}

Erstelle einen Value Stack: Leistungen mit Einzelwerten in € + Gesamtwert.
Beispiel: "Diagnose (49€) + Reparatur + 6 Monate Garantie (99€) = Gesamtwert 247€"
Antwort als JSON: {"valueStack": "..."}`,

  authority: (ctx) => `${ctx}

Erstelle einen Authority-Text (Medien, Auszeichnungen, Partner) für diesen lokalen Service.
1 Zeile, konkret und glaubwürdig.
Antwort als JSON: {"authority": "..."}`,

  caseStudy: (ctx) => `${ctx}

Erstelle ein kurzes konkretes Fallbeispiel: Problem → Lösung → Ergebnis in 2 Sätzen.
Mit Zahlen, Zeiten, Ersparnis.
Antwort als JSON: {"caseStudy": "..."}`,

  comparisonTable: (ctx) => `${ctx}

Erstelle 4 Vergleichskriterien (kommasepariert) für diese Branche vs. Wettbewerb.
Beispiel: "Preis, Reaktionszeit, Garantie, Originalteile"
Antwort als JSON: {"comparisonTable": "..."}`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword, pageType, firm, branche, designPhilosophy, targetAudience, field } = await req.json();

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

    const contextBlock = `Keyword: "${keyword}"
Seitentyp: ${pageType || "service"}
Firma: ${firm || "unbekannt"}
Branche: ${branche || "allgemein"}
Designphilosophie: ${designPhilosophy || "trust_classic"}
Zielgruppe: ${targetAudience || "privatkunden"}`;

    let userPrompt: string;

    if (field && FIELD_PROMPTS[field]) {
      // Single field mode
      userPrompt = FIELD_PROMPTS[field](contextBlock);
    } else {
      // Full mode — all 5 fields
      userPrompt = `${contextBlock}

Erstelle konkrete, spezifische Vorschläge für eine SEO-Seite:
{
  "uniqueData": "Konkrete einzigartige Daten/Fakten die NUR diese Firma bieten kann. Echte Zahlen, echte Details. SCHLECHT: 'Eigene Daten und Erfahrungen'. GUT: 'Über 500 Beko-Geräte repariert in Berlin, durchschnittliche Reparaturzeit 2,3 Stunden, 92% beim ersten Besuch erfolgreich' (1-2 Sätze, max 150 Zeichen)",
  
  "informationGain": "Konkreter Mehrwert dieser spezifischen Seite gegenüber Wettbewerbern. SCHLECHT: 'Neue Perspektive auf das Thema'. GUT: 'Vollständige Fehlercode-Liste für alle Beko Waschmaschinen ab 2015 mit Lösungsweg den kein Wettbewerber so detailliert anbietet' (1-2 Sätze, max 150 Zeichen)",
  
  "uspFokus": "Den stärksten 1 USP für dieses Keyword. Konkret, max 10 Wörter.",
  
  "themeContext": "Spezifische technische Details, Modellnummern, Fehlercodes, Symptome die typischerweise zu diesem Keyword gehören. Was suchen Nutzer konkret? (2-3 Zeilen, kommasepariert)",
  
  "differentiation": "3 konkrete Wettbewerbsvorteile die ein lokaler Reparaturservice für dieses Keyword haben sollte. Realistisch und umsetzbar. (3 Stichpunkte)"
}`;
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
        max_tokens: field === "painPoints" || field === "personas" ? 800 : field ? 400 : 700,
        system: "Antworte NUR als JSON. Kein Text davor oder danach. Kein Markdown.",
        messages: [{ role: "user", content: userPrompt }],
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

    const cleaned = raw.replace(/```json\s?|```/g, "").trim();
    let suggestions: Record<string, string>;
    try {
      suggestions = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
      suggestions = {};
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
