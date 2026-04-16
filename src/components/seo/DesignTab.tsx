import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

interface DesignTabProps {
  form: {
    target_audience: string;
    design_philosophy: string;
    design_philosophy_custom: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  };
  setField: (key: string, val: string) => void;
}

export function DesignTab({ form, setField }: DesignTabProps) {
  const selectPalette = (p: typeof PALETTES[0]) => {
    setField("design_philosophy", p.id);
    setField("primary_color", p.colors[0]);
    setField("secondary_color", p.colors[1]);
    setField("accent_color", p.colors[2]);
  };

  return (
    <div className="space-y-5">
      {/* Zielgruppe */}
      <div>
        <Label className="text-xs font-semibold">Primäre Zielgruppe</Label>
        <Select value={form.target_audience} onValueChange={(v) => setField("target_audience", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ZIELGRUPPEN.map((z) => (
              <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Design-Philosophie Palette */}
      <div>
        <Label className="text-xs font-semibold">Design-Stil der Marke</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPalette(p)}
              className={cn(
                "rounded-lg border p-2 text-left transition-all hover:shadow-md cursor-pointer",
                form.design_philosophy === p.id
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <p className="text-[11px] font-bold leading-tight truncate">{p.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 truncate">{p.desc}</p>
              <div className="flex gap-1 mt-1.5">
                {p.colors.map((c, i) => (
                  <span
                    key={i}
                    className="inline-block h-3.5 w-3.5 rounded-full border border-border/50"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom description */}
      <div>
        <Label className="text-xs font-semibold">Eigene Design-Beschreibung (optional)</Label>
        <Textarea
          value={form.design_philosophy_custom}
          onChange={(e) => setField("design_philosophy_custom", e.target.value)}
          placeholder="Beschreibe deinen gewünschten Stil frei, z.B.: Luxuriöser futuristischer Technology-Stil mit dunklen Tönen und goldenen Akzenten..."
          rows={3}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Diese Beschreibung ergänzt oder überschreibt die Palette-Auswahl.
        </p>
      </div>

      {/* Farben */}
      <div>
        <Label className="text-xs font-semibold">Markenfarben (werden mit Palette vorausgefüllt)</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {([
            ["primary_color", "Primär"],
            ["secondary_color", "Sekundär"],
            ["accent_color", "Akzent"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <Label className="text-[10px] text-muted-foreground">{label}</Label>
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="color"
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="h-8 w-8 rounded border border-border cursor-pointer p-0"
                />
                <Input
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="h-8 text-xs font-mono"
                  maxLength={7}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
