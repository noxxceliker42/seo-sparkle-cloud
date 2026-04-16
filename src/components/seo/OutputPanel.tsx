import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Copy, ArrowLeft, RefreshCw, Monitor, Smartphone,
  ImageIcon, Sparkles, RotateCcw, ExternalLink, AlertTriangle, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface GeneratedPage {
  metaTitle: string;
  metaDesc: string;
  metaKeywords: string;
  htmlOutput: string;
  bodyContent: string;
  cssBlock: string;
  jsonLd: string;
  masterPrompt: string;
  activeSections: string[];
  firmName?: string;
  street?: string;
  city?: string;
  phone?: string;
  pageId?: string;
  keyword?: string;
  tokensUsed?: number;
  duration?: number;
  stopReason?: string;
}

interface OutputPanelProps {
  page: GeneratedPage;
  onBack: () => void;
  onNewPage: () => void;
}

type SlotStatus = "pending" | "generating" | "completed" | "uploaded" | "failed" | "approved";

interface ImageSlot {
  id: string;
  slot: string;
  slotLabel: string;
  prompt: string;
  altText: string;
  width: number;
  height: number;
  status: SlotStatus;
  cloudinaryUrl?: string;
  nanoUrl?: string;
  isNbSlot?: boolean;
}

function toSlotStatus(s: string): SlotStatus {
  const valid: SlotStatus[] = ["pending", "generating", "completed", "uploaded", "failed", "approved"];
  return valid.includes(s as SlotStatus) ? (s as SlotStatus) : "pending";
}

/** Parse nb-image-slot elements from HTML */
function parseNbSlots(html: string): ImageSlot[] {
  const slots: ImageSlot[] = [];
  const regex = /<img[^>]*class="[^"]*nb-image-slot[^"]*"[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const getAttr = (name: string) => {
      const m = tag.match(new RegExp(`${name}="([^"]*)"`));
      return m ? m[1] : "";
    };
    const slot = getAttr("data-nb-slot") || `slot-${slots.length}`;
    const prompt = getAttr("data-nb-prompt");
    const width = parseInt(getAttr("data-nb-width")) || 800;
    const height = parseInt(getAttr("data-nb-height")) || 450;
    const alt = getAttr("alt");
    const label = slot.replace(/^section-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    slots.push({
      id: `nb-${slot}`,
      slot,
      slotLabel: label,
      prompt,
      altText: alt,
      width,
      height,
      status: "pending",
      isNbSlot: true,
    });
  }
  return slots;
}

const SECTION_LABELS: Record<string, string> = {
  "01": "Hero", "02": "Problem", "03": "TOC", "04": "Symptome", "05": "Selbsthilfe",
  "06": "Fehlercodes", "07": "Unique Data", "08": "Information Gain", "09": "Ablauf",
  "10": "Preise", "11": "Rep-vs-Neukauf", "12": "Qualität", "13": "Marken", "14": "FAQ", "15": "Autor+Kontakt",
};

type TabId = "html" | "body" | "meta" | "jsonld" | "css" | "prompt" | "preview" | "images";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function QaCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {passed ? <Check className="h-4 w-4 text-green-600 shrink-0" /> : <X className="h-4 w-4 text-red-500 shrink-0" />}
      <span className={passed ? "text-foreground" : "text-red-600 font-medium"}>{label}</span>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="gap-1.5 text-xs min-h-[36px]"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Kopiert!" : label}
    </Button>
  );
}

function CharCounter({ current, max, optimal }: { current: number; max: number; optimal?: [number, number] }) {
  let color = "text-green-600";
  if (current > max) color = "text-red-600";
  else if (optimal && (current < optimal[0] || current > optimal[1])) color = "text-amber-600";
  return <span className={`text-xs font-bold ${color}`}>{current}/{max}</span>;
}

