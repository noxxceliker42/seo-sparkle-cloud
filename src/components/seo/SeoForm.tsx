import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

export interface SeoFormData {
  // A — Keyword & Intent
  keyword: string;
  intent: string;
  pageType: string;
  secondaryKeywords: string;
  lsiTerms: string;
  negativeKeywords: string;
  pillarUrl: string;
  // B — Cluster & Verlinkung
  pillarTitle: string;
  siblingPages: string;
  deepPages: string;
  contentGap: string;
  paaQuestions: string;
  // C — Unternehmen / NAP
  firmName: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  website: string;
  serviceArea: string;
  uniqueData: string;
  // D — Autor / E-E-A-T
  authorName: string;
  authorTitle: string;
  experienceYears: string;
  certificates: string;
  reviewer: string;
  caseStudy: string;
  // E — Preise & Risikoumkehr
  kvaPrice: string;
  priceRange: string;
  priceCard1: string;
  priceCard2: string;
  priceCard3: string;
  repairVsBuy: string;
  // F — Design & Bild
  designPreset: string;
  primaryColor: string;
  toneOfVoice: string;
  imageStrategy: string;
  // G — Schema
  schemaBlocks: string[];
  breadcrumb: string;
  rating: string;
  reviewCount: string;
  // H — 2026 Updates
  informationGain: string;
  discoverReady: string;
  comparativeCheck: string;
  // S — Sektionen
  activeSections: string[];
}

interface AutoFilledFields {
  [key: string]: boolean;
}

