import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, AlertCircle, RotateCcw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClusterStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFirm: {
    id: string;
    name: string;
    city?: string | null;
    service_area?: string | null;
    branche?: string | null;
    target_audience?: string | null;
    design_philosophy?: string | null;
    design_philosophy_custom?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
  } | null;
}

const CLUSTER_TYPES = [
  { value: "brand_pillar", label: "Marke + Service" },
  { value: "generic_local", label: "Gerät/Service lokal" },
  { value: "device_cluster", label: "Gerätetyp-fokussiert" },
  { value: "local_cluster", label: "Ortsteil-fokussiert" },
];

const CLUSTER_DEPTHS = [
  { value: "kompakt", label: "Kompakt (15–20 Seiten)" },
  { value: "standard", label: "Standard (25–35 Seiten)" },
  { value: "vollstaendig", label: "Vollständig (40–50 Seiten)" },
];

const ZIELGRUPPEN = [
  { value: "privatkunden", label: "Privatkunden (Standard)" },
  { value: "gewerblich", label: "Gewerblich / Vermieter" },
  { value: "senioren", label: "Senioren / 60+" },
  { value: "technik", label: "Technik-Affine / DIY" },
  { value: "preisbewusst", label: "Preisbewusste Kunden" },
  { value: "premium", label: "Premium-Kunden" },
];

const PALETTES = [
  { id: "trust_classic", name: "Trust Classic", desc: "Seriös, klar, professionell", colors: ["#1d4ed8", "#ffffff", "#dc2626"] },
  { id: "german_precision", name: "German Precision", desc: "Technisch, präzise, nüchtern", colors: ["#374151", "#f3f4f6", "#6b7280"] },
  { id: "handwerk_pro", name: "Handwerk Pro", desc: "Erdtöne, robust, bodenständig", colors: ["#92400e", "#fef3c7", "#d97706"] },
  { id: "luxury_dark", name: "Luxury Dark", desc: "Dunkel, Gold, exklusiv", colors: ["#111827", "#d4af37", "#1f2937"] },
  { id: "futuristic_tech", name: "Futuristic Tech", desc: "Neon, modern, digital", colors: ["#0f0f1a", "#00f5ff", "#7c3aed"] },
  { id: "glassmorphism", name: "Glassmorphism", desc: "Transparent, Blur, clean", colors: ["#e0e7ff", "#6366f1", "#f0f9ff"] },
  { id: "berlin_urban", name: "Berlin Urban", desc: "Urban, jung, direkt", colors: ["#18181b", "#e11d48", "#f4f4f5"] },
  { id: "medical_clean", name: "Medical Clean", desc: "Weiß, Mint, klinisch sauber", colors: ["#ecfdf5", "#059669", "#ffffff"] },
  { id: "automotive", name: "Automotive", desc: "Dunkel, Chrom, maskulin", colors: ["#1e293b", "#94a3b8", "#f59e0b"] },
  { id: "editorial_bold", name: "Editorial Bold", desc: "Große Typografie, wenig Farbe", colors: ["#000000", "#ffffff", "#ef4444"] },
  { id: "minimalist_swiss", name: "Minimalist Swiss", desc: "Grid, Weißraum, präzise", colors: ["#fafafa", "#171717", "#3b82f6"] },
  { id: "gradient_flow", name: "Gradient Flow", desc: "Farbverläufe, weich, modern", colors: ["#8b5cf6", "#ec4899", "#06b6d4"] },
  { id: "eco_green", name: "Eco Green", desc: "Grün, natürlich, nachhaltig", colors: ["#14532d", "#86efac", "#f0fdf4"] },
  { id: "warm_trustful", name: "Warm Trustful", desc: "Orange/Gelb, einladend, herzlich", colors: ["#ea580c", "#fef9c3", "#1c1917"] },
  { id: "brutalist_raw", name: "Brutalist Raw", desc: "Direkt, mutig, unkonventionell", colors: ["#fbbf24", "#000000", "#ffffff"] },
];

const LOADING_MESSAGES = [
  { after: 0, text: "Claude analysiert Keywords…" },
  { after: 10000, text: "Cluster-Plan wird aufgebaut…" },
  { after: 20000, text: "Keywords werden zugewiesen…" },
  { after: 30000, text: "Fast fertig…" },
];

