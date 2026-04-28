import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles, Loader2, Star, Save, Copy, RefreshCw, Pencil,
  Smartphone, Tablet, Monitor, AlertTriangle, Wand2, Download,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useComponentJob } from "@/hooks/useComponentJob";
import { TemplatePickerDialog } from "./TemplatePickerDialog";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { DesignConsultDialog, type DesignProposal } from "./DesignConsultDialog";
import {
  STUDIO_COMPONENT_TYPES,
  STUDIO_PHILOSOPHIES,
  getPhilosophyById,
} from "./designPhilosophies";
import type { DesignTemplate } from "@/types/studio";

interface BrandKitLite {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  logo_alt: string | null;
}

interface Props {
  firmId: string | null;
  brandKits: BrandKitLite[];
  activeBrandKit: BrandKitLite | null;
  firmName?: string;
  branche?: string;
}

const PROGRESS_STEPS: { at: number; label: string }[] = [
  { at: 0,  label: "Prompt wird aufgebaut…" },
  { at: 3,  label: "Design wird analysiert…" },
  { at: 6,  label: "Komponente wird generiert…" },
  { at: 15, label: "Qualitäts-Check…" },
  { at: 20, label: "Wird gespeichert…" },
];

export function ComponentsTabV2({ firmId, brandKits, activeBrandKit, firmName, branche }: Props) {
  /* Form state */
  const [componentType, setComponentType] = useState("header");
  const [philosophy, setPhilosophy] = useState("trust_classic");
  const [useCustom, setUseCustom] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [variant, setVariant] = useState("standard");
  const [name, setName] = useState("Mein Header");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  /* Result */
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [resultCss, setResultCss] = useState<string | null>(null);
  const [resultJs, setResultJs] = useState<string | null>(null);
  const [qaScore, setQaScore] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  /* UI */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<375 | 768 | 1200>(1200);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);

  const { triggerGeneration, isGenerating, error, cancel } = useComponentJob();

  /* Update variant when type changes */
  const variants = useMemo(
    () => STUDIO_COMPONENT_TYPES.find((t) => t.id === componentType)?.variants ?? ["standard"],
    [componentType],
  );
  useEffect(() => {
    if (!variants.includes(variant)) setVariant(variants[0]);
  }, [variants, variant]);

  /* Timer */
  useEffect(() => {
    if (!isGenerating) {
      startedRef.current = null;
      setElapsed(0);
      return;
    }
    startedRef.current = Date.now();
    const id = setInterval(() => {
      if (startedRef.current) {
        setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
      }
    }, 250);
    return () => clearInterval(id);
  }, [isGenerating]);

  const currentStepIndex = useMemo(() => {
    let idx = 0;
    PROGRESS_STEPS.forEach((s, i) => { if (elapsed >= s.at) idx = i; });
    return idx;
  }, [elapsed]);

  const handleLoadTemplate = (t: DesignTemplate) => {
    setComponentType(t.component_type);
    if (t.variant) setVariant(t.variant);
    if (t.design_philosophy) setPhilosophy(t.design_philosophy);
    setName(t.name);
    setTemplateHtml(t.html_output);
    setTemplateId(t.id);
    if (t.html_output) setResultHtml(t.html_output);
    if (t.css_output) setResultCss(t.css_output);
    if (t.js_output) setResultJs(t.js_output);
    if (t.qa_score) setQaScore(t.qa_score);
    setPickerOpen(false);
    toast.success(`Vorlage „${t.name}" geladen`);
  };

  const handleGenerate = async () => {
    if (!firmId) {
      toast.error("Keine Firma zugeordnet");
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      toast.error("Nicht angemeldet");
      return;
    }

    setResultHtml(null); setResultCss(null); setResultJs(null);
    setQaScore(null); setTokens(null); setWarnings([]);

    try {
      const job = await triggerGeneration({
        componentType,
        variant,
        name,
        description: customDescription || undefined,
        prompt: extraPrompt || undefined,
        designPhilosophy: philosophy,
        designPhilosophyCustom: useCustom ? customDescription : undefined,
        brandKit: activeBrandKit ? { ...activeBrandKit } as Record<string, unknown> : undefined,
        brandKitId: activeBrandKit?.id,
        templateId: templateId ?? undefined,
        templateHtml: templateHtml ?? undefined,
        firmId,
        userId,
        firm: firmName ?? "",
        branche: branche ?? "hausgeraete",
      });

      if (job.status === "completed") {
        setResultHtml(job.html_output);
        setResultCss(job.css_output);
        setResultJs(job.js_output);
        setQaScore(job.qa_score);
        setTokens(job.tokens_used ?? null);
        setWarnings(job.warnings ?? []);
        toast.success("Komponente generiert ✓");
      } else if (job.status === "error") {
        toast.error(job.error_message ?? "Generierung fehlgeschlagen");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Fehler bei der Generierung");
    }
  };

  /* Preview srcdoc */
  const previewSrcDoc = useMemo(() => {
    if (!resultHtml) return "";
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:system-ui,sans-serif}${resultCss ?? ""}</style>
</head><body>${resultHtml}<script>${resultJs ?? ""}<\/script></body></html>`;
  }, [resultHtml, resultCss, resultJs]);

  return (
    <div className="space-y-6">
      {/* CONTROL PANEL */}
      <div className="border border-mc-border bg-mc-panel rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Komponenten-Typ">
            <Select value={componentType} onValueChange={setComponentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STUDIO_COMPONENT_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Variante">
            <Select value={variant} onValueChange={setVariant}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Design-Stil">
            <Select value={philosophy} onValueChange={setPhilosophy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUDIO_PHILOSOPHIES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="flex gap-0.5">
                        {p.colors.map((c, i) => (
                          <span key={i} className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: c }} />
                        ))}
                      </span>
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs mt-2 cursor-pointer">
              <Checkbox checked={useCustom} onCheckedChange={(v) => setUseCustom(Boolean(v))} />
              Custom-Beschreibung
            </label>
          </Field>

          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mein Header" />
          </Field>
        </div>

        {useCustom && (
          <div className="mt-4">
            <Label className="text-xs uppercase tracking-wider text-mc-accent">
              Eigener Stil
            </Label>
            <Textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              rows={3}
              placeholder="z.B. Luxuriöser Goldton auf tiefem Schwarz, große elegante Serifen-Schrift, subtile Partikel-Animation im Hintergrund"
            />
          </div>
        )}

        <div className="mt-4">
          <Label className="text-xs uppercase tracking-wider text-mc-accent">
            Zusatz-Prompt
          </Label>
          <Textarea
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
            rows={2}
            placeholder="Optional: zusätzliche Anweisungen…"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Button variant="outline" onClick={() => setPickerOpen(true)} className="gap-2">
            <Star className="h-4 w-4" /> Aus Vorlage laden
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !firmId} className="gap-2">
            {isGenerating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird generiert… ({formatTime(elapsed)})</>
              : <><Sparkles className="h-4 w-4" /> Generieren</>}
          </Button>
          {isGenerating && (
            <Button variant="ghost" onClick={cancel} className="text-xs">Abbrechen</Button>
          )}
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="mt-5 border border-mc-border rounded p-3 bg-mc-bg space-y-1.5">
            {PROGRESS_STEPS.map((s, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <div
                  key={s.at}
                  className={`flex items-center gap-2 text-xs ${
                    done ? "text-mc-green" : active ? "text-mc-accent" : "text-muted-foreground"
                  }`}
                >
                  <span>{done ? "◉" : active ? "◉" : "◎"}</span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {error && !isGenerating && (
          <div className="mt-4 border border-mc-red/50 bg-mc-red/10 text-mc-red rounded p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Generierung fehlgeschlagen</div>
              <div className="opacity-80">{error}</div>
            </div>
            <Button size="sm" variant="outline" onClick={handleGenerate}>
              <RefreshCw className="h-3 w-3 mr-1" /> Erneut versuchen
            </Button>
          </div>
        )}
      </div>

      {/* RESULT AREA */}
      {resultHtml && (
        <div className="border border-mc-border bg-mc-panel rounded-lg overflow-hidden">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="m-3">
              <TabsTrigger value="preview">Vorschau</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="settings">Einstellungen</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="px-3 pb-3">
              <div className="flex gap-1 mb-2">
                <ResponsiveBtn icon={Smartphone} label="375"  active={previewWidth === 375}  onClick={() => setPreviewWidth(375)} />
                <ResponsiveBtn icon={Tablet}     label="768"  active={previewWidth === 768}  onClick={() => setPreviewWidth(768)} />
                <ResponsiveBtn icon={Monitor}    label="1200" active={previewWidth === 1200} onClick={() => setPreviewWidth(1200)} />
              </div>
              <div className="border border-mc-border rounded bg-white flex justify-center overflow-auto">
                <iframe
                  title="Komponenten-Vorschau"
                  srcDoc={previewSrcDoc}
                  style={{ width: previewWidth, height: 560, border: "none" }}
                />
              </div>
            </TabsContent>

            <TabsContent value="code" className="px-3 pb-3">
              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="js">JS</TabsTrigger>
                </TabsList>
                {(["html", "css", "js"] as const).map((kind) => {
                  const code =
                    kind === "html" ? resultHtml ?? "" :
                    kind === "css"  ? resultCss  ?? "" :
                                       resultJs  ?? "";
                  return (
                    <TabsContent key={kind} value={kind}>
                      <div className="relative">
                        <Button
                          size="sm" variant="outline"
                          className="absolute top-2 right-2 z-10 gap-1 h-7 text-xs"
                          onClick={() => {
                            void navigator.clipboard.writeText(code);
                            toast.success("Kopiert");
                          }}
                        >
                          <Copy className="h-3 w-3" /> Kopieren
                        </Button>
                        <pre className="bg-mc-bg border border-mc-border font-mono text-xs p-4 rounded overflow-x-auto max-h-[60vh]">
                          <code>{code || "// leer"}</code>
                        </pre>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </TabsContent>

            <TabsContent value="settings" className="px-3 pb-3 text-xs text-muted-foreground">
              Konfigurations-Felder folgen je nach Komponenten-Typ.
            </TabsContent>
          </Tabs>

          {/* Action bar */}
          <div className="border-t border-mc-border px-4 py-3 flex flex-wrap items-center gap-3 bg-mc-bg">
            <Stat label="QA" value={qaScore != null ? `${qaScore}%` : "—"} ok={(qaScore ?? 0) >= 85} />
            <Stat label="Tokens" value={tokens != null ? `${(tokens / 1000).toFixed(1)}k` : "—"} />
            <Stat label="Zeit" value={`${elapsed}s`} />
            <div className="flex-1" />
            <Button size="sm" onClick={() => setSaveOpen(true)} className="gap-2">
              <Save className="h-3.5 w-3.5" /> Als Vorlage speichern
            </Button>
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isGenerating} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Regenerieren
            </Button>
            <Button size="sm" variant="outline" onClick={() => setUseCustom(true)} className="gap-2">
              <Pencil className="h-3.5 w-3.5" /> Anpassen
            </Button>
          </div>

          {warnings.length > 0 && (
            <div className="border-t border-mc-border px-4 py-2 text-[11px] text-mc-yellow">
              {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}
        </div>
      )}

      <TemplatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        firmId={firmId}
        onPick={handleLoadTemplate}
      />

      <SaveTemplateDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        firmId={firmId}
        defaults={{
          name,
          componentType,
          variant,
          designPhilosophy: philosophy,
          htmlOutput: resultHtml,
          cssOutput: resultCss,
          jsOutput: resultJs,
          qaScore: qaScore ?? 0,
          designData: { mood: useCustom ? customDescription : undefined },
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-mc-accent mb-1 block">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="uppercase tracking-wider text-muted-foreground">{label}:</span>
      <span className={`font-display ${ok === true ? "text-mc-green" : ok === false ? "text-mc-red" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function ResponsiveBtn({
  icon: Icon, label, active, onClick,
}: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className="h-7 px-2 text-xs gap-1"
    >
      <Icon className="h-3 w-3" /> {label}
    </Button>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
