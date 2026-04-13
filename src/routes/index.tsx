import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-bold text-primary">SEO-OS v3.1</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-6">
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
                Analysiere…
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
        </div>
      </main>
    </div>
  );
}