export function ClusterStartModal({ open, onOpenChange, activeFirm }: ClusterStartModalProps) {
  const navigate = useNavigate();
  const [mainKeyword, setMainKeyword] = useState("");
  const [clusterType, setClusterType] = useState("brand_pillar");
  const [clusterDepth, setClusterDepth] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startTime = useRef(0);

  // Design state
  const [designOpen, setDesignOpen] = useState(false);
  const [designMode, setDesignMode] = useState<"firm" | "custom">("firm");
  const [designPhilosophy, setDesignPhilosophy] = useState("");
  const [designCustom, setDesignCustom] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1d4ed8");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#dc2626");

  // Context state
  const [targetAudience, setTargetAudience] = useState("privatkunden");
  const [themeContext, setThemeContext] = useState("");
  const [differentiation, setDifferentiation] = useState("");

  // Sync from firm when modal opens
  useEffect(() => {
    if (open && activeFirm) {
      setTargetAudience(activeFirm.target_audience || "privatkunden");
      setDesignPhilosophy(activeFirm.design_philosophy || "trust_classic");
      setPrimaryColor(activeFirm.primary_color || "#1d4ed8");
      setSecondaryColor(activeFirm.secondary_color || "#ffffff");
      setAccentColor(activeFirm.accent_color || "#dc2626");
      setDesignMode("firm");
      setDesignCustom("");
      setThemeContext("");
      setDifferentiation("");
    }
  }, [open, activeFirm]);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    msgTimers.current.forEach(clearTimeout);
    msgTimers.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const firmDesignLabel = PALETTES.find((p) => p.id === (activeFirm?.design_philosophy || "trust_classic"))?.name || "Trust Classic";

  const selectPalette = (p: typeof PALETTES[0]) => {
    setDesignPhilosophy(p.id);
    setPrimaryColor(p.colors[0]);
    setSecondaryColor(p.colors[1]);
    setAccentColor(p.colors[2]);
  };

  const resolvedDesign = designMode === "firm"
    ? {
        philosophy: activeFirm?.design_philosophy || "trust_classic",
        custom: activeFirm?.design_philosophy_custom || "",
        primary: activeFirm?.primary_color || "#1d4ed8",
        secondary: activeFirm?.secondary_color || "#ffffff",
        accent: activeFirm?.accent_color || "#dc2626",
      }
    : {
        philosophy: designPhilosophy,
        custom: designCustom,
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
      };

  const handleSubmit = async () => {
    if (!mainKeyword.trim()) return;
    setLoading(true);
    setError(null);
    startTime.current = Date.now();

    setLoadingMsg(LOADING_MESSAGES[0].text);
    LOADING_MESSAGES.slice(1).forEach((m) => {
      const t = setTimeout(() => setLoadingMsg(m.text), m.after);
      msgTimers.current.push(t);
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Nicht eingeloggt");
        setLoading(false);
        cleanup();
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          webhookType: "cluster-plan",
          payload: {
            mainKeyword: mainKeyword.trim(),
            firm: activeFirm?.name || "",
            city: activeFirm?.city || "",
            branche: activeFirm?.branche || "",
            clusterType,
            clusterDepth,
            userId: session.user.id,
            firmId: activeFirm?.id || null,
            designPhilosophy: resolvedDesign.philosophy,
            designPhilosophyCustom: resolvedDesign.custom,
            primaryColor: resolvedDesign.primary,
            secondaryColor: resolvedDesign.secondary,
            accentColor: resolvedDesign.accent,
            targetAudience,
            themeContext: themeContext.trim(),
            differentiation: differentiation.trim(),
          },
        },
      });

      if (fnError) {
        setError(fnError.message || "Fehler beim Starten");
        setLoading(false);
        cleanup();
        return;
      }

      const userId = session.user.id;
      pollRef.current = setInterval(async () => {
        const { data: clusters } = await supabase
          .from("clusters")
          .select("id, status, plan_generated")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!clusters || clusters.length === 0) return;
        const latest = clusters[0];

        if (latest.plan_generated === true && latest.status === "active") {
          cleanup();
          setLoading(false);
          onOpenChange(false);
          navigate({ to: "/cluster/$id", params: { id: latest.id } });
        } else if (latest.status === "error") {
          cleanup();
          setLoading(false);
          setError("Cluster-Generierung fehlgeschlagen. Bitte erneut versuchen.");
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Unbekannter Fehler");
      setLoading(false);
      cleanup();
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuen Cluster starten</DialogTitle>
          <DialogDescription>
            Erstelle einen thematischen Cluster mit automatischer Keyword-Analyse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Keyword */}
          <div className="space-y-2">
            <Label htmlFor="cluster-keyword">Haupt-Keyword *</Label>
            <Input
              id="cluster-keyword"
              placeholder="z.B. Miele Reparatur Berlin"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Cluster Type */}
          <div className="space-y-2">
            <Label>Cluster-Typ</Label>
            <Select value={clusterType} onValueChange={setClusterType} disabled={loading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLUSTER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cluster Depth */}
          <div className="space-y-2">
            <Label>Cluster-Tiefe</Label>
            <RadioGroup value={clusterDepth} onValueChange={setClusterDepth} disabled={loading}>
              {CLUSTER_DEPTHS.map((d) => (
                <div key={d.value} className="flex items-center gap-2">
                  <RadioGroupItem value={d.value} id={`depth-${d.value}`} />
                  <Label htmlFor={`depth-${d.value}`} className="font-normal cursor-pointer">
                    {d.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* ── Design Accordion ── */}
          <Collapsible open={designOpen} onOpenChange={setDesignOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-primary transition-colors py-1">
              <ChevronRight className={cn("h-4 w-4 transition-transform", designOpen && "rotate-90")} />
              Design-Einstellungen
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">Design erben von Firma oder anpassen</p>
              <RadioGroup value={designMode} onValueChange={(v) => setDesignMode(v as "firm" | "custom")} disabled={loading}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="firm" id="design-firm" />
                  <Label htmlFor="design-firm" className="font-normal cursor-pointer text-sm">
                    Von Firma übernehmen: <span className="font-medium">{firmDesignLabel}</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="design-custom" />
                  <Label htmlFor="design-custom" className="font-normal cursor-pointer text-sm">
                    Für diesen Cluster anpassen
                  </Label>
                </div>
              </RadioGroup>

              {designMode === "custom" && (
                <div className="space-y-3 pl-1">
                  <div className="grid grid-cols-3 gap-1.5">
                    {PALETTES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPalette(p)}
                        className={cn(
                          "rounded-md border p-1.5 text-left transition-all hover:shadow-sm cursor-pointer",
                          designPhilosophy === p.id
                            ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                            : "border-border hover:border-muted-foreground/40"
                        )}
                      >
                        <p className="text-[10px] font-bold leading-tight truncate">{p.name}</p>
                        <div className="flex gap-0.5 mt-1">
                          {p.colors.map((c, i) => (
                            <span key={i} className="inline-block h-3 w-3 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={designCustom}
                    onChange={(e) => setDesignCustom(e.target.value)}
                    placeholder="Eigene Design-Beschreibung..."
                    rows={2}
                    disabled={loading}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* ── Keyword-Kontext (always visible) ── */}
          <div className="space-y-3 border-t pt-3">
            <Label className="text-sm font-medium">Zusätzlicher Kontext für bessere Ergebnisse</Label>

            <div className="space-y-1.5">
              <Label className="text-xs">Zielgruppe</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZIELGRUPPEN.map((z) => (
                    <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Spezifische Details zum Thema</Label>
              <Textarea
                value={themeContext}
                onChange={(e) => setThemeContext(e.target.value)}
                placeholder={"Modellnummern, Fehlercodes, Symptome, technische Besonderheiten...\nz.B.: WMB71643PTW, E3 Fehlercode, Einlaufventil defekt, häufig ab Baujahr 2018"}
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Warum diese Firma? (Wettbewerbsvorteile)</Label>
              <Textarea
                value={differentiation}
                onChange={(e) => setDifferentiation(e.target.value)}
                placeholder={"Was bietet ihr konkret was Wettbewerber nicht bieten?\nz.B.: Einziger Miele-Spezialist in Pankow, Originalteile auf Lager, Reparatur gleicher Tag möglich"}
                rows={2}
                disabled={loading}
              />
            </div>
          </div>

          {/* Firm info */}
          {activeFirm && (
            <p className="text-xs text-muted-foreground">
              Firma: <span className="font-medium text-foreground">{activeFirm.name}</span>
              {activeFirm.city && ` · ${activeFirm.city}`}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                <Button variant="ghost" size="sm" className="mt-1 h-7 gap-1 px-2" onClick={handleRetry}>
                  <RotateCcw className="h-3 w-3" /> Erneut versuchen
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {loadingMsg}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!mainKeyword.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiere…
              </>
            ) : (
              "Cluster-Plan generieren"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
