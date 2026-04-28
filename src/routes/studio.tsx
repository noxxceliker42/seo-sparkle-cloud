import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Palette,
  Layers as LayersIcon,
  Share2,
  Plus,
  Upload,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { ComponentsTab } from "@/components/studio/ComponentsTab";

export const Route = createFileRoute("/studio")({
  component: StudioPage,
});

/* ───── Types ───── */

interface BrandKit {
  id: string;
  firm_id: string | null;
  name: string;
  design_philosophy: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  logo_alt: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
}

interface Component {
  id: string;
  firm_id: string | null;
  brand_kit_id: string | null;
  component_type: string;
  variant: string;
  name: string;
  description: string | null;
  html_output: string | null;
  css_output: string | null;
  js_output: string | null;
  config: Record<string, any>;
  embed_id: string;
  embed_type: string;
  is_global: boolean | null;
}

/* ───── Design Philosophies ───── */

const DESIGN_PHILOSOPHIES = [
  { id: "trust_classic", name: "Trust Classic", primaryColor: "#1d4ed8", secondaryColor: "#ffffff", accentColor: "#dc2626" },
  { id: "german_precision", name: "German Precision", primaryColor: "#374151", secondaryColor: "#f9fafb", accentColor: "#6b7280" },
  { id: "handwerk_pro", name: "Handwerk Pro", primaryColor: "#d97706", secondaryColor: "#fffbeb", accentColor: "#92400e" },
  { id: "luxury_dark", name: "Luxury Dark", primaryColor: "#d4af37", secondaryColor: "#111827", accentColor: "#d4af37" },
  { id: "futuristic_tech", name: "Futuristic Tech", primaryColor: "#00f5ff", secondaryColor: "#0f0f1a", accentColor: "#7c3aed" },
  { id: "glassmorphism", name: "Glassmorphism", primaryColor: "#6366f1", secondaryColor: "#f0f9ff", accentColor: "#f59e0b" },
  { id: "berlin_urban", name: "Berlin Urban", primaryColor: "#e11d48", secondaryColor: "#18181b", accentColor: "#f4f4f5" },
  { id: "medical_clean", name: "Medical Clean", primaryColor: "#059669", secondaryColor: "#ffffff", accentColor: "#0891b2" },
  { id: "automotive", name: "Automotive", primaryColor: "#f59e0b", secondaryColor: "#1e293b", accentColor: "#94a3b8" },
  { id: "editorial_bold", name: "Editorial Bold", primaryColor: "#ef4444", secondaryColor: "#ffffff", accentColor: "#000000" },
  { id: "minimalist_swiss", name: "Minimalist Swiss", primaryColor: "#3b82f6", secondaryColor: "#fafafa", accentColor: "#171717" },
  { id: "gradient_flow", name: "Gradient Flow", primaryColor: "#8b5cf6", secondaryColor: "#faf5ff", accentColor: "#ec4899" },
  { id: "eco_green", name: "Eco Green", primaryColor: "#16a34a", secondaryColor: "#f0fdf4", accentColor: "#854d0e" },
  { id: "warm_trustful", name: "Warm Trustful", primaryColor: "#ea580c", secondaryColor: "#fff7ed", accentColor: "#d97706" },
  { id: "brutalist_raw", name: "Brutalist Raw", primaryColor: "#fbbf24", secondaryColor: "#000000", accentColor: "#ffffff" },
  { id: "trust", name: "Trust & Service", primaryColor: "#1d4ed8", secondaryColor: "#ffffff", accentColor: "#dc2626" },
  { id: "midnight_executive", name: "Midnight Executive", primaryColor: "#3b82f6", secondaryColor: "#0f172a", accentColor: "#6366f1" },
  { id: "clean_editorial", name: "Clean Editorial", primaryColor: "#1c1917", secondaryColor: "#fafaf9", accentColor: "#dc2626" },
  { id: "eco_service", name: "Eco Service", primaryColor: "#065f46", secondaryColor: "#ecfdf5", accentColor: "#16a34a" },
  { id: "warm_craft", name: "Warm Craft", primaryColor: "#9a3412", secondaryColor: "#fff7ed", accentColor: "#ea580c" },
  { id: "tech_precision", name: "Tech Precision", primaryColor: "#0c4a6e", secondaryColor: "#f0f9ff", accentColor: "#0ea5e9" },
];

