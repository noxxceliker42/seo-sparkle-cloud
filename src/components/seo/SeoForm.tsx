import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { LandingPageAccordion } from "./LandingPageAccordion";
import { FirmSelector, type Firm } from "./FirmSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────

export interface SeoFormData {
  // A — Keyword & Intent
  keyword: string;
  intent: string;
  pageType: string;
  pillarTier: string;
  branche: string;
  sprache: string;
  uspFokus: string;
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
  email: string;
  oeffnungszeiten: string;
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
  outputMode: string;
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
  // L — Landingpage / Sales-Funnel (optional, nur bei isLandingPageType)
  landingPageGoal?: string;
  mainHeadline?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  videoUrl?: string;
  countdownActive?: boolean;
  countdownEndDate?: string;
  countdownText?: string;
  urgencyBarActive?: boolean;
  urgencyBarText?: string;
  guaranteeTitle?: string;
  guaranteeText?: string;
  socialProofCustomers?: string;
  socialProofRating?: string;
  socialProofReviews?: string;
  socialProofYears?: string;
  socialProofWidgetActive?: boolean;
  painPoints?: string[];
  personas?: { emoji: string; title: string; description: string }[];
  bonusStack?: { title: string; value: string }[];
  leadMagnetTitle?: string;
  leadMagnetDescription?: string;
  formType?: string;
}

interface AutoFilledFields {
  [key: string]: boolean;
}

