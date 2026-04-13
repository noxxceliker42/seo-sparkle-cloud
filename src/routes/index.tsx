import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Search, Image as ImageIcon, Loader2, ArrowRight } from "lucide-react";
import { LsiChips } from "@/components/seo/LsiChips";
import { SerpPreview } from "@/components/seo/SerpPreview";
import { PaaList } from "@/components/seo/PaaList";
import { ClusterPreview } from "@/components/seo/ClusterPreview";
import { LoadingIndicator, type LoadState } from "@/components/seo/LoadingIndicator";

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

function Index() {
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<"results" | "image" | "json">("results");

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

  // Image generation
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResult, setImageResult] = useState<{ urls?: string[]; state?: string; error?: string } | null>(null);

  const isLoading = aiState === "loading" || serpState === "loading" || volState === "loading";

  const handleAnalyze = useCallback(async () => {
    if (!keyword.trim()) return;
    const kw = keyword.trim();

    // Reset
    setAnalysis(null);
    setSerp(null);
    setVolume(null);
    setRawJson("");
    setAiState("loading"); setAiError("");
    setSerpState("loading"); setSerpError("");
    setVolState("loading"); setVolError("");
    setSelectedLsi(new Set());
    setActiveTab("results");

    const allResults: Record<string, unknown> = {};

    // Fire all 3 calls in parallel
    const aiCall = supabase.functions.invoke("seo-analyze", { body: { keyword: kw } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setAiError(error?.message || data?.error || "Unbekannter Fehler");
          setAiState("error");
        } else {
          const a = data?.analysis || data;
          setAnalysis(a);
          setSelectedLsi(new Set(a?.lsi || []));
          setAiState("done");
          allResults.seoAnalyze = data;
        }
      })
      .catch((e) => { setAiError(e.message); setAiState("error"); });

    const serpCall = supabase.functions.invoke("serp-data", { body: { keyword: kw } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setSerpError(error?.message || data?.error || "Unbekannter Fehler");
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
          setVolError(error?.message || data?.error || "Unbekannter Fehler");
          setVolState("error");
        } else {
          setVolume(data?.data || {});
          setVolState("done");
          allResults.keywordVolume = data;
        }
      })
      .catch((e) => { setVolError(e.message); setVolState("error"); });

    await Promise.all([aiCall, serpCall, volCall]);
    setRawJson(JSON.stringify(allResults, null, 2));
  }, [keyword]);

  const toggleLsi = useCallback((term: string) => {
    setSelectedLsi((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-bold text-primary">SEO-OS v3.1</h1>
        <p className="text-sm text-muted-foreground">Kie.AI + DataForSEO — Parallele Analyse</p>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Search Bar */}
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="Keyword eingeben, z.B. Bosch Waschmaschine Fehlercode F18 Berlin"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAnalyze()}
            className="h-12 flex-1"
          />
          <Button
            onClick={handleAnalyze}
            disabled={!keyword.trim() || isLoading}
            className="h-12 min-w-[160px] min-h-[44px] text-base font-semibold"
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
            Analysieren
          </Button>
        </div>

        {/* Loading Status */}
        {(aiState !== "idle" || serpState !== "idle" || volState !== "idle") && (
          <div className="flex flex-wrap gap-6 rounded-md border border-border bg-card p-4">
            <LoadingIndicator label="KI-Analyse (Claude)" state={aiState} error={aiError} />
            <LoadingIndicator label="SERP-Daten (DataForSEO)" state={serpState} error={serpError} />
            <LoadingIndicator label="Suchvolumen" state={volState} error={volError} />
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
            {/* Intent + Page Type + Volume */}
            {(analysis || kwVolume) && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {analysis?.intent && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intent</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{analysis.intent}</p>
                    {analysis.intent_detail && <p className="mt-1 text-xs text-muted-foreground">{analysis.intent_detail}</p>}
                  </div>
                )}
                {analysis?.page_type && (
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
                <h3 className="text-base font-semibold text-foreground mb-3">People Also Ask — verifiziert</h3>
                <PaaList
                  aiPaa={analysis?.paa || []}
                  serpPaa={serp?.paa_verified || []}
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
                <LsiChips terms={analysis.lsi} selected={selectedLsi} onToggle={toggleLsi} />
              </section>
            )}

            {/* Cluster Preview */}
            {analysis?.cluster && (
              <section>
                <h3 className="text-base font-semibold text-foreground mb-3">Content-Cluster</h3>
                <ClusterPreview cluster={analysis.cluster} />
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
              <Button variant="secondary" className="h-12 min-h-[44px] text-base font-semibold gap-2">
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
      </main>
    </div>
  );
}