/* ───── Preview HTML ───── */

const buildKitPreviewHtml = (kit: BrandKit) => `
<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<style>
  :root {
    --c-primary: ${kit.primary_color};
    --c-bg: ${kit.secondary_color};
    --c-accent: ${kit.accent_color};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: var(--c-bg); }
  .header { background: var(--c-primary); color:#fff; padding:14px 20px;
    display:flex; justify-content:space-between; align-items:center; }
  .logo { font-weight:700; font-size:1rem; display:flex; align-items:center; gap:10px; }
  .logo img { height:32px; }
  .nav { display:flex; gap:20px; font-size:.85rem; opacity:.9; }
  .cta { background: var(--c-accent); color:#fff; padding:8px 16px;
    border-radius:6px; font-weight:600; font-size:.85rem; }
  .content { padding:20px; font-size:.85rem; color:#64748b; }
  .footer { background: var(--c-primary); color:rgba(255,255,255,.75);
    padding:14px 20px; font-size:.8rem; margin-top:20px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">
      ${kit.logo_url
        ? `<img src="${kit.logo_url}" alt="${kit.logo_alt || "Logo"}">`
        : `<span>${kit.name}</span>`}
    </div>
    <div class="nav"><span>Leistungen</span><span>Preise</span><span>Kontakt</span></div>
    <div class="cta">Jetzt anfragen</div>
  </div>
  <div class="content">Ihr Seiteninhalt erscheint hier...</div>
  <div class="footer">© 2025 — Alle Rechte vorbehalten</div>
</body></html>
`;

/* ───── Component ───── */