export interface SeoFormProps {
  initialData: Partial<SeoFormData> & { firmId?: string | null };
  autoFilledFields: AutoFilledFields;
  onSubmit: (data: SeoFormData) => void;
  onBack: () => void;
  onFirmChange?: (firm: Firm | null) => void;
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
const PAGE_TYPE_OPTIONS = [
  { value: "pillar_page", label: "Pillar Page — Hauptthema des Clusters" },
  { value: "service", label: "Service-Seite — Dienstleistungsangebot" },
  { value: "fehlercode", label: "Fehlercode-Seite — Fehlercode + Lösung" },
  { value: "supporting_info", label: "Supporting Informational — Ratgeber/Info" },
  { value: "supporting_commercial", label: "Supporting Commercial — Vergleich/Entscheidung" },
  { value: "transactional", label: "Transactional — Ortsteil/lokale Landingpage" },
  { value: "deep_page", label: "Deep Page — Spezifisches Thema/Modell" },
  { value: "blog", label: "Blog / Ratgeber-Artikel" },
  { value: "salesfunnel_leadgen", label: "🎯 Sales Funnel — Lead Generation" },
  { value: "salesfunnel_ecommerce", label: "🛒 Sales Funnel — E-Commerce/Direktkauf" },
  { value: "landingpage_service", label: "📞 Landingpage — Service/Lokal" },
  { value: "landingpage_local", label: "📍 Landingpage — Ortsteil/Stadt" },
];

export const LANDINGPAGE_TYPES = [
  "salesfunnel_leadgen",
  "salesfunnel_ecommerce",
  "landingpage_service",
  "landingpage_local",
] as const;

export function isLandingPageType(pageType: string): boolean {
  return (LANDINGPAGE_TYPES as readonly string[]).includes(pageType);
}
const PILLAR_TIERS = [
  { value: "1", label: "Tier 1", desc: "Haupt-Pillar", sub: "Brand oder Generic Hauptseite" },
  { value: "2", label: "Tier 2", desc: "Device-Pillar", sub: "Gerätetyp oder Unterkategorie" },
  { value: "3", label: "Tier 3", desc: "Cluster-Seite", sub: "Deep Page oder Ortsteil" },
];
const BRANCHEN = [
  { value: "hausgeraete", label: "Hausgeräte" },
  { value: "kfz", label: "KFZ / Automobile" },
  { value: "immobilien", label: "Immobilien" },
  { value: "gesundheit", label: "Gesundheit / Medizin" },
  { value: "handwerk", label: "Handwerk / Bau" },
  { value: "gastronomie", label: "Gastronomie" },
  { value: "steuer-recht", label: "Steuer / Recht" },
  { value: "it-tech", label: "IT / Technologie" },
  { value: "beauty-wellness", label: "Beauty / Wellness" },
  { value: "bildung", label: "Bildung / Coaching" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "bau-sanierung", label: "Bau / Sanierung" },
];
const SPRACHEN = [
  { value: "de", label: "DE", name: "Deutsch" },
  { value: "en", label: "EN", name: "Englisch" },
  { value: "tr", label: "TR", name: "Türkçe" },
];
const DESIGN_PRESETS = [
  { id: "trust", label: "Trust & Service", color: "#1d4ed8", desc: "Professionell & vertrauenswürdig", gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)" },
  { id: "glassmorphism", label: "Midnight Executive", color: "#3b82f6", desc: "Premium & dunkel", gradient: "linear-gradient(135deg, #0f172a, #1e3a8a)" },
  { id: "editorial", label: "Clean Editorial", color: "#1c1917", desc: "Minimalistisch & textstark", gradient: "linear-gradient(135deg, #fafaf9, #d6d3d1)" },
  { id: "eco", label: "Eco Service", color: "#065f46", desc: "Nachhaltig & organisch", gradient: "linear-gradient(135deg, #065f46, #16a34a)" },
  { id: "craft", label: "Warm Craft", color: "#9a3412", desc: "Handwerklich & warm", gradient: "linear-gradient(135deg, #9a3412, #fb923c)" },
  { id: "tech", label: "Tech Precision", color: "#0c4a6e", desc: "Technisch & präzise", gradient: "linear-gradient(135deg, #0c4a6e, #0284c7)" },
];
const TONE_OPTIONS = ["Sachlich-kompetent", "Freundlich-nahbar", "Direkt-verkaufend"];
const IMAGE_STRATEGIES = ["NanoBanana KI", "Upload + Alt-Text", "Platzhalter"];
const SCHEMA_OPTIONS = ["FAQPage", "HowTo", "LocalBusiness", "BreadcrumbList", "Service", "AggregateRating", "SpeakableSpec", "ImageObject"];

// ─── NAP Validation ───────────────────────────────────────────────────────

const INVALID_PATTERNS = [
  'k.a.', 'k.A.', 'tbd', 'n/a', 'na', 'none',
  'unerreichbar', 'unbekannt', 'asd', 'test', 'xxx',
  'platzhalter', 'placeholder', '123', '000',
  'beispiel', 'mustermann', 'muster',
];

function validateNapField(value: string, fieldName: string, minLength = 3): string | null {
  if (!value || value.trim().length < minLength) return `${fieldName} ist zu kurz oder leer`;
  const lower = value.trim().toLowerCase();
  if (INVALID_PATTERNS.some((p) => p.length > 0 && lower.includes(p))) return `${fieldName} enthält ungültigen Wert`;
  return null;
}

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.length < 6) return 'Telefon zu kurz';
  if (!/\d{4,}/.test(cleaned)) return 'Telefon ungültig — keine Ziffern erkannt';
  return null;
}

function validateWebsite(url: string): string | null {
  if (!url || url.trim().length < 4) return null; // website is optional
  const trimmed = url.trim().toLowerCase();
  // Accept URLs with protocol, www prefix, or plain domain names (e.g. "example.de")
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.')) return null;
  // Accept if it looks like a domain (contains a dot with TLD)
  if (/^[a-z0-9äöüß][a-z0-9äöüß\-]*\.[a-z]{2,}/.test(trimmed)) return null;
  // Accept plain brand/company names without dots (not a URL, but not an error)
  return null;
}

