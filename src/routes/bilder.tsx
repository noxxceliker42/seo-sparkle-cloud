import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, Wand2, Download, Check, Loader2, X, Library, FileImage, Sparkles, Copy } from "lucide-react";

export const Route = createFileRoute("/bilder")({
  component: ImageStudio,
});

/* ── Types ── */

interface ImageJob {
  id: string;
  taskId: string | null;
  status: string;
  cloudinaryUrl: string | null;
  nanoUrl: string | null;
  altText: string;
  is_selected: boolean;
  variantIndex: number;
  slot: string;
  keyword?: string;
  created_at?: string;
  page_id?: string;
  html_inserted?: boolean;
  prompt_positive?: string;
}

interface GeneratedPrompt {
  positive: string;
  negative: string;
  altText: string;
}

interface Firm {
  id: string;
  name: string;
}

interface SeoPage {
  id: string;
  keyword: string;
  created_at: string | null;
  html_output: string | null;
}

interface ImageSlot {
  slot: string;
  context: string;
  width: number;
  height: number;
}

/* ── Helpers ── */

const SLOT_LABELS: Record<string, string> = {
  hero: "Hero-Bild (1200×675px)",
  howto: "Selbsthilfe-Sektion (800×450px)",
  ablauf: "Ablauf vor Ort (800×450px)",
  unique: "Unsere Praxis (800×450px)",
  autor: "Autorportrait (80×80px)",
  free: "Freies Bild",
};

const FORMAT_OPTIONS = [
  { id: "hero", label: "Hero 1200×675", w: 1200, h: 675 },
  { id: "section", label: "Sektion 800×450", w: 800, h: 450 },
  { id: "square", label: "Quadrat 512×512", w: 512, h: 512 },
];

/* ── Component ── */

