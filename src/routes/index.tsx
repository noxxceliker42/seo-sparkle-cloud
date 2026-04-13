import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  const handleAnalyze = () => {
    setOutput(JSON.stringify({
      status: "placeholder",
      message: "Analyse-Funktion noch nicht verbunden.",
      keyword,
      timestamp: new Date().toISOString(),
    }, null, 2));
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
              placeholder="z.B. Zahnarzt München"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-12"
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!keyword.trim()}
            className="h-12 w-full min-h-[44px] min-w-[44px] text-base font-semibold"
          >
            Analysieren
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
              className="min-h-[240px] font-mono text-sm"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