export interface SeoFormProps {
  initialData: Partial<SeoFormData>;
  autoFilledFields: AutoFilledFields;
  onSubmit: (data: SeoFormData) => void;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────

const STEPS = [
  { id: "A", label: "Keyword & Intent" },
  { id: "B", label: "Cluster & Verlinkung" },
  { id: "C", label: "Unternehmen / NAP" },
  { id: "D", label: "Autor / E-E-A-T" },
  { id: "E", label: "Preise & Risiko" },
  { id: "F", label: "Design & Bild" },
  { id: "G", label: "Schema" },
  { id: "H", label: "2026 Updates" },
  { id: "S", label: "Sektionen" },
];

const INTENTS = ["Informational", "Commercial", "Transactional", "Local"];
const PAGE_TYPES = ["Pillar Page", "Supporting Info", "Supporting Commercial", "Transactional/Local", "Deep Page"];
const DESIGN_PRESETS = [
  { id: "trust", label: "Trust & Service", color: "#1d4ed8" },
  { id: "professional", label: "Professional", color: "#374151" },
  { id: "eco", label: "Eco", color: "#16a34a" },
  { id: "premium", label: "Premium", color: "#7c3aed" },
  { id: "warm", label: "Warm", color: "#ea580c" },
  { id: "minimal", label: "Minimal", color: "#525252" },
];
const TONE_OPTIONS = ["Sachlich-kompetent", "Freundlich-nahbar", "Direkt-verkaufend"];
const IMAGE_STRATEGIES = ["NanoBanana KI", "Upload + Alt-Text", "Platzhalter"];
const SCHEMA_OPTIONS = ["FAQPage", "HowTo", "LocalBusiness", "BreadcrumbList", "Service", "AggregateRating", "SpeakableSpec", "ImageObject"];

const CORE_SECTIONS = [
  { id: "01", label: "Hero-Sektion" },
  { id: "02", label: "Problem-Spiegelung" },
  { id: "04", label: "Symptome + Ursachen" },
  { id: "05", label: "Selbsthilfe (HowTo)" },
  { id: "07", label: "Unique Data Sektion" },
  { id: "08", label: "Information Gain" },
  { id: "09", label: "Ablauf vor Ort" },
  { id: "10", label: "Preise + Risikoumkehr" },
  { id: "14", label: "FAQ" },
  { id: "15", label: "Autor + Kontakt" },
];
const OPTIONAL_SECTIONS = [
  { id: "03", label: "TOC (Inhaltsverzeichnis)" },
  { id: "06", label: "Fehlercode-Liste" },
  { id: "11", label: "Reparatur vs. Neukauf" },
  { id: "12", label: "Qualität" },
  { id: "13", label: "Marken" },
];

const REQUIRED_FIELDS: Record<string, (keyof SeoFormData)[]> = {
  A: ["keyword"],
  B: ["contentGap"],
  C: ["firmName", "city", "phone", "uniqueData"],
  D: ["authorName"],
  E: [],
  F: [],
  G: [],
  H: ["informationGain"],
  S: [],
};

const DEFAULT_FORM: SeoFormData = {
  keyword: "", intent: "", pageType: "", secondaryKeywords: "", lsiTerms: "",
  negativeKeywords: "", pillarUrl: "", pillarTitle: "", siblingPages: "",
  deepPages: "", contentGap: "", paaQuestions: "", firmName: "", street: "",
  zip: "", city: "", phone: "", website: "", serviceArea: "", uniqueData: "",
  authorName: "", authorTitle: "", experienceYears: "", certificates: "",
  reviewer: "", caseStudy: "", kvaPrice: "", priceRange: "", priceCard1: "",
  priceCard2: "", priceCard3: "", repairVsBuy: "", designPreset: "trust",
  primaryColor: "#1d4ed8", toneOfVoice: "Sachlich-kompetent",
  imageStrategy: "NanoBanana KI", schemaBlocks: ["FAQPage", "HowTo"],
  breadcrumb: "", rating: "4.9", reviewCount: "", informationGain: "",
  discoverReady: "Ja-Bild vorhanden", comparativeCheck: "Noch ausstehend",
  activeSections: CORE_SECTIONS.map((s) => s.id),
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function AutoBadge() {
  return (
    <Badge className="ml-2 bg-green-100 text-green-800 text-[10px] px-1.5 py-0 h-4 hover:bg-green-100">
      Auto-befüllt
    </Badge>
  );
}

function RequiredMark() {
  return <span className="text-red-600 ml-0.5">*</span>;
}

function FieldWrapper({ label, required, autoFilled, children }: {
  label: string; required?: boolean; autoFilled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <RequiredMark />}{autoFilled && <AutoBadge />}
      </Label>
      {children}
    </div>
  );
}

function ButtonGroup({ options, value, onChange, className }: {
  options: string[]; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className || ""}`}>
      {options.map((opt) => (
        <Button
          key={opt}
          type="button"
          variant={value === opt ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(opt)}
          className="min-h-[44px] text-sm"
        >
          {opt}
        </Button>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function SeoForm({ initialData, autoFilledFields, onSubmit, onBack }: SeoFormProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SeoFormData>(() => ({ ...DEFAULT_FORM, ...initialData }));

  // Sync initialData on mount
  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  const update = useCallback(<K extends keyof SeoFormData>(key: K, value: SeoFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isAuto = useCallback((key: string) => !!autoFilledFields[key], [autoFilledFields]);

  const inputClass = useCallback((key: string) =>
    isAuto(key) ? "bg-green-50 border-green-300" : "", [isAuto]);

  // SEO Score calculation
  const seoScore = useMemo(() => {
    const allRequired = Object.values(REQUIRED_FIELDS).flat();
    if (allRequired.length === 0) return 100;
    const filled = allRequired.filter((f) => {
      const v = form[f];
      return typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : !!v;
    });
    return Math.round((filled.length / allRequired.length) * 100);
  }, [form]);

  const currentStepId = STEPS[step].id;
  const stepRequired = REQUIRED_FIELDS[currentStepId] || [];
  const canProceed = stepRequired.every((f) => {
    const v = form[f];
    return typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : !!v;
  });

  const toggleSchema = useCallback((schema: string) => {
    setForm((prev) => {
      const blocks = prev.schemaBlocks.includes(schema)
        ? prev.schemaBlocks.filter((s) => s !== schema)
        : [...prev.schemaBlocks, schema];
      return { ...prev, schemaBlocks: blocks };
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    if (CORE_SECTIONS.some((s) => s.id === sectionId)) return; // core can't be toggled
    setForm((prev) => {
      const sections = prev.activeSections.includes(sectionId)
        ? prev.activeSections.filter((s) => s !== sectionId)
        : [...prev.activeSections, sectionId];
      return { ...prev, activeSections: sections };
    });
  }, []);

  // ─── Step Renderers ──────────────────────────────────────────────────────

  const renderStepA = () => (
    <div className="space-y-5">
      <FieldWrapper label="Primär-Keyword" required autoFilled={isAuto("keyword")}>
        <Input value={form.keyword} readOnly className={`${inputClass("keyword")} ${!form.keyword.trim() ? "border-red-500" : ""}`} />
      </FieldWrapper>
      <FieldWrapper label="Search Intent" autoFilled={isAuto("intent")}>
        <ButtonGroup options={INTENTS} value={form.intent} onChange={(v) => update("intent", v)} />
      </FieldWrapper>
      <FieldWrapper label="Seitentyp" autoFilled={isAuto("pageType")}>
        <ButtonGroup options={PAGE_TYPES} value={form.pageType} onChange={(v) => update("pageType", v)} />
      </FieldWrapper>
      <FieldWrapper label="Sekundär-Keywords" autoFilled={isAuto("secondaryKeywords")}>
        <Textarea value={form.secondaryKeywords} onChange={(e) => update("secondaryKeywords", e.target.value)} className={inputClass("secondaryKeywords")} rows={3} />
      </FieldWrapper>
      <FieldWrapper label="LSI-Begriffe" autoFilled={isAuto("lsiTerms")}>
        <Textarea value={form.lsiTerms} onChange={(e) => update("lsiTerms", e.target.value)} className={inputClass("lsiTerms")} rows={3} />
      </FieldWrapper>
      <FieldWrapper label="Negative Keywords">
        <Textarea value={form.negativeKeywords} onChange={(e) => update("negativeKeywords", e.target.value)} rows={2} placeholder="Keywords die NICHT genutzt werden sollen" />
      </FieldWrapper>
      <FieldWrapper label="Pillar-URL">
        <Input value={form.pillarUrl} onChange={(e) => update("pillarUrl", e.target.value)} placeholder="https://example.com/pillar-page" />
      </FieldWrapper>
    </div>
  );

  const renderStepB = () => (
    <div className="space-y-5">
      <FieldWrapper label="Pillar-Titel">
        <Input value={form.pillarTitle} onChange={(e) => update("pillarTitle", e.target.value)} />
      </FieldWrapper>
      <FieldWrapper label="Geschwister-Seiten" autoFilled={isAuto("siblingPages")}>
        <Textarea value={form.siblingPages} onChange={(e) => update("siblingPages", e.target.value)} className={inputClass("siblingPages")} rows={4} />
      </FieldWrapper>
      <FieldWrapper label="Deep Pages" autoFilled={isAuto("deepPages")}>
        <Textarea value={form.deepPages} onChange={(e) => update("deepPages", e.target.value)} className={inputClass("deepPages")} rows={3} />
      </FieldWrapper>
      <FieldWrapper label="Content-Gap" required>
        <Textarea value={form.contentGap} onChange={(e) => update("contentGap", e.target.value)} rows={4} placeholder="Was haben die Top-3, was hier fehlt?" className={!form.contentGap.trim() ? "border-red-500" : ""} />
      </FieldWrapper>
      <FieldWrapper label="PAA-Fragen (Kie.AI + DataForSEO)" autoFilled={isAuto("paaQuestions")}>
        <Textarea value={form.paaQuestions} onChange={(e) => update("paaQuestions", e.target.value)} className={inputClass("paaQuestions")} rows={6} />
      </FieldWrapper>
    </div>
  );

  const renderStepC = () => (
    <div className="space-y-5">
      <FieldWrapper label="Firma" required autoFilled={isAuto("firmName")}>
        <Input value={form.firmName} onChange={(e) => update("firmName", e.target.value)} className={`${inputClass("firmName")} ${!form.firmName.trim() ? "border-red-500" : ""}`} />
      </FieldWrapper>
      <FieldWrapper label="Straße + Nr." autoFilled={isAuto("street")}>
        <Input value={form.street} onChange={(e) => update("street", e.target.value)} className={inputClass("street")} />
      </FieldWrapper>
      <div className="grid grid-cols-3 gap-3">
        <FieldWrapper label="PLZ" autoFilled={isAuto("zip")}>
          <Input value={form.zip} onChange={(e) => update("zip", e.target.value)} className={inputClass("zip")} />
        </FieldWrapper>
        <div className="col-span-2">
          <FieldWrapper label="Stadt" required autoFilled={isAuto("city")}>
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} className={`${inputClass("city")} ${!form.city.trim() ? "border-red-500" : ""}`} />
          </FieldWrapper>
        </div>
      </div>
      <FieldWrapper label="Telefon" required autoFilled={isAuto("phone")}>
        <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={`${inputClass("phone")} ${!form.phone.trim() ? "border-red-500" : ""}`} />
      </FieldWrapper>
      <FieldWrapper label="Website" autoFilled={isAuto("website")}>
        <Input value={form.website} onChange={(e) => update("website", e.target.value)} className={inputClass("website")} />
      </FieldWrapper>
      <FieldWrapper label="Servicegebiet" autoFilled={isAuto("serviceArea")}>
        <Input value={form.serviceArea} onChange={(e) => update("serviceArea", e.target.value)} className={inputClass("serviceArea")} />
      </FieldWrapper>
      <FieldWrapper label="Unique Data" required>
        <p className="text-xs text-muted-foreground mb-1">Eigene Zahlen, Erfahrungswerte, Statistiken — kein API ersetzt das!</p>
        <Textarea value={form.uniqueData} onChange={(e) => update("uniqueData", e.target.value)} rows={4} className={!form.uniqueData.trim() ? "border-red-500" : ""} placeholder="z.B. '2.847 Reparaturen in 2025', 'Durchschnittl. Anfahrt 22 Min.'" />
      </FieldWrapper>
    </div>
  );

  const renderStepD = () => (
    <div className="space-y-5">
      <FieldWrapper label="Autor-Name" required>
        <Input value={form.authorName} onChange={(e) => update("authorName", e.target.value)} className={!form.authorName.trim() ? "border-red-500" : ""} />
      </FieldWrapper>
      <FieldWrapper label="Berufsbezeichnung">
        <Input value={form.authorTitle} onChange={(e) => update("authorTitle", e.target.value)} placeholder="z.B. Meister für Haushaltsgeräte" />
      </FieldWrapper>
      <FieldWrapper label="Erfahrung in Jahren">
        <Input type="number" value={form.experienceYears} onChange={(e) => update("experienceYears", e.target.value)} min="0" max="60" />
      </FieldWrapper>
      <FieldWrapper label="Zertifikate">
        <Input value={form.certificates} onChange={(e) => update("certificates", e.target.value)} placeholder="z.B. Bosch-zertifiziert, TÜV" />
      </FieldWrapper>
      <FieldWrapper label="Reviewer / Checker">
        <Input value={form.reviewer} onChange={(e) => update("reviewer", e.target.value)} placeholder="Fachliche Überprüfung durch…" />
      </FieldWrapper>
      <FieldWrapper label="Fallstudie">
        <Textarea value={form.caseStudy} onChange={(e) => update("caseStudy", e.target.value)} rows={4} placeholder="Konkretes Beispiel mit Modellnummer, Datum, Ergebnis" />
      </FieldWrapper>
    </div>
  );

  const renderStepE = () => (
    <div className="space-y-5">
      <FieldWrapper label="KVA-Preis (€)">
        <Input value={form.kvaPrice} onChange={(e) => update("kvaPrice", e.target.value)} placeholder="z.B. 89" />
      </FieldWrapper>
      <FieldWrapper label="Preisspanne">
        <Input value={form.priceRange} onChange={(e) => update("priceRange", e.target.value)} placeholder="z.B. 79–199 €" />
      </FieldWrapper>
      <div className="grid grid-cols-3 gap-3">
        <FieldWrapper label="Preiskarte 1">
          <Textarea value={form.priceCard1} onChange={(e) => update("priceCard1", e.target.value)} rows={3} placeholder="Titel + Preis + Leistungen" />
        </FieldWrapper>
        <FieldWrapper label="Preiskarte 2">
          <Textarea value={form.priceCard2} onChange={(e) => update("priceCard2", e.target.value)} rows={3} />
        </FieldWrapper>
        <FieldWrapper label="Preiskarte 3">
          <Textarea value={form.priceCard3} onChange={(e) => update("priceCard3", e.target.value)} rows={3} />
        </FieldWrapper>
      </div>
      <FieldWrapper label="Reparatur vs. Neukauf Argument">
        <Textarea value={form.repairVsBuy} onChange={(e) => update("repairVsBuy", e.target.value)} rows={3} placeholder="Warum sich die Reparatur lohnt…" />
      </FieldWrapper>
    </div>
  );

  const renderStepF = () => (
    <div className="space-y-5">
      <FieldWrapper label="Design-Paket">
        <div className="grid grid-cols-3 gap-2">
          {DESIGN_PRESETS.map((dp) => (
            <Button
              key={dp.id}
              type="button"
              variant={form.designPreset === dp.id ? "default" : "outline"}
              size="sm"
              onClick={() => { update("designPreset", dp.id); update("primaryColor", dp.color); }}
              className="min-h-[44px] text-sm gap-2"
            >
              <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: dp.color }} />
              {dp.label}
            </Button>
          ))}
        </div>
      </FieldWrapper>
      <FieldWrapper label="Primärfarbe">
        <div className="flex items-center gap-3">
          <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border" />
          <Input value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="w-32 font-mono text-sm" />
        </div>
      </FieldWrapper>
      <FieldWrapper label="Tone of Voice">
        <ButtonGroup options={TONE_OPTIONS} value={form.toneOfVoice} onChange={(v) => update("toneOfVoice", v)} />
      </FieldWrapper>
      <FieldWrapper label="Bild-Strategie">
        <ButtonGroup options={IMAGE_STRATEGIES} value={form.imageStrategy} onChange={(v) => update("imageStrategy", v)} />
      </FieldWrapper>
    </div>
  );

  const renderStepG = () => (
    <div className="space-y-5">
      <FieldWrapper label="Schema-Blöcke" autoFilled={isAuto("schemaBlocks")}>
        <div className="grid grid-cols-2 gap-3">
          {SCHEMA_OPTIONS.map((schema) => (
            <label key={schema} className="flex items-center gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
              <Checkbox
                checked={form.schemaBlocks.includes(schema)}
                onCheckedChange={() => toggleSchema(schema)}
              />
              <span className="text-sm">{schema}</span>
            </label>
          ))}
        </div>
      </FieldWrapper>
      <FieldWrapper label="Breadcrumb">
        <Input value={form.breadcrumb} onChange={(e) => update("breadcrumb", e.target.value)} placeholder="Start > Kategorie > Seite" />
      </FieldWrapper>
      <div className="grid grid-cols-2 gap-3">
        <FieldWrapper label="Rating (1–5)">
          <Input type="number" value={form.rating} onChange={(e) => update("rating", e.target.value)} min="1" max="5" step="0.1" />
        </FieldWrapper>
        <FieldWrapper label="Anzahl Bewertungen">
          <Input type="number" value={form.reviewCount} onChange={(e) => update("reviewCount", e.target.value)} min="0" />
        </FieldWrapper>
      </div>
    </div>
  );

  const renderStepH = () => (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
        <p className="text-xs font-medium text-amber-800">
          ⚠️ Seit März 2026 Core Update Pflicht für Top-Ranking
        </p>
      </div>
      <FieldWrapper label="Information Gain" required autoFilled={isAuto("informationGain")}>
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 hover:bg-amber-500">NEU 2026</Badge>
          <span className="text-xs text-muted-foreground">Was gibt es hier, was kein Wettbewerber hat?</span>
        </div>
        <Textarea
          value={form.informationGain}
          onChange={(e) => update("informationGain", e.target.value)}
          className={`${inputClass("informationGain")} ${!form.informationGain.trim() ? "border-red-500" : ""}`}
          rows={5}
          placeholder="Eigene Daten, exklusive Einblicke, Tests…"
        />
      </FieldWrapper>
      <FieldWrapper label="Discover-Ready">
        <ButtonGroup
          options={["Ja-Bild vorhanden", "NanoBanana generieren", "Platzhalter"]}
          value={form.discoverReady}
          onChange={(v) => update("discoverReady", v)}
        />
      </FieldWrapper>
      <FieldWrapper label="Comparative Value Check">
        <ButtonGroup
          options={["Top-3 analysiert", "Noch ausstehend"]}
          value={form.comparativeCheck}
          onChange={(v) => update("comparativeCheck", v)}
        />
      </FieldWrapper>
    </div>
  );

  const renderStepS = () => (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Kern-Sektionen (nicht deaktivierbar)</h4>
        <div className="space-y-2">
          {CORE_SECTIONS.map((s) => (
            <label key={s.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3 opacity-90">
              <Switch checked disabled />
              <span className="text-sm font-medium">{s.id}. {s.label}</span>
              <Badge variant="outline" className="ml-auto text-[10px]">Pflicht</Badge>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Optionale Sektionen</h4>
        <div className="space-y-2">
          {OPTIONAL_SECTIONS.map((s) => (
            <label key={s.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors">
              <Switch
                checked={form.activeSections.includes(s.id)}
                onCheckedChange={() => toggleSection(s.id)}
              />
              <span className="text-sm font-medium">{s.id}. {s.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const stepRenderers = [renderStepA, renderStepB, renderStepC, renderStepD, renderStepE, renderStepF, renderStepG, renderStepH, renderStepS];

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 flex-1">
          {STEPS.map((s, i) => {
            const isCurrent = i === step;
            const isDone = i < step;
            return (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={`flex-1 rounded-md px-2 py-2 text-xs font-bold transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-green-100 text-green-800"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.id}
              </button>
            );
          })}
        </div>
        {/* SEO Score */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">SEO</span>
          <span className={`text-lg font-bold ${seoScore >= 80 ? "text-green-600" : seoScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {seoScore}%
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${seoScore >= 80 ? "bg-green-500" : seoScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${seoScore}%` }}
        />
      </div>

      {/* Step Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Schritt {STEPS[step].id}: {STEPS[step].label}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {step + 1} von {STEPS.length}
        </p>
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {stepRenderers[step]()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? onBack : () => setStep(step - 1)}
          className="min-h-[44px] gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "Zurück zur Analyse" : "Zurück"}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed}
            className="min-h-[44px] gap-2"
          >
            Weiter
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => onSubmit(form)}
            disabled={seoScore < 50}
            className="min-h-[44px] gap-2 bg-green-600 hover:bg-green-700"
          >
            Weiter zum QA-Gate →
          </Button>
        )}
      </div>
    </div>
  );
}
