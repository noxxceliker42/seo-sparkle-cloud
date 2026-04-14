import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Image as ImageIcon, Loader2, ArrowRight, BarChart3 } from "lucide-react";
import { LsiChips } from "@/components/seo/LsiChips";
import { SerpPreview } from "@/components/seo/SerpPreview";
import { PaaList } from "@/components/seo/PaaList";
import { ClusterPreview } from "@/components/seo/ClusterPreview";
import { LoadingIndicator, type LoadState } from "@/components/seo/LoadingIndicator";
import { ModeToggle } from "@/components/seo/ModeToggle";
import { FirmSelector } from "@/components/seo/FirmSelector";
import { SeoForm, type SeoFormData } from "@/components/seo/SeoForm";
import { OutputPanel, type GeneratedPage } from "@/components/seo/OutputPanel";
import { QaGate } from "@/components/seo/QaGate";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SEO-OS v3.1 – SEO Analyse & Optimierung" },
      { name: "description", content: "SEO-OS: Dein Betriebssystem für SEO-Analyse, SERP-Daten und automatische Seitengenerierung." },
    ],
  }),
});

interface AnalysisResult {
  intent?: string;
  intent_detail?: string;
  page_type?: string;
  page_type_why?: string;
  paa?: Array<{ question: string; intent: string }>;
  lsi?: string[];
  secondary_keywords?: string[];
  content_gaps?: string[];
  cluster?: { informational?: string[]; commercial?: string[]; transactional?: string[]; deep_pages?: string[] };
  schema_recommendation?: string[];
  information_gain_suggestions?: string[];
  discover_angle?: string;
}

interface SerpResult {
  paa_verified: Array<{ question: string; url: string; snippet: string }>;
  top_urls: Array<{ url: string; title: string; description: string; position: number }>;
  related: string[];
}

interface VolumeResult {
  [keyword: string]: { volume: number; difficulty: number; cpc: number };
}

interface Firm {
  id: string;
  name: string;
  city: string | null;
  street: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_area: string | null;
}