export function OutputPanel({ page, onBack, onNewPage }: OutputPanelProps) {
  const [tab, setTab] = useState<TabId>("html");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsAnalyzed, setSlotsAnalyzed] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slotPollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const htmlComplete = page.htmlOutput.trim().endsWith("</html>");

  // --- Image slot logic (kept from original) ---
  useEffect(() => {
    if (tab !== "images" || slotsAnalyzed || !page.pageId || !page.htmlOutput) return;
    async function analyzeSlots() {
      setSlotsLoading(true);
      try {
        const { data: existing } = await supabase
          .from("page_images")
          .select("id, slot, slot_label, nano_prompt, alt_text, width, height, nano_status, cloudinary_url, nano_url")
          .eq("page_id", page.pageId!);
        if (existing && existing.length > 0) {
          setImageSlots(existing.map((r: any) => ({
            id: r.id, slot: r.slot, slotLabel: r.slot_label || r.slot,
            prompt: r.nano_prompt || "", altText: r.alt_text || "",
            width: r.width || 800, height: r.height || 450,
            status: r.nano_status || "pending",
            cloudinaryUrl: r.cloudinary_url, nanoUrl: r.nano_url,
          })));
          setSlotsAnalyzed(true); setSlotsLoading(false); return;
        }
        const { data, error } = await supabase.functions.invoke("analyze-image-slots", {
          body: { pageId: page.pageId, html: page.htmlOutput, keyword: page.keyword || "", firm: page.firmName || "", city: page.city || "" },
        });
        if (!error && data?.slots) setImageSlots(data.slots);
        setSlotsAnalyzed(true);
      } catch (err) { console.error("Slot analysis error:", err); }
      setSlotsLoading(false);
    }
    analyzeSlots();
  }, [tab, slotsAnalyzed, page.pageId, page.htmlOutput, page.keyword, page.firmName, page.city]);

  useEffect(() => {
    const generating = imageSlots.filter((s) => s.status === "generating");
    if (generating.length === 0) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollingRef.current = setInterval(async () => {
      for (const slot of generating) {
        const { data } = await supabase.from("page_images")
          .select("nano_status, cloudinary_url, nano_url, alt_text").eq("id", slot.id).single();
        if (!data) continue;
        if (["uploaded", "completed", "failed"].includes(data.nano_status!)) {
          setImageSlots((prev) => prev.map((s) => s.id === slot.id ? {
            ...s, status: data.nano_status!, cloudinaryUrl: data.cloudinary_url || undefined,
            nanoUrl: data.nano_url || undefined, altText: data.alt_text || s.altText,
          } : s));
        }
      }
    }, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [imageSlots]);

  useEffect(() => { return () => { Object.values(slotPollRefs.current).forEach(clearInterval); }; }, []);

  const generateImage = useCallback(async (slotId: string) => {
    const slot = imageSlots.find((s) => s.id === slotId);
    if (!slot) return;
    setImageSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: "generating" } : s)));
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.functions.invoke("start-image", {
        body: { prompt: slot.prompt, pageId: page.pageId || null, slot: slot.slot, userId: user?.id },
      });
      if (error || data?.error) {
        setImageSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: "failed" } : s)));
        return;
      }
      if (data.status === "completed" && data.imageUrl) {
        setImageSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, status: "completed", nanoUrl: data.imageUrl } : s));
        await supabase.from("page_images").update({ nano_url: data.imageUrl, nano_status: "completed" }).eq("id", slotId);
        return;
      }
      const jobId = data.jobId; const taskId = data.taskId; let attempts = 0;
      if (slotPollRefs.current[slotId]) clearInterval(slotPollRefs.current[slotId]);
      slotPollRefs.current[slotId] = setInterval(async () => {
        attempts++;
        if (attempts > 20) {
          clearInterval(slotPollRefs.current[slotId]); delete slotPollRefs.current[slotId];
          setImageSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: "failed" } : s)));
          return;
        }
        try {
          const { data: checkData } = await supabase.functions.invoke("check-image", { body: { jobId, taskId } });
          if (checkData?.status === "completed" && checkData?.imageUrl) {
            clearInterval(slotPollRefs.current[slotId]); delete slotPollRefs.current[slotId];
            setImageSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, status: "completed", nanoUrl: checkData.imageUrl } : s));
            await supabase.from("page_images").update({ nano_url: checkData.imageUrl, nano_status: "completed" }).eq("id", slotId);
          }
          if (checkData?.status === "failed") {
            clearInterval(slotPollRefs.current[slotId]); delete slotPollRefs.current[slotId];
            setImageSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: "failed" } : s)));
          }
        } catch {}
      }, 3000);
    } catch {
      setImageSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: "failed" } : s)));
    }
  }, [imageSlots, page.pageId]);

  const updateSlotPrompt = useCallback(async (slotId: string, prompt: string) => {
    setImageSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, prompt } : s)));
    await supabase.from("page_images").update({ nano_prompt: prompt }).eq("id", slotId);
  }, []);

  const updateSlotAlt = useCallback(async (slotId: string, altText: string) => {
    setImageSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, altText } : s)));
    await supabase.from("page_images").update({ alt_text: altText }).eq("id", slotId);
  }, []);

  // --- QA checks ---
  const qaChecks = useMemo(() => {
    const html = page.htmlOutput.toLowerCase();
    const sectionsPresent = page.activeSections.every((id) => {
      const label = SECTION_LABELS[id]?.toLowerCase() || "";
      return html.includes("section") || html.includes(label) || html.includes(`id="${id}"`) || html.includes(`id="section-${id}"`);
    });
    const imagesHaveSize = !html.includes("<img") || (html.includes("width=") && html.includes("height="));
    const hasJsonLd = html.includes("application/ld+json") || page.jsonLd.length > 10;
    const napConsistent = (() => {
      if (!page.firmName) return true;
      return (html + page.jsonLd.toLowerCase()).includes(page.firmName.toLowerCase());
    })();
    const hasMaxImagePreview = html.includes("max-image-preview");
    const bodyExtracted = (page.bodyContent?.length || 0) > 50;
    const titleOk = page.metaTitle.length > 0 && page.metaTitle.length <= 60;
    const descOk = page.metaDesc.length >= 140 && page.metaDesc.length <= 155;
    return { sectionsPresent, htmlComplete, imagesHaveSize, hasJsonLd, napConsistent, hasMaxImagePreview, bodyExtracted, titleOk, descOk };
  }, [page, htmlComplete]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "html", label: "HTML (vollständig)" },
    { id: "body", label: "Body-Content" },
    { id: "meta", label: "Meta-Block" },
    { id: "jsonld", label: "JSON-LD Schema" },
    { id: "css", label: "CSS / Styles" },
    { id: "prompt", label: "Master-Prompt" },
    { id: "preview", label: "Vorschau" },
    { id: "images", label: "🖼 Bilder" },
  ];

  const generatingCount = imageSlots.filter((s) => s.status === "generating").length;
  const uploadedCount = imageSlots.filter((s) => ["uploaded", "completed"].includes(s.status)).length;

  const openInNewTab = () => {
    const blob = new Blob([page.htmlOutput], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
          <h2 className="text-lg font-bold text-foreground">Output — Generierte SEO-Seite</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>64.000 Tokens verfügbar</span>
          <span className="text-foreground font-bold">·</span>
          {page.tokensUsed ? (
            <Badge variant="secondary" className="text-xs">{page.tokensUsed.toLocaleString()} genutzt</Badge>
          ) : null}
          {page.duration ? (
            <Badge variant="outline" className="text-xs">{page.duration} Sek</Badge>
          ) : null}
          {page.stopReason && page.stopReason !== "end_turn" ? (
            <Badge variant="destructive" className="text-xs">Stop: {page.stopReason}</Badge>
          ) : null}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.id === "images" && imageSlots.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">{uploadedCount}/{imageSlots.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-3">
        {/* TAB 1: HTML */}
        {tab === "html" && (
          <>
            {!htmlComplete && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                ⚠ HTML möglicherweise unvollständig — endet nicht mit &lt;/html&gt;
              </div>
            )}
            <div className="flex items-center gap-2">
              <CopyButton text={page.htmlOutput} label="HTML kopieren" />
              {page.tokensUsed ? <Badge variant="secondary">{page.tokensUsed.toLocaleString()} Tokens</Badge> : null}
              {page.duration ? <Badge variant="outline">{page.duration} Sek</Badge> : null}
            </div>
            <Textarea readOnly value={page.htmlOutput} className="min-h-[400px] font-mono text-xs" />
          </>
        )}

        {/* TAB 2: Body-Content */}
        {tab === "body" && (
          <>
            <InfoBox>
              Direkt in CMS-Artikelbereich einfügen. Kein &lt;html&gt;, &lt;head&gt; oder &lt;body&gt; nötig.
            </InfoBox>
            <CopyButton text={page.bodyContent || ""} label="Body kopieren" />
            <Textarea readOnly value={page.bodyContent || ""} className="min-h-[400px] font-mono text-xs" />
          </>
        )}

        {/* TAB 3: Meta-Block */}
        {tab === "meta" && (
          <div className="space-y-4">
            {/* SEO-Titel */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">SEO-Titel</label>
                <CharCounter current={page.metaTitle.length} max={60} />
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={page.metaTitle} className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono" />
                <CopyButton text={page.metaTitle} label="Kopieren" />
              </div>
            </div>

            {/* Meta-Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Meta-Description</label>
                <CharCounter current={page.metaDesc.length} max={155} optimal={[140, 155]} />
              </div>
              <div className="flex items-center gap-2">
                <Textarea readOnly value={page.metaDesc} className="flex-1 min-h-[60px] font-mono text-sm" />
                <CopyButton text={page.metaDesc} label="Kopieren" />
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Keywords</label>
              <div className="flex items-center gap-2">
                <input readOnly value={page.metaKeywords} className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono" />
                <CopyButton text={page.metaKeywords} label="Kopieren" />
              </div>
            </div>

            {/* SERP-Vorschau */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">SERP-Vorschau</h4>
              <p className="text-[13px] text-green-700 dark:text-green-400 truncate">
                {page.firmName ? `${page.firmName.toLowerCase().replace(/\s+/g, "-")}.de` : "example.de"} › {page.keyword?.toLowerCase().replace(/\s+/g, "-") || "seite"}
              </p>
              <p className={`text-lg font-medium leading-snug ${page.metaTitle.length > 60 ? "text-red-600" : "text-blue-700 dark:text-blue-400"}`}>
                {page.metaTitle || "Kein Title vorhanden"}
              </p>
              <p className={`text-sm mt-0.5 ${page.metaDesc.length > 155 ? "text-red-600" : "text-muted-foreground"}`}>
                {page.metaDesc || "Keine Description vorhanden"}
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: JSON-LD Schema */}
        {tab === "jsonld" && (
          <>
            {!page.jsonLd ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" /> JSON-LD nicht generiert
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <CopyButton text={page.jsonLd} label="Schema kopieren" />
                  <Button
                    variant="outline" size="sm" className="gap-1.5 text-xs min-h-[36px]"
                    onClick={() => window.open("https://validator.schema.org/", "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Schema validieren
                  </Button>
                </div>
                <InfoBox>Diesen Block in den &lt;head&gt; der Seite einfügen.</InfoBox>
                <Textarea readOnly value={page.jsonLd} className="min-h-[300px] font-mono text-xs" />
              </>
            )}
          </>
        )}

        {/* TAB 5: CSS / Styles */}
        {tab === "css" && (
          <>
            <InfoBox>Für externe Stylesheets oder CMS-eigene CSS-Verwaltung.</InfoBox>
            {page.cssBlock ? (
              <>
                <CopyButton text={page.cssBlock} label="CSS kopieren" />
                <Textarea readOnly value={page.cssBlock} className="min-h-[300px] font-mono text-xs" />
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Kein separater CSS-Block extrahiert — CSS ist inline im HTML.
              </div>
            )}
          </>
        )}

        {/* TAB 6: Master-Prompt */}
        {tab === "prompt" && (
          <>
            {page.masterPrompt ? (
              <>
                <InfoBox>Der exakte Prompt der für diese Seite genutzt wurde.</InfoBox>
                <CopyButton text={page.masterPrompt} label="Prompt kopieren" />
                <Textarea readOnly value={page.masterPrompt} className="min-h-[400px] font-mono text-xs" />
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Prompt nicht gespeichert
              </div>
            )}
          </>
        )}

        {/* TAB 7: Vorschau */}
        {tab === "preview" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Button variant={previewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("desktop")} className="gap-2">
                <Monitor className="h-4 w-4" /> Desktop
              </Button>
              <Button variant={previewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("mobile")} className="gap-2">
                <Smartphone className="h-4 w-4" /> Mobile
              </Button>
              <Button variant="outline" size="sm" onClick={openInNewTab} className="gap-2 ml-auto">
                <ExternalLink className="h-4 w-4" /> In neuem Tab öffnen
              </Button>
            </div>
            <InfoBox>Externe Bilder/Fonts nicht geladen in Vorschau.</InfoBox>
            <div className="rounded-lg border border-border overflow-hidden h-[600px] bg-muted/30">
              {page.htmlOutput ? (
                <iframe
                  srcDoc={page.htmlOutput.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim()}
                  className={`h-full border-none ${previewMode === "mobile" ? "w-[375px] mx-auto block" : "w-full"}`}
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

        {/* TAB 8: Images */}
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
                {generatingCount} {generatingCount === 1 ? "Bild wird" : "Bilder werden"} generiert...
              </div>
            )}
            {imageSlots.map((slot) => (
              <div key={slot.id} className={`rounded-xl border p-4 space-y-3 ${
                ["uploaded", "completed"].includes(slot.status) ? "border-green-200 bg-green-50/50"
                : slot.status === "failed" ? "border-red-200 bg-red-50/50" : "border-border bg-card"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{slot.slotLabel}</span>
                    <Badge variant={["uploaded","completed"].includes(slot.status) ? "default" : slot.status === "generating" ? "secondary" : slot.status === "failed" ? "destructive" : "outline"} className="text-[10px]">
                      {["uploaded","completed"].includes(slot.status) ? "✓ Fertig" : slot.status === "generating" ? "⏳ Generiert..." : slot.status === "failed" ? "✗ Fehler" : "● Bereit"}
                    </Badge>
                  </div>
                  {slot.status !== "generating" && (
                    <Button size="sm" variant={["uploaded","completed"].includes(slot.status) ? "outline" : "default"} onClick={() => generateImage(slot.id)} className="gap-1.5 text-xs">
                      {["uploaded","completed"].includes(slot.status) ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {["uploaded","completed"].includes(slot.status) ? "Neu" : "Generieren"}
                    </Button>
                  )}
                </div>
                {(slot.cloudinaryUrl || slot.nanoUrl) && (
                  <img src={slot.cloudinaryUrl || slot.nanoUrl} alt={slot.altText} className="w-full max-h-[200px] object-cover rounded-lg border border-border" />
                )}
                {slot.status === "generating" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" /> NanoBanana generiert Bild...
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Bildprompt (bearbeitbar)</label>
                  <Textarea value={slot.prompt} onChange={(e) => updateSlotPrompt(slot.id, e.target.value)} className="min-h-[60px] font-mono text-xs bg-muted/30" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Alt-Text</label>
                    <span className={`text-[10px] font-bold ${(slot.altText?.length || 0) > 125 ? "text-red-600" : "text-green-600"}`}>{slot.altText?.length || 0}/125</span>
                  </div>
                  <input type="text" value={slot.altText} onChange={(e) => updateSlotAlt(slot.id, e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs" />
                </div>
              </div>
            ))}
            {imageSlots.length > 0 && imageSlots.some((s) => s.status === "pending") && (
              <Button onClick={() => imageSlots.filter((s) => s.status === "pending").forEach((s) => generateImage(s.id))} className="w-full min-h-[44px] gap-2">
                <Sparkles className="h-4 w-4" /> Alle Bilder generieren ({imageSlots.filter((s) => s.status === "pending").length})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Post-QA Check */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Post-QA Check</h3>
        <QaCheck passed={qaChecks.sectionsPresent} label="HTML enthält alle aktiven Sektionen" />
        <QaCheck passed={qaChecks.htmlComplete} label="HTML vollständig (endet mit </html>)" />
        <QaCheck passed={qaChecks.imagesHaveSize} label="Alle Bild-Platzhalter mit width+height" />
        <QaCheck passed={qaChecks.hasJsonLd} label="JSON-LD vorhanden" />
        <QaCheck passed={qaChecks.napConsistent} label="NAP im HTML identisch mit Schema" />
        <QaCheck passed={qaChecks.hasMaxImagePreview} label="HTML hat meta max-image-preview:large" />
        <QaCheck passed={qaChecks.bodyExtracted} label="Body-Content extrahiert" />
        <QaCheck passed={qaChecks.titleOk} label="Meta-Title unter 60 Zeichen" />
        <QaCheck passed={qaChecks.descOk} label="Meta-Desc 140–155 Zeichen" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onNewPage} className="min-h-[44px] gap-2">
          <RefreshCw className="h-4 w-4" /> Neue Seite generieren
        </Button>
      </div>
    </div>
  );
}
