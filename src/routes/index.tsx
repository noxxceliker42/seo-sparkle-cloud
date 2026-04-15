import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Image as ImageIcon, Loader2, ArrowRight, BarChart3 } from "lucide-react";
import { useGenerationJob } from "@/hooks/useGenerationJob";
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
import { useAnalysis } from "@/context/AnalysisContext";
import { toast } from "sonner";
import { buildMasterPrompt } from "@/lib/buildMasterPrompt";

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

  // Generation via n8n-proxy hook
  const {
    generating,
    error: generateError,
    htmlWarning,
    result: generationResult,
    startGeneration,
    clearResult: clearGenerationResult,
    clearError: clearGenerateError,
  } = useGenerationJob();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Prompt Review Screen
  const [showPromptReview, setShowPromptReview] = useState(false);
  const [reviewPrompt, setReviewPrompt] = useState('');
  const [isPromptEdited, setIsPromptEdited] = useState(false);

  const isLoading = aiState === "loading" || serpState === "loading" || volState === "loading";

  const {
    isRunning: isAnalysisRunning,
    keyword: runningAnalysisKeyword,
    result: analysisJobResult,
    error: analysisJobError,
    startAnalysis,
    clearResult: clearAnalysisResult,
    clearError: clearAnalysisError,
    savedAnalysisId,
  } = useAnalysis();

  useEffect(() => {
    if (!isAnalysisRunning) return;

    setAiState("loading");
    setAiError("");
    setSerpState("loading");
    setSerpError("");
    setVolState("loading");
    setVolError("");

    if (runningAnalysisKeyword) {
      setKeyword(runningAnalysisKeyword);
    }
  }, [isAnalysisRunning, runningAnalysisKeyword]);

  useEffect(() => {
    if (!analysisJobError) return;

    setAiError(analysisJobError);
    setAiState("error");
    setSerpState("idle");
    setVolState("idle");
    clearAnalysisError();
  }, [analysisJobError, clearAnalysisError]);


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

  const applyJobResult = useCallback((result: { kieai: unknown; serp: unknown; volume: unknown }, kw: string) => {
    const analysisData = result.kieai as AnalysisResult | null;
    const serpData = result.serp as SerpResult | null;
    const volumeData = result.volume as VolumeResult | null;

    if (analysisData) {
      setAnalysis(analysisData);
      setSelectedLsi(new Set(analysisData.lsi || []));
      setAiState("done");
    }
    if (serpData) {
      setSerp(serpData);
      setSerpState("done");
    }
    if (volumeData) {
      setVolume(volumeData);
      setVolState("done");
    }
    setKeyword(kw);
  }, []);

  useEffect(() => {
    const appliedKeyword = runningAnalysisKeyword || keyword.trim();
    if (!analysisJobResult || !appliedKeyword) return;

    applyJobResult(analysisJobResult, appliedKeyword);
    clearAnalysisResult();
  }, [analysisJobResult, runningAnalysisKeyword, keyword, applyJobResult, clearAnalysisResult]);

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

    setAiState("loading");
    setAiError("");
    setSerpState("loading");
    setSerpError("");
    setVolState("loading");
    setVolError("");

    void startAnalysis({
      keyword: kw,
      mode: "kieai",
      firm: selectedFirm?.name || null,
      city: selectedFirm?.city || null,
    });
  }, [keyword, mode, selectedFirm, runStandardAnalysis, saveAnalysis, startAnalysis]);

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
    // NAP pre-check before QA gate
    const napErrors: string[] = [];
    const INVALID_PATTERNS = ['k.a.', 'tbd', 'n/a', 'na', 'none', 'test', 'xxx', 'platzhalter', 'placeholder', '000', 'beispiel', 'mustermann', 'muster'];
    const checkField = (val: string, name: string, min: number) => {
      if (!val || val.trim().length < min) { napErrors.push(`${name} ist zu kurz oder leer`); return; }
      if (INVALID_PATTERNS.some(p => val.trim().toLowerCase().includes(p))) napErrors.push(`${name} enthält ungültigen Wert`);
    };
    checkField(data.firmName, 'Firmenname', 3);
    checkField(data.street, 'Straße', 5);
    checkField(data.city, 'Stadt', 4);
    const cleanedPhone = (data.phone || '').replace(/[\s\-\(\)]/g, '');
    if (cleanedPhone.length < 6) napErrors.push('Telefon zu kurz');
    else if (!/\d{4,}/.test(cleanedPhone)) napErrors.push('Telefon ungültig');
    if (data.website && data.website.trim().length >= 4 && !data.website.startsWith('http') && !data.website.startsWith('www.')) {
      napErrors.push('Website muss mit http://, https:// oder www. beginnen');
    }
    if (napErrors.length > 0) {
      toast.error('NAP ungültig: ' + napErrors.join(', ') + ' — Bitte Schritt C korrigieren.');
      return;
    }
    setQaFormData(data);
    setShowForm(false);
    setShowQaGate(true);
  }, []);

  // Timer for elapsed seconds during generation
  useEffect(() => {
    if (!generating) { setElapsedSeconds(0); return; }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerate = useCallback(async (data: SeoFormData, customPrompt?: string) => {
    // Validate required fields
    const missing: string[] = [];
    if (!data.keyword?.trim()) missing.push("Keyword");
    if (!data.firmName?.trim()) missing.push("Firma");
    if (!data.city?.trim()) missing.push("Stadt");
    if (!data.informationGain?.trim()) missing.push("Information Gain");
    if (missing.length > 0) {
      toast.error(`Fehlende Felder: ${missing.join(", ")}`);
      return;
    }

    // Build basePrompt from master prompt builder
    const basePrompt = customPrompt || buildMasterPrompt(data);

    // Send all form data + basePrompt to n8n via the hook
    await startGeneration({
      ...data,
      basePrompt,
    });

    toast.info("Generierung gestartet — dauert 2–4 Minuten. Tab-Wechsel ist sicher.");
  }, [startGeneration]);

  // Map generation hook result → UI state
  useEffect(() => {
    if (!generationResult) return;

    setGeneratedPage({
      metaTitle: generationResult.metaTitle || "",
      metaDesc: generationResult.metaDesc || "",
      metaKeywords: generationResult.metaKeywords || "",
      htmlOutput: generationResult.htmlOutput,
      bodyContent: generationResult.bodyContent || "",
      cssBlock: generationResult.cssBlock || "",
      jsonLd: generationResult.jsonLd || "",
      masterPrompt: generationResult.promptUsed || "",
      activeSections: qaFormData?.activeSections || [],
      firmName: qaFormData?.firmName || "",
      street: qaFormData?.street || "",
      city: qaFormData?.city || "",
      phone: qaFormData?.phone || "",
      pageId: generationResult.pageId || undefined,
      keyword: qaFormData?.keyword || keyword,
      tokensUsed: generationResult.tokensUsed || 0,
      duration: generationResult.durationSeconds || 0,
      stopReason: generationResult.stopReason || "",
    });
    setShowQaGate(false);
    setShowOutput(true);
    toast.success(`Seite generiert: ${generationResult.tokensUsed || "?"} Tokens, ${generationResult.durationSeconds || "?"}s`);
    clearGenerationResult();
  }, [generationResult, qaFormData, keyword, clearGenerationResult]);

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
      {/* Prompt Review Modal */}
      {showPromptReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-background rounded-2xl w-full max-w-[860px] max-h-[90vh] flex flex-col overflow-hidden border border-border shadow-lg">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-bold text-base text-foreground">Master-Prompt Review</div>
                <div className="text-xs text-muted-foreground mt-0.5">Prüfe und bearbeite den Prompt vor der Generierung</div>
              </div>
              <div className="flex gap-2.5 items-center">
                {isPromptEdited && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                    ✏ Bearbeitet
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {reviewPrompt.length} Zeichen · {Math.round(reviewPrompt.length / 4)} Tokens (ca.)
                </span>
              </div>
            </div>
            {/* Prompt Editor */}
            <div className="flex-1 overflow-hidden px-6 py-4">
              <textarea
                value={reviewPrompt}
                onChange={e => { setReviewPrompt(e.target.value); setIsPromptEdited(true); }}
                className="w-full h-full min-h-[400px] font-mono text-xs leading-relaxed text-foreground bg-muted/50 border border-border rounded-lg p-4 resize-none outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {/* Hinweis */}
            <div className="px-6 pb-3 text-[11px] text-muted-foreground">
              Änderungen am Prompt wirken sich direkt auf die generierte Seite aus. Originalprompt kann durch Zurücksetzen wiederhergestellt werden.
            </div>
            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-border flex gap-2.5 justify-between">
              <div className="flex gap-2.5">
                <Button variant="outline" onClick={() => setShowPromptReview(false)}>
                  ← Zurück zum Formular
                </Button>
                {isPromptEdited && qaFormData && (
                  <Button variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300" onClick={() => { setReviewPrompt(buildMasterPrompt(qaFormData)); setIsPromptEdited(false); }}>
                    ↺ Original wiederherstellen
                  </Button>
                )}
              </div>
              <Button onClick={() => { setShowPromptReview(false); if (qaFormData) handleGenerate(qaFormData, reviewPrompt); }} className="px-7 font-bold">
                Seite generieren →
              </Button>
            </div>
          </div>
        </div>
      )}
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
              onGenerate={(data: SeoFormData) => {
                const prompt = buildMasterPrompt(data);
                setReviewPrompt(prompt);
                setIsPromptEdited(false);
                setShowPromptReview(true);
              }}
            />
            {generating && (
              <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">
                    {elapsedSeconds < 10
                      ? "Anthropic Claude verarbeitet den Prompt..."
                      : elapsedSeconds < 30
                      ? `${elapsedSeconds}s — HTML wird geschrieben...`
                      : elapsedSeconds < 60
                      ? `${elapsedSeconds}s — Sektionen werden ausformuliert...`
                      : elapsedSeconds < 90
                      ? `${elapsedSeconds}s — Fast fertig...`
                      : `${elapsedSeconds}s — Noch ein Moment...`}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Direkte Generierung — kein Tab-Wechsel nötig.</p>
                </div>
                <Badge variant="outline" className="text-xs">{elapsedSeconds}s</Badge>
              </div>
            )}
            {generateError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <span className="flex-1">{generateError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { clearGenerateError(); if (qaFormData) handleGenerate(qaFormData); }}
                  className="text-xs border-destructive/30"
                >
                  Erneut versuchen
                </Button>
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
        {isAnalysisRunning && (
          <div className="sticky top-0 z-50 flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary px-5 py-3 text-primary-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-primary-foreground" />
              <span className="text-sm font-medium">
                Analyse läuft für „{runningAnalysisKeyword || keyword}“ — Tab-Wechsel ist sicher
              </span>
            </div>
            <span className="text-xs text-primary-foreground/80">
              Ergebnisse werden automatisch geladen
            </span>
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
