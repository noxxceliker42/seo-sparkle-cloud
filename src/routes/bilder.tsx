import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  ImageIcon, Download, Loader2, X, Library, Sparkles, Copy, RotateCcw,
  Upload, Pencil, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/bilder")({
  component: ImageStudio,
});

/* ── Presets ── */

const RESOLUTION_PRESETS = [
  { id: "hero_seo", label: "Hero SEO", desc: "Google Discover optimiert", width: 1200, height: 675, ratio: "16:9", resolution: "1K", badge: "SEO" },
  { id: "hero_hd", label: "Hero HD", desc: "Hochauflösend Widescreen", width: 1920, height: 1080, ratio: "16:9", resolution: "2K", badge: "HD" },
  { id: "section_standard", label: "Sektion Standard", desc: "H2 / Sektion Bild", width: 800, height: 450, ratio: "16:9", resolution: "1K", badge: "Standard" },
  { id: "square_social", label: "Quadrat Social", desc: "Instagram / Social Media", width: 1080, height: 1080, ratio: "1:1", resolution: "1K", badge: "Social" },
  { id: "portrait_mobile", label: "Hochformat Mobile", desc: "Stories / Mobile Hero", width: 1080, height: 1920, ratio: "9:16", resolution: "2K", badge: "Mobile" },
  { id: "banner_wide", label: "Banner Ultra-Wide", desc: "Website Banner / Header", width: 1920, height: 600, ratio: "21:9", resolution: "2K", badge: "Banner" },
  { id: "thumbnail", label: "Thumbnail", desc: "Blog / Vorschau klein", width: 400, height: 300, ratio: "4:3", resolution: "512px", badge: "Klein" },
  { id: "author", label: "Autorportrait", desc: "Rund / Profilbild", width: 400, height: 400, ratio: "1:1", resolution: "512px", badge: "Autor" },
  { id: "custom", label: "Benutzerdefiniert", desc: "Eigene Maße eingeben", width: null, height: null, ratio: null, resolution: null, badge: "Frei" },
] as const;

type ResPreset = (typeof RESOLUTION_PRESETS)[number];

const SECTION_TYPES = [
  { id: "hero", label: "Hero / H1 Hauptbild", defaultPreset: "hero_seo" },
  { id: "h2_sektion", label: "H2 Sektion Bild", defaultPreset: "section_standard" },
  { id: "h3_sektion", label: "H3 Sektion Bild", defaultPreset: "thumbnail" },
  { id: "howto", label: "HowTo / Anleitung", defaultPreset: "section_standard" },
  { id: "ablauf", label: "Ablauf / Prozess", defaultPreset: "section_standard" },
  { id: "unique_data", label: "Statistik / Daten", defaultPreset: "thumbnail" },
  { id: "info_gain", label: "Info Gain Sektion", defaultPreset: "section_standard" },
  { id: "cta", label: "CTA / Aktion", defaultPreset: "section_standard" },
  { id: "testimonial", label: "Testimonial", defaultPreset: "thumbnail" },
  { id: "autor", label: "Autor Portrait", defaultPreset: "author" },
  { id: "social", label: "Social Media", defaultPreset: "square_social" },
  { id: "banner", label: "Banner / Header", defaultPreset: "banner_wide" },
  { id: "frei", label: "Freie Verwendung", defaultPreset: "section_standard" },
];

const DEFAULT_NEG = "blurry, low quality, distorted, watermark, text overlay, logo, brand name, ugly, deformed";

type UploadMode = "text-to-image" | "image-to-image" | "image-edit";

const MODE_OPTIONS: { id: UploadMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "text-to-image", label: "Text → Bild", icon: <Sparkles className="h-4 w-4" />, desc: "Aus Prompt generieren" },
  { id: "image-to-image", label: "Bild → Variante", icon: <RefreshCw className="h-4 w-4" />, desc: "Stil übertragen" },
  { id: "image-edit", label: "Bild bearbeiten", icon: <Pencil className="h-4 w-4" />, desc: "Prompt-gesteuert" },
];

interface ActiveJob {
  id: string;
  taskId: string | null;
  status: "generating" | "completed" | "failed";
  cloudinaryUrl: string | null;
  error?: string;
  prompt: string;
}