function StudioPage() {
  const { firmId, loading: roleLoading } = useRole();
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [activeBrandKit, setActiveBrandKit] = useState<BrandKit | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Load */
  useEffect(() => {
    if (roleLoading) return;
    if (!firmId) {
      setLoading(false);
      return;
    }
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId, roleLoading]);

  const loadData = async () => {
    if (!firmId) return;
    setLoading(true);

    const { data: kits, error: kitsError } = await supabase
      .from("brand_kits")
      .select("*")
      .eq("firm_id", firmId)
      .eq("is_active", true)
      .order("created_at");

    if (kitsError) {
      toast.error("Brand Kits konnten nicht geladen werden");
      console.error(kitsError);
    }
    const list = (kits ?? []) as BrandKit[];
    setBrandKits(list);
    const def = list.find((k) => k.is_default) ?? list[0] ?? null;
    setActiveBrandKit(def);

    const { data: comps } = await supabase
      .from("components")
      .select("*")
      .or(`firm_id.eq.${firmId},is_global.eq.true`)
      .order("component_type");
    setComponents((comps ?? []) as Component[]);

    setLoading(false);
  };

  /* Helpers */
  const updateKit = <K extends keyof BrandKit>(key: K, value: BrandKit[K]) => {
    setActiveBrandKit((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const applyPhilosophyColors = (philosophyId: string) => {
    const p = DESIGN_PHILOSOPHIES.find((x) => x.id === philosophyId);
    if (!p) return;
    setActiveBrandKit((prev) =>
      prev
        ? {
            ...prev,
            primary_color: p.primaryColor,
            secondary_color: p.secondaryColor,
            accent_color: p.accentColor,
          }
        : prev,
    );
  };

  /* Create */
  const handleCreateKit = async () => {
    if (!firmId) {
      toast.error("Keine Firma zugeordnet");
      return;
    }
    const name = window.prompt("Name des neuen Brand Kits:");
    if (!name?.trim()) return;

    const { data, error } = await supabase
      .from("brand_kits")
      .insert({
        firm_id: firmId,
        name: name.trim(),
        design_philosophy: "trust_classic",
        primary_color: "#1d4ed8",
        secondary_color: "#ffffff",
        accent_color: "#dc2626",
        is_default: brandKits.length === 0,
      })
      .select()
      .single();

    if (error || !data) {
      toast.error("Erstellen fehlgeschlagen");
      console.error(error);
      return;
    }

    const kit = data as BrandKit;
    setBrandKits((prev) => [...prev, kit]);
    setActiveBrandKit(kit);
    toast.success(`"${name}" erstellt`);
  };

  /* Save */
  const handleSaveKit = async () => {
    if (!activeBrandKit) return;
    setSaving(true);
    const { error } = await supabase
      .from("brand_kits")
      .update({
        name: activeBrandKit.name,
        design_philosophy: activeBrandKit.design_philosophy,
        primary_color: activeBrandKit.primary_color,
        secondary_color: activeBrandKit.secondary_color,
        accent_color: activeBrandKit.accent_color,
        logo_url: activeBrandKit.logo_url,
        logo_alt: activeBrandKit.logo_alt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeBrandKit.id);
    setSaving(false);

    if (error) {
      toast.error("Speichern fehlgeschlagen");
      console.error(error);
      return;
    }
    setBrandKits((prev) =>
      prev.map((k) => (k.id === activeBrandKit.id ? activeBrandKit : k)),
    );
    toast.success("Brand Kit gespeichert ✓");
  };

  /* Default */
  const setDefaultKit = async (isDefault: boolean) => {
    if (!activeBrandKit || !firmId) return;
    if (isDefault) {
      await supabase
        .from("brand_kits")
        .update({ is_default: false })
        .eq("firm_id", firmId);
    }
    await supabase
      .from("brand_kits")
      .update({ is_default: isDefault })
      .eq("id", activeBrandKit.id);

    setBrandKits((prev) =>
      prev.map((k) => ({
        ...k,
        is_default: k.id === activeBrandKit.id ? isDefault : isDefault ? false : k.is_default,
      })),
    );
    updateKit("is_default", isDefault);
  };

  /* Logo upload */
  const handleLogoUpload = async (file: File) => {
    if (!activeBrandKit || !firmId) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${firmId}/${activeBrandKit.id}/logo.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("brand-assets")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (upErr) {
      setUploadingLogo(false);
      toast.error("Upload fehlgeschlagen");
      console.error(upErr);
      return;
    }

    const { data: pub } = supabase.storage.from("brand-assets").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    updateKit("logo_url", url);
    setUploadingLogo(false);
    toast.success("Logo hochgeladen — Speichern nicht vergessen");
  };

  /* Delete */
  const handleDeleteKit = async () => {
    if (!activeBrandKit || brandKits.length <= 1) return;
    const { error } = await supabase
      .from("brand_kits")
      .delete()
      .eq("id", activeBrandKit.id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    const remaining = brandKits.filter((k) => k.id !== activeBrandKit.id);
    setBrandKits(remaining);
    setActiveBrandKit(remaining[0] ?? null);
    toast.success("Kit gelöscht");
  };

  const previewHtml = useMemo(
    () => (activeBrandKit ? buildKitPreviewHtml(activeBrandKit) : ""),
    [activeBrandKit],
  );

  /* ───── Render ───── */

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Component Studio</h1>
          <p className="text-sm text-muted-foreground">
            Brand Kits & Komponenten verwalten
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={activeBrandKit?.id ?? ""}
            onValueChange={(id) =>
              setActiveBrandKit(brandKits.find((k) => k.id === id) ?? null)
            }
            disabled={brandKits.length === 0}
          >
            <SelectTrigger className="w-48 text-sm">
              <SelectValue placeholder="Kit wählen" />
            </SelectTrigger>
            <SelectContent>
              {brandKits.map((kit) => (
                <SelectItem key={kit.id} value={kit.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                      style={{ background: kit.primary_color }}
                    />
                    {kit.name}
                    {kit.is_default && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        Standard
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={handleCreateKit}
          >
            <Plus className="h-3.5 w-3.5" />
            Neues Kit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kit" className="w-full">
        <TabsList>
          <TabsTrigger value="kit" className="gap-2">
            <Palette className="h-4 w-4" />
            Brand Kit
          </TabsTrigger>
          <TabsTrigger value="components" className="gap-2">
            <LayersIcon className="h-4 w-4" />
            Komponenten
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Share2 className="h-4 w-4" />
            Export & Embed
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Brand Kit */}
        <TabsContent value="kit" className="mt-6">
          {loading || roleLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Lade Brand Kits…
            </div>
          ) : !activeBrandKit ? (
            <div className="border rounded-lg p-12 text-center">
              <Palette className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">Noch keine Brand Kits vorhanden</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Erstelle dein erstes Kit, um Farben, Logo und Design-Philosophie
                zu konfigurieren.
              </p>
              <Button onClick={handleCreateKit} className="gap-2">
                <Plus className="h-4 w-4" />
                Erstes Kit erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* LEFT — Form (60%) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Kit-Name</label>
                  <Input
                    value={activeBrandKit.name}
                    onChange={(e) => updateKit("name", e.target.value)}
                    className="text-base font-medium"
                  />
                </div>

                {/* Default toggle */}
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Switch
                    checked={!!activeBrandKit.is_default}
                    onCheckedChange={(v) => void setDefaultKit(v)}
                  />
                  <label className="text-sm">
                    Standard-Kit für neue Komponenten
                  </label>
                </div>

                {/* Philosophy */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Design-Philosophie
                  </label>
                  <Select
                    value={activeBrandKit.design_philosophy ?? "trust_classic"}
                    onValueChange={(v) => {
                      updateKit("design_philosophy", v);
                      applyPhilosophyColors(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DESIGN_PHILOSOPHIES.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border border-border"
                              style={{ background: p.primaryColor }}
                            />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Farben</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        { key: "primary_color", label: "Primärfarbe" },
                        { key: "secondary_color", label: "Hintergrund" },
                        { key: "accent_color", label: "Akzentfarbe" },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {label}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={activeBrandKit[key] as string}
                            onChange={(e) => updateKit(key, e.target.value)}
                            className="h-9 w-9 rounded-lg cursor-pointer border p-0.5"
                          />
                          <span className="text-xs font-mono text-muted-foreground">
                            {activeBrandKit[key]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Logo</label>
                  <div className="border rounded-lg p-4 space-y-3">
                    {activeBrandKit.logo_url ? (
                      <div className="flex items-center gap-4">
                        <div className="bg-muted rounded p-2">
                          <img
                            src={activeBrandKit.logo_url}
                            alt={activeBrandKit.logo_alt ?? "Logo"}
                            style={{ height: 48, maxWidth: 200, objectFit: "contain" }}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Alt-Text (Logo-Beschreibung)"
                            value={activeBrandKit.logo_alt ?? ""}
                            onChange={(e) => updateKit("logo_alt", e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateKit("logo_url", null)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Entfernen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Noch kein Logo hochgeladen.
                      </p>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="gap-2"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {activeBrandKit.logo_url ? "Logo ersetzen" : "Logo hochladen"}
                    </Button>
                  </div>
                </div>

                {/* Save */}
                <Button
                  className="w-full gap-2"
                  onClick={handleSaveKit}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Brand Kit speichern
                </Button>

                {/* Delete */}
                {brandKits.length > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-2">
                        <Trash2 className="h-4 w-4" />
                        Kit löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Brand Kit löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          „{activeBrandKit.name}" wird unwiderruflich gelöscht.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleDeleteKit()}>
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* RIGHT — Preview (40%) */}
              <div className="lg:col-span-2">
                <div className="sticky top-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Live-Vorschau
                  </p>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full rounded-lg border bg-white"
                    style={{ height: 320 }}
                    title="Brand Kit Vorschau"
                  />
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Components */}
        <TabsContent value="components" className="mt-6">
          <ComponentsTab
            firmId={firmId}
            brandKits={brandKits}
            activeBrandKit={activeBrandKit}
            components={components}
            onComponentsChange={setComponents}
          />
        </TabsContent>

        {/* Tab 3: Export (Stub) */}
        <TabsContent value="export" className="mt-6">
          <div className="border rounded-lg p-12 text-center">
            <Share2 className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Export & Embed</h3>
            <p className="text-sm text-muted-foreground">
              Embed-Code-Export folgt im nächsten Schritt.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