function ImageStudio() {
  const { user } = useAuth();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmId, setFirmId] = useState<string>("");

  useEffect(() => {
    supabase
      .from("firms")
      .select("id, name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setFirms(data);
          setFirmId(data[0].id);
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="h-6 w-6" /> Bild-Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            KI-Bilder generieren, verwalten und in Seiten einbauen
          </p>
        </div>
        {firms.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Firma:</Label>
            <Select value={firmId} onValueChange={setFirmId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {firms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs defaultValue="free" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="free" className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Freie Generierung
          </TabsTrigger>
          <TabsTrigger value="page" className="flex items-center gap-1.5">
            <FileImage className="h-3.5 w-3.5" /> Seitenbezogen
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-1.5">
            <Library className="h-3.5 w-3.5" /> Bibliothek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="free">
          <FreeGenerationTab userId={user?.id || ""} firmId={firmId} />
        </TabsContent>
        <TabsContent value="page">
          <PageBoundTab userId={user?.id || ""} firmId={firmId} />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab firmId={firmId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ══════════════════════════════════════ */
/*  TAB 1: Freie Generierung             */
/* ══════════════════════════════════════ */

function FreeGenerationTab({ userId, firmId }: { userId: string; firmId: string }) {
  const [userContext, setUserContext] = useState("");
  const [format, setFormat] = useState(FORMAT_OPTIONS[0]);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt>({ positive: "", negative: "", altText: "" });
  const [promptReady, setPromptReady] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    return () => {
      pollRefs.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  const generatePrompt = async () => {
    if (!userContext.trim()) return;
    setIsGeneratingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image-prompt", {
        body: {
          sectionText: userContext,
          sectionType: "free",
          keyword: userContext.slice(0, 50),
          firmId,
          slot: format.id === "hero" ? "hero" : "free",
          width: format.w,
          height: format.h,
        },
      });
      if (error) throw error;
      setGeneratedPrompt({
        positive: data.positive || "",
        negative: data.negative || "",
        altText: data.altText || "",
      });
      setPromptReady(true);
      toast.success("Prompt generiert");
    } catch (err) {
      toast.error("Prompt-Generierung fehlgeschlagen: " + (err as Error).message);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const generateThreeVariants = async () => {
    setIsGenerating(true);
    setJobs([]);

    try {
      const results = await Promise.all(
        [0, 1, 2].map(() =>
          supabase.functions.invoke("start-image", {
            body: {
              promptPositive: generatedPrompt.positive,
              promptNegative: generatedPrompt.negative,
              width: format.w,
              height: format.h,
              slot: format.id === "hero" ? "hero" : "free",
              firmId,
              altText: generatedPrompt.altText,
              userId,
              keyword: userContext.slice(0, 40),
            },
          })
        )
      );

      const newJobs: ImageJob[] = results.map((r, i) => ({
        id: r.data?.jobId || `temp-${i}`,
        taskId: r.data?.taskId || null,
        status: r.data?.status || "generating",
        cloudinaryUrl: r.data?.cloudinaryUrl || null,
        nanoUrl: null,
        altText: generatedPrompt.altText,
        is_selected: false,
        variantIndex: i,
        slot: format.id === "hero" ? "hero" : "free",
      }));

      setJobs(newJobs);

      // Start polling for generating jobs
      newJobs.forEach((job) => {
        if (job.status === "completed" || !job.taskId) return;
        const interval = setInterval(async () => {
          const { data } = await supabase.functions.invoke("check-image", {
            body: { jobId: job.id, taskId: job.taskId, slot: job.slot, keyword: userContext.slice(0, 40) },
          });
          if (data?.status === "completed") {
            clearInterval(interval);
            pollRefs.current.delete(job.id);
            setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "completed", cloudinaryUrl: data.cloudinaryUrl } : j)));
          }
          if (data?.status === "failed") {
            clearInterval(interval);
            pollRefs.current.delete(job.id);
            setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "failed" } : j)));
          }
        }, 3000);
        pollRefs.current.set(job.id, interval);
      });
    } catch (err) {
      toast.error("Generierung fehlgeschlagen: " + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectVariant = (selectedJobId: string) => {
    setJobs((prev) => prev.map((j) => ({ ...j, is_selected: j.id === selectedJobId })));
    // Archive non-selected
    jobs.forEach((j) => {
      if (j.id !== selectedJobId && j.status === "completed") {
        supabase.from("image_jobs").update({ status: "archived" }).eq("id", j.id);
      }
    });
    supabase.from("image_jobs").update({ is_selected: true }).eq("id", selectedJobId);
    toast.success("Variante ausgewählt");
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Format Selection */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">FORMAT</Label>
        <div className="flex gap-2">
          {FORMAT_OPTIONS.map((f) => (
            <Button
              key={f.id}
              variant={format.id === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFormat(f)}
              className="text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Context Input */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">KONTEXT</Label>
        <Textarea
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          placeholder="Was soll das Bild zeigen? z.B. 'Miele Waschmaschine mit Fehlercode F20, Berliner Wohnung, Badezimmer'"
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Generate Prompt Button */}
      <Button onClick={generatePrompt} disabled={!userContext.trim() || isGeneratingPrompt} className="w-full">
        {isGeneratingPrompt ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Claude schreibt Prompt...</>
        ) : (
          <><Wand2 className="h-4 w-4 mr-2" /> Prompt von Claude generieren</>
        )}
      </Button>

      {/* Prompt Display (editable) */}
      {promptReady && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-[10px] font-bold text-primary uppercase">Positiver Prompt (bearbeitbar)</Label>
              <Textarea
                value={generatedPrompt.positive}
                onChange={(e) => setGeneratedPrompt((p) => ({ ...p, positive: e.target.value }))}
                className="mt-1 font-mono text-xs bg-primary/10 border-0 min-h-[70px]"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-destructive uppercase">Negativer Prompt (bearbeitbar)</Label>
              <Textarea
                value={generatedPrompt.negative}
                onChange={(e) => setGeneratedPrompt((p) => ({ ...p, negative: e.target.value }))}
                className="mt-1 font-mono text-xs bg-destructive/10 border-0"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-green-700 uppercase">Alt-Text (SEO — Deutsch)</Label>
                <span className={`text-[10px] font-bold ${generatedPrompt.altText.length > 125 ? "text-destructive" : "text-green-600"}`}>
                  {generatedPrompt.altText.length}/125
                </span>
              </div>
              <Input
                value={generatedPrompt.altText}
                onChange={(e) => setGeneratedPrompt((p) => ({ ...p, altText: e.target.value }))}
                className="mt-1 text-xs border-green-200"
              />
            </div>
            <Button onClick={generateThreeVariants} disabled={isGenerating} className="w-full bg-primary">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 3 Varianten werden generiert...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> 3 Varianten generieren</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Variants Display */}
      {jobs.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">VARIANTEN — BESTE AUSWÄHLEN</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobs.map((job, i) => (
              <VariantCard key={job.id} job={job} index={i} onSelect={selectVariant} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Variant Card ── */

function VariantCard({ job, index, onSelect }: { job: ImageJob; index: number; onSelect: (id: string) => void }) {
  return (
    <Card className={`overflow-hidden ${job.is_selected ? "ring-2 ring-primary" : ""}`}>
      {job.status === "generating" && (
        <div className="h-36 bg-muted flex items-center justify-center flex-col gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Variante {index + 1}...</span>
        </div>
      )}
      {job.status === "completed" && job.cloudinaryUrl && (
        <>
          <img src={job.cloudinaryUrl} alt={job.altText} className="w-full h-36 object-cover" />
          <div className="p-2 space-y-1.5">
            <Button
              size="sm"
              variant={job.is_selected ? "default" : "outline"}
              className="w-full text-xs"
              onClick={() => onSelect(job.id)}
            >
              {job.is_selected ? <><Check className="h-3 w-3 mr-1" /> Ausgewählt</> : "Auswählen"}
            </Button>
            <div className="flex gap-1">
              <a href={job.cloudinaryUrl} download target="_blank" rel="noreferrer" className="flex-1">
                <Button size="sm" variant="ghost" className="w-full text-[10px]">
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="text-[10px]"
                onClick={() => {
                  navigator.clipboard.writeText(job.cloudinaryUrl || "");
                  toast.success("URL kopiert");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}
      {job.status === "failed" && (
        <div className="h-36 bg-destructive/10 flex items-center justify-center text-xs text-destructive">
          <X className="h-4 w-4 mr-1" /> Fehlgeschlagen
        </div>
      )}
    </Card>
  );
}

/* ══════════════════════════════════════ */
/*  TAB 2: Seitenbezogen                  */
/* ══════════════════════════════════════ */

function PageBoundTab({ userId, firmId }: { userId: string; firmId: string }) {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [slotJobs, setSlotJobs] = useState<Record<string, ImageJob | null>>({});
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    supabase
      .from("seo_pages")
      .select("id, keyword, created_at, html_output")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setPages(data || []));
    return () => {
      pollRefs.current.forEach((i) => clearInterval(i));
    };
  }, []);

  const selectPage = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    const page = pages.find((p) => p.id === pageId);
    if (!page?.html_output) {
      setImageSlots([]);
      return;
    }
    // Parse data-img-slot attributes
    const matches = [...page.html_output.matchAll(/data-img-slot="([^"]+)"[^>]*data-img-context="([^"]+)"/g)];
    const slots: ImageSlot[] = matches.map((m) => {
      const dimMatch = page.html_output!.match(new RegExp(`data-img-slot="${m[1]}"[^>]*width="(\\d+)"[^>]*height="(\\d+)"`));
      return {
        slot: m[1],
        context: m[2],
        width: parseInt(dimMatch?.[1] || "800"),
        height: parseInt(dimMatch?.[2] || "450"),
      };
    });
    setImageSlots(slots);
    setSlotJobs({});
  }, [pages]);

  const generateForSlot = async (slot: ImageSlot) => {
    setLoadingSlot(slot.slot);
    const page = pages.find((p) => p.id === selectedPageId);
    try {
      // Generate prompt
      const { data: promptData } = await supabase.functions.invoke("generate-image-prompt", {
        body: {
          sectionText: slot.context,
          sectionType: slot.slot,
          keyword: page?.keyword || "",
          firmId,
          slot: slot.slot,
          width: slot.width,
          height: slot.height,
        },
      });

      // Start image generation
      const { data } = await supabase.functions.invoke("start-image", {
        body: {
          promptPositive: promptData.positive,
          promptNegative: promptData.negative,
          width: slot.width,
          height: slot.height,
          slot: slot.slot,
          pageId: selectedPageId,
          firmId,
          altText: promptData.altText,
          userId,
          keyword: page?.keyword || "",
        },
      });

      const job: ImageJob = {
        id: data.jobId,
        taskId: data.taskId,
        status: data.status || "generating",
        cloudinaryUrl: data.cloudinaryUrl || null,
        nanoUrl: null,
        altText: promptData.altText,
        is_selected: false,
        variantIndex: 0,
        slot: slot.slot,
      };

      setSlotJobs((prev) => ({ ...prev, [slot.slot]: job }));

      if (job.status !== "completed" && job.taskId) {
        const interval = setInterval(async () => {
          const { data: checkData } = await supabase.functions.invoke("check-image", {
            body: { jobId: job.id, taskId: job.taskId, slot: slot.slot, keyword: page?.keyword || "" },
          });
          if (checkData?.status === "completed") {
            clearInterval(interval);
            pollRefs.current.delete(slot.slot);
            setSlotJobs((prev) => ({
              ...prev,
              [slot.slot]: { ...prev[slot.slot]!, status: "completed", cloudinaryUrl: checkData.cloudinaryUrl },
            }));
          }
          if (checkData?.status === "failed") {
            clearInterval(interval);
            pollRefs.current.delete(slot.slot);
            setSlotJobs((prev) => ({ ...prev, [slot.slot]: { ...prev[slot.slot]!, status: "failed" } }));
          }
        }, 3000);
        pollRefs.current.set(slot.slot, interval);
      }
    } catch (err) {
      toast.error("Fehler: " + (err as Error).message);
    } finally {
      setLoadingSlot(null);
    }
  };

  const insertIntoPage = async (slotName: string) => {
    const job = slotJobs[slotName];
    if (!job) return;
    try {
      await supabase.functions.invoke("insert-image-to-page", {
        body: { jobId: job.id, pageId: selectedPageId },
      });
      setSlotJobs((prev) => ({ ...prev, [slotName]: { ...prev[slotName]!, html_inserted: true } }));
      toast.success("✓ Bild in Seite eingebaut");
    } catch (err) {
      toast.error("Einbau fehlgeschlagen: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">SEO-SEITE AUSWÄHLEN</Label>
        <Select value={selectedPageId} onValueChange={selectPage}>
          <SelectTrigger>
            <SelectValue placeholder="Seite auswählen..." />
          </SelectTrigger>
          <SelectContent>
            {pages.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.keyword} — {p.created_at ? new Date(p.created_at).toLocaleDateString("de") : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {imageSlots.length === 0 && selectedPageId && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Keine Bild-Platzhalter in dieser Seite gefunden.</CardContent></Card>
      )}

      {imageSlots.map((slot) => {
        const job = slotJobs[slot.slot];
        return (
          <Card key={slot.slot}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{SLOT_LABELS[slot.slot] || slot.slot} — {slot.width}×{slot.height}</span>
                {job?.status === "completed" && <Badge className="bg-green-600 text-white text-[10px]">✓ Fertig</Badge>}
                {job?.status === "generating" && <Badge variant="outline" className="text-[10px]"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generiert...</Badge>}
                {job?.html_inserted && <Badge className="bg-primary text-primary-foreground text-[10px]">In Seite</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-2">Kontext: {slot.context}</p>
              {!job && (
                <Button size="sm" onClick={() => generateForSlot(slot)} disabled={loadingSlot === slot.slot}>
                  {loadingSlot === slot.slot ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Bild generieren
                </Button>
              )}
              {job?.status === "completed" && job.cloudinaryUrl && (
                <div className="space-y-2">
                  <img src={job.cloudinaryUrl} alt={job.altText} className="w-full max-h-48 object-cover rounded-md" />
                  <div className="flex gap-2">
                    {!job.html_inserted && (
                      <Button size="sm" onClick={() => insertIntoPage(slot.slot)}>
                        <Check className="h-3 w-3 mr-1" /> In Seite einbauen
                      </Button>
                    )}
                    <a href={job.cloudinaryUrl} download target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" /> Download</Button>
                    </a>
                  </div>
                </div>
              )}
              {job?.status === "failed" && (
                <div className="text-xs text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> Generierung fehlgeschlagen
                  <Button size="sm" variant="ghost" className="ml-2 text-xs" onClick={() => generateForSlot(slot)}>
                    Erneut versuchen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════ */
/*  TAB 3: Bibliothek                     */
/* ══════════════════════════════════════ */

function LibraryTab({ firmId }: { firmId: string }) {
  const [images, setImages] = useState<ImageJob[]>([]);
  const [filter, setFilter] = useState<"all" | "completed" | "archived">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImages();
  }, [firmId, filter]);

  const loadImages = async () => {
    setLoading(true);
    let query = supabase
      .from("image_jobs")
      .select("id, slot, status, cloudinary_url, nano_url, alt_text, is_selected, html_inserted, created_at, page_id, prompt_positive")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "completed") query = query.eq("status", "completed");
    else if (filter === "archived") query = query.eq("status", "archived");
    else query = query.in("status", ["completed", "archived"]);

    if (firmId) query = query.eq("firm_id", firmId);

    const { data } = await query;
    setImages(
      (data || []).map((d) => ({
        id: d.id,
        taskId: null,
        status: d.status || "completed",
        cloudinaryUrl: d.cloudinary_url,
        nanoUrl: d.nano_url,
        altText: d.alt_text || "",
        is_selected: d.is_selected || false,
        variantIndex: 0,
        slot: d.slot || "free",
        created_at: d.created_at,
        page_id: d.page_id,
        html_inserted: d.html_inserted || false,
        prompt_positive: d.prompt_positive,
      }))
    );
    setLoading(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        {(["all", "completed", "archived"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">
            {f === "all" ? "Alle" : f === "completed" ? "Aktiv" : "Archiv"}
          </Button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && images.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Noch keine Bilder generiert.</CardContent></Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {images.map((img) => (
          <Card key={img.id} className="overflow-hidden">
            {(img.cloudinaryUrl || img.nanoUrl) ? (
              <img src={img.cloudinaryUrl || img.nanoUrl || ""} alt={img.altText} className="w-full h-28 object-cover" />
            ) : (
              <div className="h-28 bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="p-2 space-y-1">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[9px]">{SLOT_LABELS[img.slot] || img.slot}</Badge>
                {img.html_inserted && <Badge className="bg-green-600 text-white text-[9px]">✓</Badge>}
                {img.status === "archived" && <Badge variant="secondary" className="text-[9px]">Archiv</Badge>}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{img.altText}</p>
              <p className="text-[9px] text-muted-foreground/60">{img.created_at ? new Date(img.created_at).toLocaleDateString("de") : ""}</p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[9px] h-6 px-2 flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(img.cloudinaryUrl || img.nanoUrl || "");
                    toast.success("URL kopiert");
                  }}
                >
                  <Copy className="h-2.5 w-2.5 mr-0.5" /> URL
                </Button>
                <a href={img.cloudinaryUrl || img.nanoUrl || ""} download target="_blank" rel="noreferrer" className="flex-1">
                  <Button size="sm" variant="ghost" className="text-[9px] h-6 px-2 w-full">
                    <Download className="h-2.5 w-2.5 mr-0.5" /> DL
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