function Index() {
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<"results" | "image" | "json">("results");
  const [mode, setMode] = useState<"standard" | "kieai">("standard");
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);

  // Loading states
  const [aiState, setAiState] = useState<LoadState>("idle");
  const [serpState, setSerpState] = useState<LoadState>("idle");
  const [volState, setVolState] = useState<LoadState>("idle");
  const [aiError, setAiError] = useState("");
  const [serpError, setSerpError] = useState("");
  const [volError, setVolError] = useState("");

  // Results
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [serp, setSerp] = useState<SerpResult | null>(null);
  const [volume, setVolume] = useState<VolumeResult | null>(null);
  const [rawJson, setRawJson] = useState("");

  // LSI selection
  const [selectedLsi, setSelectedLsi] = useState<Set<string>>(new Set());
  const [rejectedLsi, setRejectedLsi] = useState<Set<string>>(new Set());

  // PAA selection
  const [selectedPaa, setSelectedPaa] = useState<Set<string>>(new Set());

  // Image generation
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResult, setImageResult] = useState<{ urls?: string[]; state?: string; error?: string } | null>(null);

  // DataForSEO separate verification
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Form view
  const [showForm, setShowForm] = useState(false);

  // Output panel
  const [showOutput, setShowOutput] = useState(false);
  const [showQaGate, setShowQaGate] = useState(false);
  const [qaFormData, setQaFormData] = useState<SeoFormData | null>(null);
  const [generatedPage, setGeneratedPage] = useState<GeneratedPage | null>(null);
  const [htmlWarning, setHtmlWarning] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const isLoading = aiState === "loading" || serpState === "loading" || volState === "loading";

  // Job persistence hook
  const {
    activeJobId,
    isPolling,
    resumedResult,
    resumedKeyword,
    createJob,
    completeJob,
    failJob,
    startPolling,
    clearJob,
    clearResumedResult,
  } = useAnalysisJob();

  // Apply results from a completed job (used by both resume and polling)
  const applyJobResult = useCallback((result: Record<string, unknown>, kw: string) => {
    const r = result as { analysis?: AnalysisResult; serp?: SerpResult; volume?: VolumeResult; rawJson?: string };
    if (r.analysis) {
      setAnalysis(r.analysis);
      setSelectedLsi(new Set(r.analysis.lsi || []));
      setAiState("done");
    }
    if (r.serp) {
      setSerp(r.serp);
      setSerpState("done");
    }
    if (r.volume) {
      setVolume(r.volume);
      setVolState("done");
    }
    if (r.rawJson) setRawJson(r.rawJson as string);
    setKeyword(kw);
  }, []);

  // Resume from saved job — either completed result or running job that needs polling
  useEffect(() => {
    if (resumedResult && resumedKeyword) {
      applyJobResult(resumedResult as Record<string, unknown>, resumedKeyword);
      clearResumedResult();
    }
  }, [resumedResult, resumedKeyword, clearResumedResult, applyJobResult]);


  const runStandardAnalysis = useCallback((kw: string): AnalysisResult => {
    // Local JS-based quick analysis (no API needed)
    const lower = kw.toLowerCase();
    const hasCity = /berlin|münchen|hamburg|köln|frankfurt|stuttgart/.test(lower);
    const hasCommercial = /kaufen|preis|kosten|vergleich|test|erfahrung/.test(lower);
    const hasTx = /reparatur|service|notdienst|bestellen/.test(lower);

    let intent = "Informational";
    if (hasTx || hasCity) intent = hasCity ? "Local" : "Transactional";
    else if (hasCommercial) intent = "Commercial";

    return {
      intent,
      intent_detail: `Automatisch erkannt (Standard-Modus)`,
      page_type: hasCity ? "Transactional/Local" : hasCommercial ? "Supporting Commercial" : "Supporting Info",
      page_type_why: "Basierend auf Keyword-Muster-Erkennung",
      paa: [
        { question: `Was ist ${kw}?`, intent: "Informational" },
        { question: `Wie funktioniert ${kw}?`, intent: "Informational" },
        { question: `${kw} Kosten`, intent: "Commercial" },
        { question: `${kw} Erfahrungen`, intent: "Commercial" },
      ],
      lsi: kw.split(/\s+/).filter((w) => w.length > 3).concat(["Anleitung", "Lösung", "Tipps", "Hilfe", "Experte"]),
      cluster: {
        informational: [`${kw} erklärt`, `${kw} Anleitung`],
        commercial: [`${kw} Vergleich`, `${kw} Test`],
        transactional: hasCity ? [`${kw} Service`] : [],
        deep_pages: [`${kw} FAQ`],
      },
      schema_recommendation: ["FAQPage", "HowTo"],
      information_gain_suggestions: ["Eigene Erfahrungswerte einbringen", "Aktuelle Daten 2026 nutzen"],
      discover_angle: `Praxistipp-Artikel zu ${kw} mit aktuellen Zahlen`,
    };
  }, []);

  const saveAnalysis = useCallback(async (
    kw: string,
    analysisMode: string,
    result: AnalysisResult | null,
    volData: VolumeResult | null,
    serpData: SerpResult | null,
    json: string,
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const kwVol = volData?.[kw];
      await (supabase.from("seo_analyses") as any).insert({
        user_id: user.id,
        keyword: kw,
        mode: analysisMode,
        intent: result?.intent || null,
        intent_detail: result?.intent_detail || null,
        page_type: result?.page_type || null,
        page_type_why: result?.page_type_why || null,
        paa: result?.paa || null,
        lsi: result?.lsi || null,
        secondary_keywords: result?.secondary_keywords || null,
        content_gaps: result?.content_gaps || null,
        cluster: result?.cluster || null,
        schema_recommendation: result?.schema_recommendation || null,
        information_gain_suggestions: result?.information_gain_suggestions || null,
        discover_angle: result?.discover_angle || null,
        volume: kwVol?.volume ?? null,
        difficulty: kwVol?.difficulty ?? null,
        cpc: kwVol?.cpc ?? null,
        serp_data: serpData || null,
        firm_name: selectedFirm?.name || null,
        city: selectedFirm?.city || null,
        raw_json: json,
      });
    } catch (err) {
      console.error("Analyse speichern fehlgeschlagen:", err);
    }
  }, [selectedFirm]);

  // If we have an active running job (e.g. after page reload), restart polling
  useEffect(() => {
    if (activeJobId && !isPolling && resumedKeyword) {
      setAiState("loading");
      setSerpState("loading");
      setVolState("loading");
      setKeyword(resumedKeyword);
      startPolling(activeJobId, (result) => {
        applyJobResult(result as Record<string, unknown>, resumedKeyword);
        const r = result as { analysis?: AnalysisResult; serp?: SerpResult; volume?: VolumeResult; rawJson?: string };
        saveAnalysis(resumedKeyword, "kieai", r.analysis || null, r.volume || null, r.serp || null, r.rawJson || "");
      }, (errorMsg) => {
        setAiError(errorMsg);
        setAiState("error");
        setSerpState("idle");
        setVolState("idle");
      });
    }
  }, [activeJobId, isPolling, resumedKeyword, startPolling, applyJobResult, saveAnalysis]);

  const handleAnalyze = useCallback(async () => {
    if (!keyword.trim()) return;
    const kw = keyword.trim();

    // Reset
    setAnalysis(null);
    setSerp(null);
    setVolume(null);
    setRawJson("");
    setSelectedLsi(new Set());
    setRejectedLsi(new Set());
    setSelectedPaa(new Set());
    setActiveTab("results");

    if (mode === "standard") {
      setAiState("loading");
      setSerpState("idle");
      setVolState("idle");
      setAiError("");

      setTimeout(async () => {
        const result = runStandardAnalysis(kw);
        setAnalysis(result);
        setSelectedLsi(new Set(result.lsi || []));
        setAiState("done");
        const allResults = { seoAnalyze: result };
        const json = JSON.stringify(allResults, null, 2);
        setRawJson(json);
        await saveAnalysis(kw, "standard", result, null, null, json);
      }, 200);
      return;
    }

    // Kie.AI Live mode: fire-and-poll pattern
    // 1. Create persistent job in DB
    const jobId = await createJob(kw, "kieai");
    if (!jobId) return;

    setAiState("loading"); setAiError("");
    setSerpState("loading"); setSerpError("");
    setVolState("loading"); setVolError("");

    // 2. Fire the orchestrator edge function (runs server-side, tab-switch safe)
    supabase.functions.invoke("analyze-orchestrator", {
      body: { jobId, keyword: kw, firm: selectedFirm?.name, city: selectedFirm?.city },
    }).catch((e) => {
      console.error("Orchestrator invoke failed:", e);
      // Don't fail here — polling will detect the error state from DB
    });

    // 3. Poll for results — server does the work, frontend just watches
    startPolling(jobId, (result) => {
      // On complete
      applyJobResult(result as Record<string, unknown>, kw);
      // Save to seo_analyses for history
      const r = result as { analysis?: AnalysisResult; serp?: SerpResult; volume?: VolumeResult; rawJson?: string };
      saveAnalysis(kw, "kieai", r.analysis || null, r.volume || null, r.serp || null, r.rawJson || "");
    }, (errorMsg) => {
      // On error
      setAiError(errorMsg);
      setAiState("error");
      setSerpState("idle");
      setVolState("idle");
    });
  }, [keyword, mode, selectedFirm, runStandardAnalysis, saveAnalysis, createJob, startPolling, applyJobResult]);

  const handleVerifyDataForSEO = useCallback(async () => {
    if (!keyword.trim()) return;
    const kw = keyword.trim();
    setVerifyLoading(true);
    setSerpState("loading"); setSerpError("");
    setVolState("loading"); setVolError("");

    const allResults: Record<string, unknown> = {};

    const serpCall = supabase.functions.invoke("serp-data", { body: { keyword: kw } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setSerpError(error?.message || data?.error || "Fehler");
          setSerpState("error");
        } else {
          setSerp(data);
          setSerpState("done");
          allResults.serpData = data;
        }
      })
      .catch((e) => { setSerpError(e.message); setSerpState("error"); });

    const volCall = supabase.functions.invoke("keyword-volume", { body: { keywords: [kw] } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setVolError(error?.message || data?.error || "Fehler");
          setVolState("error");
        } else {
          setVolume(data?.data || {});
          setVolState("done");
          allResults.keywordVolume = data;
        }
      })
      .catch((e) => { setVolError(e.message); setVolState("error"); });

    await Promise.all([serpCall, volCall]);
    setVerifyLoading(false);
  }, [keyword]);

  const toggleLsi = useCallback((term: string) => {
    setSelectedLsi((prev) => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
        setRejectedLsi((r) => new Set(r).add(term));
      } else {
        next.add(term);
        setRejectedLsi((r) => { const n = new Set(r); n.delete(term); return n; });
      }
      return next;
    });
  }, []);

  const selectAllLsi = useCallback(() => {
    if (analysis?.lsi) {
      setSelectedLsi(new Set(analysis.lsi));
      setRejectedLsi(new Set());
    }
  }, [analysis]);

  const rejectAllLsi = useCallback(() => {
    if (analysis?.lsi) {
      setSelectedLsi(new Set());
      setRejectedLsi(new Set(analysis.lsi));
    }
  }, [analysis]);

  const togglePaa = useCallback((question: string) => {
    setSelectedPaa((prev) => {
      const next = new Set(prev);
      if (next.has(question)) next.delete(question);
      else next.add(question);
      return next;
    });
  }, []);

  const pollTaskStatus = async (taskId: string): Promise<{ urls: string[]; state: string; error?: string }> => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data, error } = await supabase.functions.invoke("task-status", { body: { taskId } });
      if (error) return { urls: [], state: "error", error: error.message };
      if (data?.state === "success") return { urls: data.resultUrls || [], state: "success" };
      if (data?.state === "fail") return { urls: [], state: "fail", error: data.failMsg || "Fehlgeschlagen" };
    }
    return { urls: [], state: "timeout", error: "Zeitüberschreitung" };
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: imagePrompt.trim(), aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" },
      });
      if (error || !data?.success) {
        setImageResult({ error: error?.message || data?.error || "Fehler" });
        return;
      }
      setImageResult({ state: "generating" });
      const result = await pollTaskStatus(data.taskId);
      setImageResult({ urls: result.urls, state: result.state, error: result.error });
    } catch (err: unknown) {
      setImageResult({ error: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setImageLoading(false);
    }
  };

  const kwVolume = volume?.[keyword.trim()];
  const hasResults = analysis || serp || volume;

  // Build auto-fill data for the form
  const formInitialData = useMemo((): Partial<SeoFormData> => {
    const data: Partial<SeoFormData> = { keyword: keyword.trim() };
    if (analysis) {
      if (analysis.intent) data.intent = analysis.intent;
      if (analysis.page_type) data.pageType = analysis.page_type;
      if (analysis.secondary_keywords) data.secondaryKeywords = analysis.secondary_keywords.join(", ");
      if (analysis.lsi) data.lsiTerms = [...selectedLsi].join(", ");
      if (analysis.cluster) {
        const sibs = [...(analysis.cluster.informational || []), ...(analysis.cluster.commercial || [])];
        data.siblingPages = sibs.join("\n");
        data.deepPages = (analysis.cluster.deep_pages || []).join("\n");
      }
      if (analysis.paa) {
        const aiQ = analysis.paa.map((p) => p.question);
        const serpQ = (serp?.paa_verified || []).map((p) => p.question);
        const allQ = [...new Set([...serpQ, ...aiQ])];
        data.paaQuestions = allQ.filter((q) => selectedPaa.has(q) || selectedPaa.size === 0).join("\n");
      }
      if (analysis.content_gaps) data.contentGap = analysis.content_gaps.join("\n");
      if (analysis.schema_recommendation) data.schemaBlocks = analysis.schema_recommendation;
      if (analysis.information_gain_suggestions) data.informationGain = analysis.information_gain_suggestions.join("\n");
    }
    if (selectedFirm) {
      data.firmName = selectedFirm.name;
      data.city = selectedFirm.city || "";
      data.street = selectedFirm.street || "";
      data.zip = selectedFirm.zip || "";
      data.phone = selectedFirm.phone || "";
      data.website = selectedFirm.website || "";
      data.serviceArea = selectedFirm.service_area || "";
    }
    return data;
  }, [analysis, serp, selectedLsi, selectedPaa, selectedFirm, keyword]);

  const autoFilledFields = useMemo(() => {
    const fields: Record<string, boolean> = {};
    if (analysis) {
      fields.keyword = true;
      if (analysis.intent) fields.intent = true;
      if (analysis.page_type) fields.pageType = true;
      if (analysis.secondary_keywords) fields.secondaryKeywords = true;
      if (analysis.lsi) fields.lsiTerms = true;
      if (analysis.cluster) { fields.siblingPages = true; fields.deepPages = true; }
      if (analysis.paa) fields.paaQuestions = true;
      if (analysis.schema_recommendation) fields.schemaBlocks = true;
      if (analysis.information_gain_suggestions) fields.informationGain = true;
    }
    if (selectedFirm) {
      fields.firmName = true;
      if (selectedFirm.city) fields.city = true;
      if (selectedFirm.street) fields.street = true;
      if (selectedFirm.zip) fields.zip = true;
      if (selectedFirm.phone) fields.phone = true;
      if (selectedFirm.website) fields.website = true;
      if (selectedFirm.service_area) fields.serviceArea = true;
    }
    return fields;
  }, [analysis, selectedFirm]);

  const handleFormSubmit = useCallback((data: SeoFormData) => {
    setQaFormData(data);
    setShowForm(false);
    setShowQaGate(true);
  }, []);

  const handleGenerate = useCallback(async (data: SeoFormData) => {
    setGenerating(true);
    setGenerateError("");
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-page", { body: data });
      if (error || result?.error) {
        setGenerateError(error?.message || result?.error || "Fehler bei der Seitengenerierung");
        return;
      }
      const html = result.htmlOutput || "";
      const isComplete = html.trim().endsWith("</html>");
      const hasFaq = html.includes('id="faq"');
      const hasSchema = html.includes("application/ld+json");
      const hasAutor = html.includes('id="autor"');

      if (html && (!isComplete || !hasFaq || !hasSchema || !hasAutor)) {
        const missing = [
          !isComplete && "HTML-Ende fehlt",
          !hasFaq && "FAQ-Sektion fehlt",
          !hasSchema && "JSON-LD fehlt",
          !hasAutor && "Autor-Sektion fehlt",
        ].filter(Boolean).join(", ");
        setHtmlWarning(`HTML unvollständig — Token-Limit erreicht. Fehlend: ${missing}`);
      } else {
        setHtmlWarning("");
      }

      setGeneratedPage({
        metaTitle: result.metaTitle || "",
        metaDesc: result.metaDesc || "",
        metaKeywords: result.metaKeywords || "",
        htmlOutput: html,
        jsonLd: result.jsonLd || "",
        masterPrompt: result.masterPrompt || "",
        activeSections: data.activeSections,
        firmName: data.firmName,
        street: data.street,
        city: data.city,
        phone: data.phone,
      });
      setShowQaGate(false);
      setShowOutput(true);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleNewPage = useCallback(() => {
    setShowOutput(false);
    setGeneratedPage(null);
    setShowForm(false);
    setAnalysis(null);
    setSerp(null);
    setVolume(null);
    setKeyword("");
    setRawJson("");
  }, []);

  return (
    <div className="space-y-6">
      {/* Firm Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Neue SEO-Seite</h1>
          <p className="text-sm text-muted-foreground">Kie.AI + DataForSEO — Parallele Analyse</p>
        </div>
        <FirmSelector
          selectedFirmId={selectedFirm?.id || null}
          onFirmChange={setSelectedFirm}
        />
      </div>
        {showOutput && generatedPage ? (
          <>
            {htmlWarning && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive mb-4">
                ⚠ {htmlWarning}
              </div>
            )}
            <OutputPanel
              page={generatedPage}
              onBack={() => { setShowOutput(false); setShowQaGate(true); }}
              onNewPage={handleNewPage}
            />
          </>
        ) : showQaGate && qaFormData ? (
          <>
            <QaGate
              formData={qaFormData}
              onBack={() => { setShowQaGate(false); setShowForm(true); }}
              onGenerate={handleGenerate}
            />
            {generating && (
              <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">Seite wird generiert… (Kie.AI, ~15–30 Sek.)</span>
              </div>
            )}
            {generateError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {generateError}
              </div>
            )}
          </>
        ) : showForm ? (
          <SeoForm
            initialData={formInitialData}
            autoFilledFields={autoFilledFields}
            onSubmit={handleFormSubmit}
            onBack={() => setShowForm(false)}
          />
        ) : (
          <>

        {/* Active job indicator */}
        {activeJobId && isPolling && (
          <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">Analyse läuft — bitte warten... (Tab-Wechsel möglich)</span>
          </div>
        )}

        <div className="space-y-3">
          <ModeToggle mode={mode} onModeChange={setMode} />
          <div className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Keyword eingeben, z.B. Bosch Waschmaschine Fehlercode F18 Berlin"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAnalyze()}
              className="h-12 w-full"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={!keyword.trim() || isLoading}
                className="h-12 flex-1 min-h-[44px] text-base font-semibold"
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                Analysieren
              </Button>
              <Button
                variant="outline"
                onClick={handleVerifyDataForSEO}
                disabled={!keyword.trim() || verifyLoading}
                className="h-12 flex-1 min-h-[44px] gap-2"
                title="SERP + Suchvolumen via DataForSEO laden"
              >
                {verifyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BarChart3 className="h-5 w-5" />}
                Verifizieren
              </Button>
            </div>
          </div>
          {/* Volume + KD badges inline */}
          {kwVolume && (
            <div className="flex gap-2">
              <Badge className="bg-secondary text-secondary-foreground px-2.5 py-1 text-sm">
                Vol: {kwVolume.volume.toLocaleString("de-DE")}
              </Badge>
              <Badge variant="outline" className="px-2.5 py-1 text-sm">
                KD: {kwVolume.difficulty}
              </Badge>
              <Badge variant="outline" className="px-2.5 py-1 text-sm">
                CPC: {kwVolume.cpc.toFixed(2)} €
              </Badge>
            </div>
          )}
        </div>

        {/* Loading Status */}
        {(aiState !== "idle" || serpState !== "idle" || volState !== "idle") && (
          <div className="flex flex-wrap gap-6 rounded-md border border-border bg-card p-4">
            <LoadingIndicator label={mode === "kieai" ? "KI-Analyse (Claude)" : "Standard-Analyse"} state={aiState} error={aiError} />
            {mode === "kieai" && (
              <>
                <LoadingIndicator label="SERP-Daten (DataForSEO)" state={serpState} error={serpError} />
                <LoadingIndicator label="Suchvolumen" state={volState} error={volError} />
              </>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        {hasResults && (
          <div className="flex gap-1 border-b border-border">
            {(["results", "image", "json"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "results" ? "Ergebnisse" : tab === "image" ? "Bildgenerierung" : "Raw JSON"}
              </button>
            ))}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === "results" && hasResults && (
          <div className="space-y-8">
            {/* Intent + Page Type */}
            {analysis && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {analysis.intent && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intent</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{analysis.intent}</p>
                    {analysis.intent_detail && <p className="mt-1 text-xs text-muted-foreground">{analysis.intent_detail}</p>}
                  </div>
                )}
                {analysis.page_type && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seitentyp</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{analysis.page_type}</p>
                    {analysis.page_type_why && <p className="mt-1 text-xs text-muted-foreground">{analysis.page_type_why}</p>}
                  </div>
                )}
                {kwVolume && (
                  <>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suchvolumen</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{kwVolume.volume.toLocaleString("de-DE")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">CPC: {kwVolume.cpc.toFixed(2)} €</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword Difficulty</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{kwVolume.difficulty}</p>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(kwVolume.difficulty, 100)}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PAA Section */}
            {(analysis?.paa || serp?.paa_verified) && (
              <section>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  People Also Ask
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({selectedPaa.size} ausgewählt)
                  </span>
                </h3>
                <PaaList
                  aiPaa={analysis?.paa || []}
                  serpPaa={serp?.paa_verified || []}
                  selectedPaa={selectedPaa}
                  onTogglePaa={togglePaa}
                />
              </section>
            )}

            {/* LSI Terms */}
            {analysis?.lsi && analysis.lsi.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-foreground">
                    LSI-Begriffe
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({selectedLsi.size}/{analysis.lsi.length} ausgewählt)
                    </span>
                  </h3>
                </div>
                <LsiChips
                  terms={analysis.lsi}
                  selected={selectedLsi}
                  rejected={rejectedLsi}
                  onToggle={toggleLsi}
                  onSelectAll={selectAllLsi}
                  onRejectAll={rejectAllLsi}
                />
              </section>
            )}

            {/* Cluster Preview */}
            {analysis?.cluster && (
              <section>
                <h3 className="text-base font-semibold text-foreground mb-3">Content-Cluster</h3>
                <ClusterPreview cluster={analysis.cluster} pillarKeyword={keyword.trim()} />
              </section>
            )}

            {/* Info Gain + Discover */}
            {(analysis?.information_gain_suggestions || analysis?.discover_angle) && (
              <section className="grid gap-4 sm:grid-cols-2">
                {analysis.information_gain_suggestions && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">🆕 Information Gain (2026)</h4>
                    <ul className="space-y-1">
                      {analysis.information_gain_suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-foreground/80">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.discover_angle && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">🔍 Google Discover Angle</h4>
                    <p className="text-sm text-foreground/80">{analysis.discover_angle}</p>
                  </div>
                )}
              </section>
            )}

            {/* Schema Recommendations */}
            {analysis?.schema_recommendation && analysis.schema_recommendation.length > 0 && (
              <section>
                <h3 className="text-base font-semibold text-foreground mb-3">Schema-Empfehlungen</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.schema_recommendation.map((s, i) => (
                    <span key={i} className="rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* SERP Preview */}
            {serp?.top_urls && serp.top_urls.length > 0 && (
              <section>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Live SERP-Vorschau
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (Top {serp.top_urls.length} • {serp.related?.length || 0} verwandte Suchen)
                  </span>
                </h3>
                <SerpPreview results={serp.top_urls} />
              </section>
            )}

            {/* Related Searches */}
            {serp?.related && serp.related.length > 0 && (
              <section>
                <h3 className="text-base font-semibold text-foreground mb-3">Verwandte Suchanfragen</h3>
                <div className="flex flex-wrap gap-2">
                  {serp.related.map((r, i) => (
                    <span key={i} className="rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => { setKeyword(r); }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Action Button */}
            {analysis && (
              <Button
                variant="secondary"
                className="h-12 min-h-[44px] text-base font-semibold gap-2"
                onClick={() => setShowForm(true)}
              >
                <ArrowRight className="h-5 w-5" />
                Vorschläge ins Formular übernehmen
              </Button>
            )}
          </div>
        )}

        {/* Image Tab */}
        {activeTab === "image" && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ImageIcon className="h-5 w-5 text-secondary" />
              Bildgenerierung (NanoBanana 2)
            </h2>
            <Textarea
              placeholder="Bild-Prompt eingeben…"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <Button
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || imageLoading}
              variant="secondary"
              className="h-12 w-full min-h-[44px] text-base font-semibold"
            >
              {imageLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {imageResult?.state === "generating" ? "Generiere…" : "Sende…"}
                </>
              ) : "Bild generieren"}
            </Button>
            {imageResult?.error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {imageResult.error}
              </div>
            )}
            {imageResult?.urls && imageResult.urls.length > 0 && (
              <div className="space-y-3">
                {imageResult.urls.map((url, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Generated ${i + 1}`} className="w-full" />
                    <div className="bg-card p-2">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary underline">
                        Bild öffnen ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* JSON Tab */}
        {activeTab === "json" && rawJson && (
          <Textarea readOnly value={rawJson} className="min-h-[500px] font-mono text-xs" />
        )}
          </>
        )}
    </div>
  );
}
