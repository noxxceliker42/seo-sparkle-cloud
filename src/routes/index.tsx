import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SEO-OS v3.1 – SEO Analyse & Optimierung" },
      { name: "description", content: "SEO-OS: Dein Betriebssystem für SEO-Analyse, SERP-Daten und automatische Seitengenerierung." },
    ],
  }),
});

function Index() {
  const [keyword, setKeyword] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResult, setImageResult] = useState<{ urls?: string[]; state?: string; error?: string } | null>(null);

  const handleAnalyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setOutput("");

    try {
      const { data, error } = await supabase.functions.invoke("seo-analyze", {
        body: { keyword: keyword.trim() },
      });

      if (error) {
        setOutput(JSON.stringify({ error: error.message }, null, 2));
      } else {
        setOutput(JSON.stringify(data, null, 2));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setOutput(JSON.stringify({ error: message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string): Promise<{ urls: string[]; state: string; error?: string }> => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data, error } = await supabase.functions.invoke("task-status", {
        body: { taskId },
      });
      if (error) return { urls: [], state: "error", error: error.message };
      if (data?.state === "success") return { urls: data.resultUrls || [], state: "success" };
      if (data?.state === "fail") return { urls: [], state: "fail", error: data.failMsg || "Generierung fehlgeschlagen" };
    }
    return { urls: [], state: "timeout", error: "Zeitüberschreitung nach 90 Sekunden" };
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: imagePrompt.trim(), aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" },
      });

      if (error) {
        setImageResult({ error: error.message });
        return;
      }

      if (!data?.success || !data?.taskId) {
        setImageResult({ error: data?.error || "Task konnte nicht erstellt werden" });
        return;
      }

      setImageResult({ state: "generating" });
      const result = await pollTaskStatus(data.taskId);
      setImageResult({ urls: result.urls, state: result.state, error: result.error });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setImageResult({ error: message });
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-bold text-primary">SEO-OS v3.1</h1>
        <p className="text-sm text-muted-foreground">Kie.AI Integration — Claude Sonnet 4.6 + NanoBanana 2</p>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        {/* SEO Analysis Section */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Search className="h-5 w-5 text-primary" />
            SEO-Analyse
          </h2>

          <div className="space-y-2">
            <label htmlFor="keyword" className="text-sm font-medium text-foreground">
              Keyword eingeben
            </label>
            <Input
              id="keyword"
              type="text"
              placeholder="z.B. Bosch Waschmaschine Fehlercode F18 Berlin"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleAnalyze()}
              className="h-12"
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!keyword.trim() || loading}
            className="h-12 w-full min-h-[44px] min-w-[44px] text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analysiere mit Claude Sonnet 4.6…
              </>
            ) : (
              "Analysieren"
            )}
          </Button>

          <div className="space-y-2">
            <label htmlFor="output" className="text-sm font-medium text-foreground">
              JSON-Output
            </label>
            <Textarea
              id="output"
              readOnly
              value={output}
              placeholder="Ergebnis erscheint hier…"
              className="min-h-[400px] font-mono text-sm"
            />
          </div>
        </section>

        <hr className="border-border" />

        {/* Image Generation Section */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ImageIcon className="h-5 w-5 text-secondary" />
            Bildgenerierung (NanoBanana 2)
          </h2>

          <div className="space-y-2">
            <label htmlFor="imagePrompt" className="text-sm font-medium text-foreground">
              Bild-Prompt eingeben
            </label>
            <Textarea
              id="imagePrompt"
              placeholder="z.B. Professional hero image for a plumber website, modern bathroom, clean design"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>

          <Button
            onClick={handleGenerateImage}
            disabled={!imagePrompt.trim() || imageLoading}
            variant="secondary"
            className="h-12 w-full min-h-[44px] min-w-[44px] text-base font-semibold"
          >
            {imageLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {imageResult?.state === "generating" ? "Generiere Bild…" : "Sende Auftrag…"}
              </>
            ) : (
              "Bild generieren"
            )}
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
        </section>
      </main>
    </div>
  );
}