function checkNapValidity(form: SeoFormData): string[] {
  const errors: string[] = [];
  const e1 = validateNapField(form.firmName, 'Firmenname', 3);
  if (e1) errors.push(e1);
  const e2 = validateNapField(form.street, 'Straße', 5);
  if (e2) errors.push(e2);
  const e3 = validateNapField(form.city, 'Stadt', 4);
  if (e3) errors.push(e3);
  const e4 = validatePhone(form.phone);
  if (e4) errors.push(e4);
  const e5 = validateWebsite(form.website);
  if (e5) errors.push(e5);
  return errors;
}

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
  keyword: "", intent: "", pageType: "pillar_page", pillarTier: "1", branche: "hausgeraete", sprache: "de", uspFokus: "", secondaryKeywords: "", lsiTerms: "",
  negativeKeywords: "", pillarUrl: "", pillarTitle: "", siblingPages: "",
  deepPages: "", contentGap: "", paaQuestions: "", firmName: "", street: "",
  zip: "", city: "", phone: "", website: "", email: "", oeffnungszeiten: "", serviceArea: "", uniqueData: "",
  authorName: "", authorTitle: "", experienceYears: "", certificates: "",
  reviewer: "", caseStudy: "", kvaPrice: "", priceRange: "", priceCard1: "",
  priceCard2: "", priceCard3: "", repairVsBuy: "", outputMode: "standalone",
  designPreset: "trust", primaryColor: "#1d4ed8", toneOfVoice: "Sachlich-kompetent",
  imageStrategy: "NanoBanana KI", schemaBlocks: ["FAQPage", "HowTo"],
  breadcrumb: "", rating: "4.9", reviewCount: "", informationGain: "",
  discoverReady: "Ja-Bild vorhanden", comparativeCheck: "Noch ausstehend",
  activeSections: CORE_SECTIONS.map((s) => s.id),
  // Landingpage defaults
  landingPageGoal: "call",
  mainHeadline: "",
  primaryCtaText: "",
  secondaryCtaText: "",
  videoUrl: "",
  countdownActive: false,
  countdownEndDate: "",
  countdownText: "Angebot endet in:",
  urgencyBarActive: false,
  urgencyBarText: "",
  guaranteeTitle: "",
  guaranteeText: "",
  socialProofCustomers: "",
  socialProofRating: "",
  socialProofReviews: "",
  socialProofYears: "",
  socialProofWidgetActive: true,
  painPoints: ["", "", "", "", "", ""],
  personas: [
    { emoji: "", title: "", description: "" },
    { emoji: "", title: "", description: "" },
    { emoji: "", title: "", description: "" },
  ],
  bonusStack: [
    { title: "", value: "" },
    { title: "", value: "" },
    { title: "", value: "" },
  ],
  leadMagnetTitle: "",
  leadMagnetDescription: "",
  formType: "multistep",
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

function FieldWrapper({ label, required, autoFilled, action, children }: {
  label: string; required?: boolean; autoFilled?: boolean; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label}{required && <RequiredMark />}{autoFilled && <AutoBadge />}
        </Label>
        {action}
      </div>
      {children}
    </div>
  );
}

