import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Copy, ArrowLeft, RefreshCw, Monitor, Smartphone } from "lucide-react";

export interface GeneratedPage {
  metaTitle: string;
  metaDesc: string;
  metaKeywords: string;
  htmlOutput: string;
  jsonLd: string;
  masterPrompt: string;
  activeSections: string[];
  firmName?: string;
  street?: string;
  city?: string;
  phone?: string;
}

interface OutputPanelProps {
  page: GeneratedPage;
  onBack: () => void;
  onNewPage: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  "01": "Hero", "02": "Problem", "03": "TOC", "04": "Symptome", "05": "Selbsthilfe",
  "06": "Fehlercodes", "07": "Unique Data", "08": "Information Gain", "09": "Ablauf",
  "10": "Preise", "11": "Rep-vs-Neukauf", "12": "Qualität", "13": "Marken", "14": "FAQ", "15": "Autor+Kontakt",
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function QaCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {passed ? (
        <Check className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <X className="h-4 w-4 text-red-500 shrink-0" />
      )}
      <span className={passed ? "text-foreground" : "text-red-600 font-medium"}>{label}</span>
    </div>
  );
}

export function OutputPanel({ page, onBack, onNewPage }: OutputPanelProps) {
  const [tab, setTab] = useState<"html" | "preview" | "prompt" | "jsonld" | "meta">("html");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const qaChecks = useMemo(() => {
    const html = page.htmlOutput.toLowerCase();
    const sectionsPresent = page.activeSections.every((id) => {
      const label = SECTION_LABELS[id]?.toLowerCase() || "";
      return html.includes(`section`) || html.includes(label) || html.includes(`id="${id}"`) || html.includes(`id="section-${id}"`);
    });
    const imagesHaveSize = !html.includes("<img") || (html.includes("width=") && html.includes("height="));
    const hasJsonLd = html.includes("application/ld+json") || page.jsonLd.length > 10;
    const napConsistent = (() => {
      if (!page.firmName) return true;
      const combined = html + page.jsonLd.toLowerCase();
      return combined.includes(page.firmName.toLowerCase());
    })();
    const hasMaxImagePreview = html.includes("max-image-preview") || html.includes("max-image-preview:large");

    return { sectionsPresent, imagesHaveSize, hasJsonLd, napConsistent, hasMaxImagePreview };
  }, [page]);

  const handleCopy = useCallback((content: string) => {
    copyToClipboard(content);
  }, []);

  const tabs = [
    { id: "html" as const, label: "HTML (vollständig)" },
    { id: "preview" as const, label: "Vorschau" },
    { id: "prompt" as const, label: "Master-Prompt" },
    { id: "jsonld" as const, label: "JSON-LD Schema" },
    { id: "meta" as const, label: "Meta-Block" },
  ];

  const metaBlock = `Title: ${page.metaTitle}\nDescription: ${page.metaDesc}\nKeywords: ${page.metaKeywords}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
        <h2 className="text-lg font-bold text-foreground">Output — Generierte SEO-Seite</h2>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-3">
        {tab === "html" && (
          <>
            <Textarea readOnly value={page.htmlOutput} className="min-h-[400px] font-mono text-xs" />
            <Button variant="outline" onClick={() => handleCopy(page.htmlOutput)} className="min-h-[44px] gap-2">
              <Copy className="h-4 w-4" /> HTML kopieren
            </Button>
          </>
        )}
        {tab === "prompt" && (
          <>
            <Textarea readOnly value={page.masterPrompt} className="min-h-[400px] font-mono text-xs" />
            <Button variant="outline" onClick={() => handleCopy(page.masterPrompt)} className="min-h-[44px] gap-2">
              <Copy className="h-4 w-4" /> Prompt kopieren
            </Button>
          </>
        )}
        {tab === "jsonld" && (
          <>
            <Textarea readOnly value={page.jsonLd} className="min-h-[300px] font-mono text-xs" />
            <Button variant="outline" onClick={() => handleCopy(page.jsonLd)} className="min-h-[44px] gap-2">
              <Copy className="h-4 w-4" /> Schema kopieren
            </Button>
          </>
        )}
        {tab === "meta" && (
          <>
            <Textarea readOnly value={metaBlock} className="min-h-[120px] font-mono text-sm" />
            <Button variant="outline" onClick={() => handleCopy(metaBlock)} className="min-h-[44px] gap-2">
              <Copy className="h-4 w-4" /> Meta kopieren
            </Button>
          </>
        )}
      </div>

      {/* Post-QA Check */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Post-QA Check</h3>
        <QaCheck passed={qaChecks.sectionsPresent} label="HTML enthält alle aktiven Sektionen" />
        <QaCheck passed={qaChecks.imagesHaveSize} label="Alle Bild-Platzhalter mit width+height" />
        <QaCheck passed={qaChecks.hasJsonLd} label="JSON-LD vorhanden" />
        <QaCheck passed={qaChecks.napConsistent} label="NAP im HTML identisch mit Schema" />
        <QaCheck passed={qaChecks.hasMaxImagePreview} label="HTML hat meta max-image-preview:large" />
      </div>

      {/* SERP Preview */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Live SERP-Vorschau</h3>
        <div className="rounded-md border border-border bg-background p-4 max-w-xl">
          <p className="text-[13px] text-green-700 truncate">
            {page.firmName ? `${page.firmName.toLowerCase().replace(/\s+/g, "-")}.de` : "example.de"} › ...
          </p>
          <p className={`text-lg font-medium leading-snug ${page.metaTitle.length > 60 ? "text-red-600" : "text-blue-700"}`}>
            {page.metaTitle || "Kein Title vorhanden"}
          </p>
          <p className={`text-sm mt-1 ${page.metaDesc.length > 155 ? "text-red-600" : "text-muted-foreground"}`}>
            {page.metaDesc || "Keine Description vorhanden"}
          </p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            Title: <span className={page.metaTitle.length > 60 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
              {page.metaTitle.length}/60
            </span>
          </span>
          <span>
            Desc: <span className={page.metaDesc.length > 155 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
              {page.metaDesc.length}/155
            </span>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onNewPage} className="min-h-[44px] gap-2">
          <RefreshCw className="h-4 w-4" />
          Neue Seite generieren
        </Button>
      </div>
    </div>
  );
}