interface LibImage {
  id: string;
  cloudinary_url: string | null;
  alt_text: string | null;
  slot: string | null;
  slot_label: string | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
}

interface ReferenceImage {
  file: File | null;
  preview: string | null;
  kieUrl: string | null;
  isUploading: boolean;
  error: string | null;
}

const EMPTY_REF: ReferenceImage = { file: null, preview: null, kieUrl: null, isUploading: false, error: null };

/* ── Component ── */

function ImageStudio() {
  const { user } = useAuth();
  const [firms, setFirms] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState("");

  // Mode
  const [uploadMode, setUploadMode] = useState<UploadMode>("text-to-image");
  const [referenceImage, setReferenceImage] = useState<ReferenceImage>(EMPTY_REF);
  const [editStrength, setEditStrength] = useState(0.7);

  // Generation state
  const [sectionType, setSectionType] = useState(SECTION_TYPES[0]);
  const [selectedPreset, setSelectedPreset] = useState<ResPreset>(RESOLUTION_PRESETS[0]);
  const [customWidth, setCustomWidth] = useState(1200);
  const [customHeight, setCustomHeight] = useState(675);
  const [customResolution, setCustomResolution] = useState("1K");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEG);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Library
  const [savedImages, setSavedImages] = useState<LibImage[]>([]);
  const [libLoading, setLibLoading] = useState(false);

  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Effective dimensions
  const effectiveWidth = selectedPreset.id === "custom" ? customWidth : (selectedPreset.width ?? 1200);
  const effectiveHeight = selectedPreset.id === "custom" ? customHeight : (selectedPreset.height ?? 675);
  const effectiveRatio = selectedPreset.id === "custom"
    ? `${customWidth}:${customHeight}`
    : (selectedPreset.ratio ?? "16:9");
  const effectiveResolution = selectedPreset.id === "custom" ? customResolution : (selectedPreset.resolution ?? "1K");

  useEffect(() => {
    supabase.from("firms").select("id, name").then(({ data }) => {
      if (data?.length) { setFirms(data); setFirmId(data[0].id); }
    });
    loadLibrary();
    return () => { pollRefs.current.forEach(i => clearInterval(i)); };
  }, []);

  const handleSectionChange = (id: string) => {
    const section = SECTION_TYPES.find(s => s.id === id);
    if (!section) return;
    setSectionType(section);
    const preset = RESOLUTION_PRESETS.find(p => p.id === section.defaultPreset);
    if (preset) setSelectedPreset(preset);
  };

  const loadLibrary = async () => {
    if (!user?.id) return;
    setLibLoading(true);
    const { data } = await supabase
      .from("image_jobs")
      .select("id, cloudinary_url, alt_text, slot, slot_label, width, height, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50);
    setSavedImages(data || []);
    setLibLoading(false);
  };

  /* ── Image Upload ── */

  const handleImageSelect = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setReferenceImage(prev => ({ ...prev, error: "Datei zu groß — Max 10 MB" }));
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setReferenceImage(prev => ({ ...prev, error: "Nur JPG, PNG, WebP, GIF erlaubt" }));
      return;
    }

    const preview = URL.createObjectURL(file);
    setReferenceImage({ file, preview, kieUrl: null, isUploading: true, error: null });

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("upload-reference-image", {
        body: { imageBase64: base64, fileName: file.name, mimeType: file.type },
      });

      if (error || data?.error) {
        setReferenceImage(prev => ({ ...prev, isUploading: false, error: error?.message || data?.error || "Upload fehlgeschlagen" }));
        return;
      }

      setReferenceImage(prev => ({ ...prev, kieUrl: data.fileUrl, isUploading: false, error: null }));
      toast.success("Referenzbild hochgeladen");
    } catch (err: any) {
      setReferenceImage(prev => ({ ...prev, isUploading: false, error: err.message || "Upload fehlgeschlagen" }));
    }
  };

  /* ── Generate ── */

  const generateImage = async () => {
    if (uploadMode !== "text-to-image" && !referenceImage.kieUrl) {
      toast.error("Bitte zuerst ein Referenzbild hochladen");
      return;
    }
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    const { data, error } = await supabase.functions.invoke("start-image", {
      body: {
        promptPositive: prompt,
        promptNegative: negativePrompt,
        width: effectiveWidth,
        height: effectiveHeight,
        aspectRatio: effectiveRatio,
        resolution: effectiveResolution,
        slot: sectionType.id,
        slotLabel: sectionType.label,
        firmId: firmId || null,
        userId: user?.id,
        keyword: "",
        mode: uploadMode,
        referenceImageUrl: referenceImage.kieUrl || null,
        editStrength,
      },
    });

    setIsGenerating(false);

    if (error || data?.error) {
      const msg = error?.message || data?.error || "Unbekannter Fehler";
      toast.error(msg);
      setActiveJobs(prev => [...prev, { id: `err-${Date.now()}`, taskId: null, status: "failed", cloudinaryUrl: null, error: msg, prompt }]);
      return;
    }

    if (data.status === "completed") {
      setActiveJobs(prev => [...prev, { id: data.jobId, taskId: null, status: "completed", cloudinaryUrl: data.cloudinaryUrl, prompt }]);
      loadLibrary();
      return;
    }

    const newJob: ActiveJob = { id: data.jobId, taskId: data.taskId, status: "generating", cloudinaryUrl: null, prompt };
    setActiveJobs(prev => [...prev, newJob]);
    startPolling(newJob);
  };

  const startPolling = (job: ActiveJob) => {
    const interval = setInterval(async () => {
      const { data } = await supabase.functions.invoke("check-image", {
        body: { jobId: job.id, taskId: job.taskId, slot: sectionType.id, keyword: "" },
      });
      if (data?.status === "completed") {
        clearInterval(interval);
        pollRefs.current.delete(job.id);
        setActiveJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "completed", cloudinaryUrl: data.cloudinaryUrl } : j));
        loadLibrary();
      }
      if (data?.status === "failed") {
        clearInterval(interval);
        pollRefs.current.delete(job.id);
        setActiveJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "failed", error: "NanoBanana Fehler" } : j));
      }
    }, 3000);
    pollRefs.current.set(job.id, interval);
  };

  const regenerate = (job: ActiveJob) => {
    setActiveJobs(prev => prev.filter(j => j.id !== job.id));
    setPrompt(job.prompt);
    setTimeout(() => generateImage(), 100);
  };

  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  const needsRef = uploadMode !== "text-to-image";

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> Bild-Studio
          </h1>
          <p className="text-xs text-muted-foreground">NanoBanana 2 · Kie.AI</p>
        </div>
        {firms.length > 0 && (
          <Select value={firmId} onValueChange={setFirmId}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {firms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Generieren
          </TabsTrigger>
          <TabsTrigger value="library" className="text-xs gap-1.5">
            <Library className="h-3.5 w-3.5" /> Bibliothek
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: GENERATE ═══ */}
        <TabsContent value="generate">
          <div className="flex flex-col lg:flex-row gap-5 mt-4">
            {/* Left column: Settings */}
            <div className="w-full lg:w-80 space-y-4 shrink-0">

              {/* Mode selector */}
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Generierungs-Modus
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MODE_OPTIONS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setUploadMode(m.id)}
                      className={`p-2.5 rounded-md border text-center transition-colors ${
                        uploadMode === m.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-card hover:bg-accent/50"
                      }`}
                    >
                      <div className={`flex justify-center mb-1 ${uploadMode === m.id ? "text-primary" : "text-muted-foreground"}`}>
                        {m.icon}
                      </div>
                      <div className={`text-[11px] font-bold ${uploadMode === m.id ? "text-primary" : "text-foreground"}`}>
                        {m.label}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference image upload */}
              {needsRef && (
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Referenzbild hochladen
                  </Label>

                  {!referenceImage.preview && (
                    <label
                      className="block border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors"
                      onDragOver={e => { e.preventDefault(); }}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageSelect(f); }}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
                        className="hidden"
                      />
                      <Upload className="h-7 w-7 mx-auto mb-2 text-primary/60" />
                      <div className="text-xs font-bold text-primary">Bild hierher ziehen oder klicken</div>
                      <div className="text-[10px] text-muted-foreground mt-1">JPG, PNG, WebP · Max 10 MB</div>
                    </label>
                  )}

                  {referenceImage.preview && (
                    <div className="relative border-2 border-primary/30 rounded-lg overflow-hidden">
                      <img src={referenceImage.preview} alt="Referenzbild" className="w-full max-h-44 object-cover" />

                      {referenceImage.isUploading && (
                        <div className="absolute inset-0 bg-primary/80 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
                          <span className="text-xs font-bold text-primary-foreground">Wird hochgeladen...</span>
                        </div>
                      )}

                      {referenceImage.kieUrl && (
                        <Badge className="absolute top-2 right-2 bg-green-600 text-white text-[10px]">✓ Bereit</Badge>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 left-2 h-6 px-2 text-[10px]"
                        onClick={() => setReferenceImage(EMPTY_REF)}
                      >
                        <X className="h-3 w-3 mr-0.5" /> Entfernen
                      </Button>
                    </div>
                  )}

                  {referenceImage.error && (
                    <div className="mt-1.5 text-[11px] text-destructive bg-destructive/10 rounded-md px-3 py-1.5">
                      {referenceImage.error}
                    </div>
                  )}

                  {/* Edit strength slider */}
                  {uploadMode === "image-edit" && referenceImage.kieUrl && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                        <span>Veränderungsstärke</span>
                        <span className="text-primary">{Math.round(editStrength * 100)}%</span>
                      </div>
                      <Slider
                        min={10}
                        max={100}
                        step={5}
                        value={[Math.round(editStrength * 100)]}
                        onValueChange={([v]) => setEditStrength(v / 100)}
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                        <span>Minimal</span>
                        <span>Maximal</span>
                      </div>
                    </div>
                  )}

                  {/* Info boxes */}
                  {uploadMode === "image-to-image" && (
                    <div className="mt-2 text-[10px] text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 rounded-md px-3 py-2 leading-relaxed">
                      <strong>Stil-Transfer:</strong> NanoBanana übernimmt Komposition und Stil des Referenzbildes und kombiniert es mit deinem Prompt.
                    </div>
                  )}
                  {uploadMode === "image-edit" && (
                    <div className="mt-2 text-[10px] text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 rounded-md px-3 py-2 leading-relaxed">
                      <strong>Bild bearbeiten:</strong> Der Prompt beschreibt was geändert werden soll. Niedriger Wert = nur kleine Änderungen. Hoher Wert = starke Änderungen.
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Section */}
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  1 · Sektion / Verwendung
                </Label>
                <Select value={sectionType.id} onValueChange={handleSectionChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Resolution presets */}
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  2 · Format & Auflösung
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {RESOLUTION_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPreset(p)}
                      className={`text-left p-2 rounded-md border transition-colors ${
                        selectedPreset.id === p.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-card hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[11px] font-bold ${selectedPreset.id === p.id ? "text-primary" : "text-foreground"}`}>
                          {p.label}
                        </span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{p.badge}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {p.id === "custom" ? "Frei definierbar" : `${p.width}×${p.height} · ${p.resolution}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom dimensions */}
              {selectedPreset.id === "custom" && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 space-y-3">
                    <Label className="text-[10px] font-bold text-primary uppercase">Eigene Maße</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Breite (px)</Label>
                        <Input type="number" value={customWidth} onChange={e => setCustomWidth(Number(e.target.value))} min={256} max={4096} step={64} className="text-xs h-8" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Höhe (px)</Label>
                        <Input type="number" value={customHeight} onChange={e => setCustomHeight(Number(e.target.value))} min={256} max={4096} step={64} className="text-xs h-8" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Auflösung</Label>
                      <Select value={customResolution} onValueChange={setCustomResolution}>
                        <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="512px">512px — Schnell</SelectItem>
                          <SelectItem value="1K">1K — Standard</SelectItem>
                          <SelectItem value="2K">2K — HD</SelectItem>
                          <SelectItem value="4K">4K — Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border border-border">
                <span className="font-bold text-foreground">{sectionType.label}</span>
                {" · "}{effectiveWidth}×{effectiveHeight}px
                {" · "}{effectiveRatio}
                {" · "}{effectiveResolution}
              </div>
            </div>

            {/* Right column: Prompt + Generate */}
            <div className="flex-1 space-y-4">
              {/* Step 3: Prompt */}
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  3 · Bildprompt (Englisch empfohlen)
                </Label>
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={
                    uploadMode === "image-edit"
                      ? "Describe the changes: make the background darker, add soft bokeh, change lighting to golden hour..."
                      : sectionType.id === "hero"
                      ? "Professional appliance repair technician in modern Berlin apartment, photorealistic, soft studio lighting..."
                      : sectionType.id === "autor"
                      ? "Professional headshot, neutral background, confident pose, studio lighting..."
                      : "Describe your image in detail. English gives best results. Include: subject, setting, style, lighting..."
                  }
                  className="min-h-[100px] font-mono text-xs"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {prompt.length} Zeichen{wordCount > 0 && ` · ${wordCount} Wörter`}
                  </span>
                  <span className={`text-[10px] font-medium ${prompt.length > 400 ? "text-destructive" : "text-green-600"}`}>
                    {prompt.length > 400 ? "Zu lang — max ~60 Wörter" : "Gut ✓"}
                  </span>
                </div>
              </div>

              {/* Negative Prompt */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Negativer Prompt
                  </Label>
                  <button
                    onClick={() => setNegativePrompt(DEFAULT_NEG + ", faces, people")}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Zurücksetzen
                  </button>
                </div>
                <Textarea
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  className="min-h-[60px] font-mono text-[11px] border-destructive/30 bg-destructive/5"
                />
              </div>

              {/* Generate button */}
              <Button
                onClick={generateImage}
                disabled={!prompt.trim() || isGenerating || (needsRef && !referenceImage.kieUrl)}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird generiert...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Bild generieren · {effectiveWidth}×{effectiveHeight}</>
                )}
              </Button>

              {/* Active jobs */}
              {activeJobs.map(job => (
                <Card key={job.id} className={`overflow-hidden ${
                  job.status === "completed" ? "border-green-500/30 bg-green-500/5" :
                  job.status === "failed" ? "border-destructive/30 bg-destructive/5" :
                  "border-primary/30 bg-primary/5"
                }`}>
                  <CardContent className="pt-4">
                    {job.status === "generating" && (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        NanoBanana generiert... ({effectiveResolution})
                      </div>
                    )}

                    {job.status === "completed" && job.cloudinaryUrl && (
                      <div className="space-y-3">
                        <img src={job.cloudinaryUrl} alt="Generiertes Bild" className="w-full rounded-md" />
                        <div className="flex gap-2 flex-wrap">
                          <a href={job.cloudinaryUrl} download target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="text-xs">
                              <Download className="h-3 w-3 mr-1" /> Herunterladen
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(job.cloudinaryUrl!);
                              toast.success("URL kopiert");
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" /> URL kopieren
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => regenerate(job)}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Neu generieren
                          </Button>
                        </div>
                      </div>
                    )}

                    {job.status === "failed" && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <X className="h-4 w-4" /> Fehlgeschlagen: {job.error}
                        <Button size="sm" variant="ghost" className="text-xs ml-auto" onClick={() => regenerate(job)}>
                          Erneut versuchen
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB: LIBRARY ═══ */}
        <TabsContent value="library">
          <div className="mt-4">
            {libLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!libLoading && savedImages.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Noch keine Bilder generiert.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {savedImages.map(img => (
                <Card key={img.id} className="overflow-hidden">
                  {img.cloudinary_url ? (
                    <img src={img.cloudinary_url} alt={img.alt_text || "Bild"} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="h-32 bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-2 space-y-1">
                    <div className="text-[10px] font-bold text-foreground truncate">
                      {img.slot_label || img.slot || "Bild"}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {img.width && img.height ? `${img.width}×${img.height}px` : ""}
                      {img.created_at && ` · ${new Date(img.created_at).toLocaleDateString("de-DE")}`}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[9px] h-6 px-2 flex-1"
                        onClick={() => {
                          navigator.clipboard.writeText(img.cloudinary_url || "");
                          toast.success("URL kopiert");
                        }}
                      >
                        <Copy className="h-2.5 w-2.5 mr-0.5" /> URL
                      </Button>
                      <a href={img.cloudinary_url || ""} download target="_blank" rel="noreferrer" className="flex-1">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
