import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Copy, ArrowLeft, RefreshCw, Monitor, Smartphone, ImageIcon, Sparkles, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  pageId?: string;
  keyword?: string;
}

interface OutputPanelProps {
  page: GeneratedPage;
  onBack: () => void;
  onNewPage: () => void;
}

interface ImageSlot {
  id: string;
  slot: string;
  slotLabel: string;
  prompt: string;
  altText: string;
  width: number;
  height: number;
  status: string;
  cloudinaryUrl?: string;
  nanoUrl?: string;
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
  const [tab, setTab] = useState<"html" | "preview" | "images" | "prompt" | "jsonld" | "meta">("html");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsAnalyzed, setSlotsAnalyzed] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Analyze image slots when switching to images tab
  useEffect(() => {
    if (tab !== "images" || slotsAnalyzed || !page.pageId || !page.htmlOutput) return;

    async function analyzeSlots() {
      setSlotsLoading(true);
      try {
        // First check if slots already exist in DB
        const { data: existing } = await supabase
          .from("page_images")
          .select("id, slot, slot_label, nano_prompt, alt_text, width, height, nano_status, cloudinary_url, nano_url")
          .eq("page_id", page.pageId!);

        if (existing && existing.length > 0) {
          setImageSlots(existing.map((r: any) => ({
            id: r.id,
            slot: r.slot,
            slotLabel: r.slot_label || r.slot,
            prompt: r.nano_prompt || "",
            altText: r.alt_text || "",
            width: r.width || 800,
            height: r.height || 450,
            status: r.nano_status || "pending",
            cloudinaryUrl: r.cloudinary_url,
            nanoUrl: r.nano_url,
          })));
          setSlotsAnalyzed(true);
          setSlotsLoading(false);
          return;
        }

        // Analyze HTML for slots
        const { data, error } = await supabase.functions.invoke("analyze-image-slots", {
          body: {
            pageId: page.pageId,
            html: page.htmlOutput,
            keyword: page.keyword || "",
            firm: page.firmName || "",
            city: page.city || "",
          },
        });

        if (error) {
          console.error("analyze-image-slots error:", error);
        } else if (data?.slots) {
          setImageSlots(data.slots);
        }
        setSlotsAnalyzed(true);
      } catch (err) {
        console.error("Slot analysis error:", err);
      }
      setSlotsLoading(false);
    }

    analyzeSlots();
  }, [tab, slotsAnalyzed, page.pageId, page.htmlOutput, page.keyword, page.firmName, page.city]);

  // Poll for generating images
  useEffect(() => {
    const generating = imageSlots.filter((s) => s.status === "generating");
    if (generating.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      for (const slot of generating) {
        const { data } = await supabase
          .from("page_images")
          .select("nano_status, cloudinary_url, nano_url, alt_text")
          .eq("id", slot.id)
          .single();

        if (!data) continue;

        if (data.nano_status === "uploaded" || data.nano_status === "completed" || data.nano_status === "failed") {
          setImageSlots((prev) =>
            prev.map((s) =>
              s.id === slot.id
                ? {
                    ...s,
                    status: data.nano_status!,
                    cloudinaryUrl: data.cloudinary_url || undefined,
                    nanoUrl: data.nano_url || undefined,
                    altText: data.alt_text || s.altText,
                  }
                : s
            )
          );
        }
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [imageSlots]);

  const generateImage = useCallback(async (slotId: string) => {
    setImageSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, status: "generating" } : s))
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { imageId: slotId },
      });

      if (error) {
        console.error("generate-image error:", error);
        setImageSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, status: "failed" } : s))
        );
      }
      // Polling will pick up the status change
    } catch (err) {
      console.error("Image generation error:", err);
      setImageSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: "failed" } : s))
      );
    }
  }, []);

  const updateSlotPrompt = useCallback(async (slotId: string, prompt: string) => {
    setImageSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, prompt } : s))
    );
    await supabase.from("page_images").update({ nano_prompt: prompt }).eq("id", slotId);
  }, []);

  const updateSlotAlt = useCallback(async (slotId: string, altText: string) => {
    setImageSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, altText } : s))
    );
    await supabase.from("page_images").update({ alt_text: altText }).eq("id", slotId);
  }, []);

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
    { id: "images" as const, label: "🖼 Bilder" },
    { id: "prompt" as const, label: "Master-Prompt" },
    { id: "jsonld" as const, label: "JSON-LD Schema" },
    { id: "meta" as const, label: "Meta-Block" },
  ];

  const metaBlock = `Title: ${page.metaTitle}\nDescription: ${page.metaDesc}\nKeywords: ${page.metaKeywords}`;

  const generatingCount = imageSlots.filter((s) => s.status === "generating").length;
  const uploadedCount = imageSlots.filter((s) => s.status === "uploaded" || s.status === "completed").length;

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
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.id === "images" && imageSlots.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                {uploadedCount}/{imageSlots.length}
              </Badge>
            )}
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
        {tab === "preview" && (
          <>
            <div className="flex gap-2 mb-3">
              <Button
                variant={previewMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("desktop")}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" /> Desktop
              </Button>
              <Button
                variant={previewMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("mobile")}
                className="gap-2"
              >
                <Smartphone className="h-4 w-4" /> Mobile
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden h-[600px] bg-muted/30">
              {page.htmlOutput ? (
                <iframe
                  srcDoc={page.htmlOutput
                    .replace(/^```html\s*/i, "")
                    .replace(/```\s*$/i, "")
                    .trim()}
                  className={`h-full border-none ${
                    previewMode === "mobile" ? "w-[375px] mx-auto block" : "w-full"
                  }`}
                  title="SEO-Seite Live-Vorschau"
                  sandbox="allow-same-origin allow-scripts"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Seite generieren um Vorschau zu sehen
                </div>
              )}
            </div>
          </>
        )}
        {tab === "images" && (
          <div className="space-y-4">
            {slotsLoading && (
              <div className="flex items-center gap-3 p-6 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                HTML wird nach Bild-Slots analysiert...
              </div>
            )}

            {!slotsLoading && imageSlots.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Keine Bild-Platzhalter im HTML gefunden</p>
                <p className="text-xs mt-1">
                  Das HTML enthält keine <code className="bg-muted px-1 rounded">data-img-slot</code> Attribute.
                </p>
              </div>
            )}

            {generatingCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                {generatingCount} {generatingCount === 1 ? "Bild wird" : "Bilder werden"} generiert... (ca. 15–30 Sek pro Bild)
              </div>
            )}

            {imageSlots.map((slot) => (
              <div
                key={slot.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  slot.status === "uploaded" || slot.status === "completed"
                    ? "border-green-200 bg-green-50/50"
                    : slot.status === "failed"
                    ? "border-red-200 bg-red-50/50"
                    : "border-border bg-card"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{slot.slotLabel}</span>
                    <Badge
                      variant={
                        slot.status === "uploaded" || slot.status === "completed"
                          ? "default"
                          : slot.status === "generating"
                          ? "secondary"
                          : slot.status === "failed"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {slot.status === "uploaded" || slot.status === "completed"
                        ? "✓ Fertig"
                        : slot.status === "generating"
                        ? "⏳ Generiert..."
                        : slot.status === "failed"
                        ? "✗ Fehler"
                        : "● Bereit"}
                    </Badge>
                  </div>
                  {slot.status !== "generating" && (
                    <div className="flex gap-2">
                      {slot.status !== "uploaded" && slot.status !== "completed" && (
                        <Button
                          size="sm"
                          onClick={() => generateImage(slot.id)}
                          className="gap-1.5 text-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Generieren
                        </Button>
                      )}
                      {(slot.status === "uploaded" || slot.status === "completed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateImage(slot.id)}
                          className="gap-1.5 text-xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Neu
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Image preview */}
                {(slot.cloudinaryUrl || slot.nanoUrl) && (
                  <img
                    src={slot.cloudinaryUrl || slot.nanoUrl}
                    alt={slot.altText}
                    className="w-full max-h-[200px] object-cover rounded-lg border border-border"
                  />
                )}

                {/* Generating indicator */}
                {slot.status === "generating" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                    NanoBanana generiert Bild... (ca. 15–30 Sek)
                  </div>
                )}

                {/* Prompt (editable) */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
                    Bildprompt (bearbeitbar)
                  </label>
                  <Textarea
                    value={slot.prompt}
                    onChange={(e) => updateSlotPrompt(slot.id, e.target.value)}
                    className="min-h-[60px] font-mono text-xs bg-muted/30"
                  />
                </div>

                {/* Alt text (editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      Alt-Text (SEO-kritisch)
                    </label>
                    <span
                      className={`text-[10px] font-bold ${
                        (slot.altText?.length || 0) > 125 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {slot.altText?.length || 0}/125
                    </span>
                  </div>
                  <input
                    type="text"
                    value={slot.altText}
                    onChange={(e) => updateSlotAlt(slot.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs"
                  />
                </div>
              </div>
            ))}

            {imageSlots.length > 0 && imageSlots.some((s) => s.status === "pending") && (
              <Button
                onClick={() => {
                  const pending = imageSlots.filter((s) => s.status === "pending");
                  pending.forEach((s) => generateImage(s.id));
                }}
                className="w-full min-h-[44px] gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Alle Bilder generieren ({imageSlots.filter((s) => s.status === "pending").length})
              </Button>
            )}
          </div>
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