function AiButton({ loading, onClick, label = "KI-Vorschlag" }: {
  loading: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {label}
    </button>
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

export function SeoForm({ initialData, autoFilledFields, onSubmit, onBack, onFirmChange }: SeoFormProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SeoFormData>(() => ({ ...DEFAULT_FORM, ...initialData }));
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(
    (initialData as { firmId?: string | null })?.firmId || null,
  );

  // Sync initialData on mount / when it changes (e.g. cluster firm)
  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialData }));
    const fid = (initialData as { firmId?: string | null })?.firmId;
    if (fid) setSelectedFirmId(fid);
  }, [initialData]);

  const update = useCallback(<K extends keyof SeoFormData>(key: K, value: SeoFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFirmSelect = useCallback((firm: Firm | null) => {
    if (!firm) {
      setSelectedFirmId(null);
      onFirmChange?.(null);
      return;
    }
    setSelectedFirmId(firm.id);
    setForm((prev) => ({
      ...prev,
      firmName: firm.name || "",
      street: firm.street || "",
      zip: firm.zip || "",
      city: firm.city || "",
      phone: firm.phone || "",
      email: firm.email || "",
      website: firm.website || "",
      serviceArea: firm.service_area || "",
      oeffnungszeiten: firm.oeffnungszeiten || "",
      authorName: firm.author || "",
      authorTitle: firm.author_title || "",
      experienceYears: firm.author_experience?.toString() || "",
      certificates: firm.author_certs || "",
      rating: firm.rating?.toString() || prev.rating,
      reviewCount: firm.review_count?.toString() || "",
      primaryColor: firm.primary_color || prev.primaryColor,
      branche: firm.branche || prev.branche,
      sprache: firm.sprache || prev.sprache,
    }));
    onFirmChange?.(firm);
    toast.success(`Firmendaten von "${firm.name}" übernommen`);
  }, [onFirmChange]);


  // ─── KI-Vorschläge ────────────────────────────────────────────────────────
  const [suggestingField, setSuggestingField] = useState<string | null>(null);

  const fetchSuggestions = useCallback(
    async (field: string, apply: (data: Record<string, unknown>) => void) => {
      setSuggestingField(field);
      try {
        const { data, error } = await supabase.functions.invoke("generate-field-suggestions", {
          body: {
            keyword: form.keyword || "",
            pageType: form.pageType || "service",
            firm: form.firmName || "",
            branche: form.branche || "hausgeraete",
            targetAudience: "privatkunden",
            field,
          },
        });
        if (error) throw error;
        if (data && typeof data === "object") {
          apply(data as Record<string, unknown>);
          toast.success("KI-Vorschlag übernommen", {
            description: "Bitte prüfen und ggf. anpassen.",
          });
        }
      } catch (err) {
        console.error("AI Suggestion Error:", err);
        toast.error("KI-Vorschlag fehlgeschlagen", {
          description: "Bitte manuell ausfüllen.",
        });
      } finally {
        setSuggestingField(null);
      }
    },
    [form.keyword, form.pageType, form.firmName, form.branche],
  );

  const applyString = useCallback(
    <K extends keyof SeoFormData>(key: K) =>
      (data: Record<string, unknown>) => {
        const v = data[key as string];
        if (typeof v === "string") update(key, v as SeoFormData[K]);
      },
    [update],
  );

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
  const napErrors = useMemo(() => currentStepId === "C" ? checkNapValidity(form) : [], [currentStepId, form]);
  const canProceed = stepRequired.every((f) => {
    const v = form[f];
    return typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : !!v;
  }) && napErrors.length === 0;

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
        <select
          value={form.pageType || "pillar_page"}
          onChange={(e) => update("pageType", e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {PAGE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground mt-1">Bestimmt aktive Sektionen und Schema-Auswahl</p>
      </FieldWrapper>
      <FieldWrapper label="Pillar-Tier">
        <div className="grid grid-cols-3 gap-2">
          {PILLAR_TIERS.map((tier) => (
            <div
              key={tier.value}
              onClick={() => update("pillarTier", tier.value)}
              className={`cursor-pointer rounded-lg border-2 p-2.5 text-center transition-colors ${
                form.pillarTier === tier.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div className={`font-bold text-[13px] ${form.pillarTier === tier.value ? "text-primary" : "text-foreground"}`}>{tier.label}</div>
              <div className={`text-[11px] font-semibold mt-0.5 ${form.pillarTier === tier.value ? "text-primary" : "text-muted-foreground"}`}>{tier.desc}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{tier.sub}</div>
            </div>
          ))}
        </div>
      </FieldWrapper>
      <FieldWrapper label="Branche">
        <select value={form.branche} onChange={(e) => update("branche", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground">
          {BRANCHEN.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </FieldWrapper>
      <FieldWrapper label="Seitensprache">
        <div className="grid grid-cols-3 gap-2">
          {SPRACHEN.map((lang) => (
            <div
              key={lang.value}
              onClick={() => update("sprache", lang.value)}
              className={`cursor-pointer rounded-lg border-2 p-2.5 text-center transition-colors ${
                form.sprache === lang.value
                  ? "border-cyan-600 bg-cyan-50"
                  : "border-border bg-background hover:border-cyan-400"
              }`}
            >
              <div className={`font-bold text-sm ${form.sprache === lang.value ? "text-cyan-700" : "text-foreground"}`}>{lang.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{lang.name}</div>
            </div>
          ))}
        </div>
      </FieldWrapper>
      <FieldWrapper
        label="Sekundär-Keywords"
        autoFilled={isAuto("secondaryKeywords")}
        action={
          <AiButton
            loading={suggestingField === "secondaryKeywords"}
            onClick={() => fetchSuggestions("secondaryKeywords", applyString("secondaryKeywords"))}
          />
        }
      >
        <Textarea value={form.secondaryKeywords} onChange={(e) => update("secondaryKeywords", e.target.value)} className={inputClass("secondaryKeywords")} rows={3} />
      </FieldWrapper>
      <FieldWrapper
        label="LSI-Begriffe"
        autoFilled={isAuto("lsiTerms")}
        action={
          <AiButton
            loading={suggestingField === "lsiTerms"}
            onClick={() => fetchSuggestions("lsiTerms", applyString("lsiTerms"))}
          />
        }
      >
        <Textarea value={form.lsiTerms} onChange={(e) => update("lsiTerms", e.target.value)} className={inputClass("lsiTerms")} rows={3} />
      </FieldWrapper>
      <FieldWrapper label="Negative Keywords">
        <Textarea value={form.negativeKeywords} onChange={(e) => update("negativeKeywords", e.target.value)} rows={2} placeholder="Keywords die NICHT genutzt werden sollen" />
      </FieldWrapper>
      <FieldWrapper label="Pillar-URL">
        <Input value={form.pillarUrl} onChange={(e) => update("pillarUrl", e.target.value)} placeholder="https://example.com/pillar-page" />
      </FieldWrapper>
      <FieldWrapper
        label="Wettbewerbs-USP"
        action={
          <AiButton
            loading={suggestingField === "uspFokus"}
            onClick={() => fetchSuggestions("uspFokus", applyString("uspFokus"))}
          />
        }
      >
        <Textarea value={form.uspFokus} onChange={(e) => update("uspFokus", e.target.value)} rows={3} placeholder="Was unterscheidet diesen Betrieb von Wettbewerbern für dieses Keyword? z.B. Einziger Betrieb mit 24h-Notdienst, günstigste Anfahrt, 20 Jahre Erfahrung..." />
        <p className="text-[10px] text-muted-foreground mt-1">Steuert Conversion-Texte und EEAT-Differenzierung der Seite</p>
      </FieldWrapper>

      {isLandingPageType(form.pageType) && (
        <LandingPageAccordion form={form} update={update} />
      )}
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
      <FieldWrapper
        label="Content-Gap"
        required
        action={
          <AiButton
            loading={suggestingField === "contentGap"}
            onClick={() => fetchSuggestions("contentGap", applyString("contentGap"))}
          />
        }
      >
        <Textarea value={form.contentGap} onChange={(e) => update("contentGap", e.target.value)} rows={4} placeholder="Was haben die Top-3, was hier fehlt?" className={!form.contentGap.trim() ? "border-red-500" : ""} />
      </FieldWrapper>
      <FieldWrapper
        label="PAA-Fragen (Kie.AI + DataForSEO)"
        autoFilled={isAuto("paaQuestions")}
        action={
          <AiButton
            loading={suggestingField === "paaQuestions"}
            onClick={() => fetchSuggestions("paaQuestions", applyString("paaQuestions"))}
          />
        }
      >
        <Textarea value={form.paaQuestions} onChange={(e) => update("paaQuestions", e.target.value)} className={inputClass("paaQuestions")} rows={6} />
      </FieldWrapper>
    </div>
  );

  const renderStepC = () => (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Firma auswählen</Label>
        <FirmSelector selectedFirmId={selectedFirmId} onFirmChange={handleFirmSelect} />
        {selectedFirmId && form.firmName && (
          <p className="text-[11px] text-green-700">
            ✓ Felder aus "{form.firmName}" übernommen — du kannst sie unten anpassen.
          </p>
        )}
      </div>
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
      <FieldWrapper label="E-Mail">
        <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="info@firma.de" className={inputClass("email")} />
      </FieldWrapper>
      <FieldWrapper label="Öffnungszeiten / Verfügbarkeit">
        <Input value={form.oeffnungszeiten} onChange={(e) => update("oeffnungszeiten", e.target.value)} placeholder="Mo-Fr 8-18 Uhr, Sa 9-14 Uhr" />
      </FieldWrapper>
      <FieldWrapper
        label="Unique Data"
        required
        action={
          <AiButton
            loading={suggestingField === "uniqueData"}
            onClick={() => fetchSuggestions("uniqueData", applyString("uniqueData"))}
          />
        }
      >
        <p className="text-xs text-muted-foreground mb-1">Eigene Zahlen, Erfahrungswerte, Statistiken — kein API ersetzt das!</p>
        <Textarea value={form.uniqueData} onChange={(e) => update("uniqueData", e.target.value)} rows={4} className={!form.uniqueData.trim() ? "border-red-500" : ""} placeholder="z.B. '2.847 Reparaturen in 2025', 'Durchschnittl. Anfahrt 22 Min.'" />
      </FieldWrapper>

      {napErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mt-2">
          <div className="font-bold text-xs text-red-800 mb-2 flex items-center gap-1.5">
            ⚠ NAP-Validierung fehlgeschlagen
          </div>
          {napErrors.map((err, i) => (
            <div key={i} className="text-[11px] text-red-700 py-0.5 flex items-center gap-1.5">
              <span>✕</span> {err}
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-red-200">
            Echte Firmendaten sind Pflicht — ungültige NAP-Daten erzeugen wertlose Schema-Markups und können Google Manual Actions auslösen.
          </div>
        </div>
      )}
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

  const OUTPUT_MODES = [
    { value: "standalone", label: "Standalone", desc: "Reines HTML", detail: "Volle Freiheit, alle modernen Features" },
    { value: "wordpress", label: "WordPress", desc: "Gutenberg / WP", detail: "Style-Block, UTF-8, moderne Tags" },
    { value: "tinymce", label: "Contao / TinyMCE", desc: "TinyMCE-safe", detail: "Kein Script, Inline-CSS, HTML-Entities" },
  ];

  const renderStepF = () => (
    <div className="space-y-5">
      <FieldWrapper label="CMS / Output-Mode">
        <div className="grid grid-cols-3 gap-2">
          {OUTPUT_MODES.map((mode) => (
            <div
              key={mode.value}
              onClick={() => update("outputMode", mode.value)}
              className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-colors ${
                form.outputMode === mode.value
                  ? "border-[#7c3aed] bg-[#f5f3ff]"
                  : "border-border bg-background hover:border-[#7c3aed]/40"
              }`}
            >
              <div className={`font-bold text-[13px] ${form.outputMode === mode.value ? "text-[#7c3aed]" : "text-foreground"}`}>{mode.label}</div>
              <div className={`text-[11px] font-semibold mt-0.5 ${form.outputMode === mode.value ? "text-[#7c3aed]" : "text-muted-foreground"}`}>{mode.desc}</div>
              <div className="text-[9px] text-muted-foreground mt-1">{mode.detail}</div>
            </div>
          ))}
        </div>
      </FieldWrapper>
      <FieldWrapper label="Design-Paket">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DESIGN_PRESETS.map((dp) => (
            <button
              key={dp.id}
              type="button"
              onClick={() => { update("designPreset", dp.id); update("primaryColor", dp.color); }}
              className={`relative rounded-xl overflow-hidden text-left transition-all ${
                form.designPreset === dp.id
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "ring-1 ring-border hover:ring-primary/50"
              }`}
            >
              <div className="h-16 w-full" style={{ background: dp.gradient }} />
              <div className="p-3 bg-card">
                <p className="text-sm font-bold text-foreground">{dp.label}</p>
                <p className="text-[11px] text-muted-foreground">{dp.desc}</p>
              </div>
              {form.designPreset === dp.id && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-[10px] font-bold">✓</span>
                </div>
              )}
            </button>
          ))}
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
      <FieldWrapper
        label="Information Gain"
        required
        autoFilled={isAuto("informationGain")}
        action={
          <AiButton
            loading={suggestingField === "informationGain"}
            onClick={() => fetchSuggestions("informationGain", applyString("informationGain"))}
          />
        }
      >
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
            className="min-h-[44px] gap-2 bg-green-600 hover:bg-green-700"
          >
            Weiter zum QA-Gate →
          </Button>
        )}
      </div>
    </div>
  );
}
