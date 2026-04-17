import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { buildMasterPrompt } from "@/lib/buildMasterPrompt";
import { useGenerationJob, clearStuckJob } from "@/hooks/useGenerationJob";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, ChevronRight, Info, Search, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog as PickerDialog,
  DialogContent as PickerDialogContent,
  DialogHeader as PickerDialogHeader,
  DialogTitle as PickerDialogTitle,
} from "@/components/ui/dialog";

const PALETTES = [
  { id: "trust_classic", name: "Trust Classic", colors: ["#1d4ed8", "#ffffff", "#dc2626"] },
  { id: "german_precision", name: "German Precision", colors: ["#374151", "#f3f4f6", "#6b7280"] },
  { id: "handwerk_pro", name: "Handwerk Pro", colors: ["#92400e", "#fef3c7", "#d97706"] },
  { id: "luxury_dark", name: "Luxury Dark", colors: ["#111827", "#d4af37", "#1f2937"] },
  { id: "futuristic_tech", name: "Futuristic Tech", colors: ["#0f0f1a", "#00f5ff", "#7c3aed"] },
  { id: "glassmorphism", name: "Glassmorphism", colors: ["#e0e7ff", "#6366f1", "#f0f9ff"] },
  { id: "berlin_urban", name: "Berlin Urban", colors: ["#18181b", "#e11d48", "#f4f4f5"] },
  { id: "medical_clean", name: "Medical Clean", colors: ["#ecfdf5", "#059669", "#ffffff"] },
  { id: "automotive", name: "Automotive", colors: ["#1e293b", "#94a3b8", "#f59e0b"] },
  { id: "editorial_bold", name: "Editorial Bold", colors: ["#000000", "#ffffff", "#ef4444"] },
  { id: "minimalist_swiss", name: "Minimalist Swiss", colors: ["#fafafa", "#171717", "#3b82f6"] },
  { id: "gradient_flow", name: "Gradient Flow", colors: ["#8b5cf6", "#ec4899", "#06b6d4"] },
  { id: "eco_green", name: "Eco Green", colors: ["#14532d", "#86efac", "#f0fdf4"] },
  { id: "warm_trustful", name: "Warm Trustful", colors: ["#ea580c", "#fef9c3", "#1c1917"] },
  { id: "brutalist_raw", name: "Brutalist Raw", colors: ["#fbbf24", "#000000", "#ffffff"] },
];

const ZIELGRUPPEN = [
  { value: "privatkunden", label: "Privatkunden (Standard)" },
  { value: "gewerblich", label: "Gewerblich / Vermieter" },
  { value: "senioren", label: "Senioren / 60+" },
  { value: "technik", label: "Technik-Affine / DIY" },
  { value: "preisbewusst", label: "Preisbewusste Kunden" },
  { value: "premium", label: "Premium-Kunden" },
];

type ClusterPageRow = Tables<"cluster_pages">;
type ClusterRow = Tables<"clusters">;

export interface FirmData {
  id: string;
  name: string;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  service_area?: string | null;
  oeffnungszeiten?: string | null;
  branche?: string | null;
  sprache?: string | null;
  author?: string | null;
  author_title?: string | null;
  author_experience?: number | null;
  author_certs?: string | null;
  rating?: number | null;
  review_count?: number | null;
  design_philosophy?: string | null;
  design_philosophy_custom?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  target_audience?: string | null;
  differentiation?: string | null;
  theme_context?: string | null;
}

interface GeneratePageModalProps {
  open: boolean;
  clusterPage: ClusterPageRow;
  cluster: ClusterRow;
  firm: FirmData | null;
  siblingPages: ClusterPageRow[];
  onClose: () => void;
  onSuccess: (pageId: string, jobId: string) => void;
}

// ── Section definitions per page type ─────────────────────────
const ALL_SECTIONS = [
  { key: "01_hero", label: "Hero-Sektion" },
  { key: "02_problem", label: "Problem-Sektion" },
  { key: "03_ursachen", label: "Ursachen-Sektion" },
  { key: "04_symptome", label: "Symptome" },
  { key: "05_selbsthilfe", label: "Selbsthilfe" },
  { key: "06_loesung", label: "Lösung-Sektion" },
  { key: "07_unique", label: "Unique Data" },
  { key: "08_infogain", label: "Information Gain" },
  { key: "09_ablauf", label: "Ablauf-Sektion" },
  { key: "10_preise", label: "Preise-Sektion" },
  { key: "11_service", label: "Service-Sektion" },
  { key: "12_inhalt", label: "Inhalt-Sektion" },
  { key: "13_fehlercode", label: "Fehlercode-Sektion" },
  { key: "14_faq", label: "FAQ-Sektion" },
  { key: "15_autor", label: "Autor-Box" },
  { key: "16_blog", label: "Blog-Sektion" },
] as const;

type SectionKey = (typeof ALL_SECTIONS)[number]["key"];

const DEFAULTS_BY_TYPE: Record<string, SectionKey[]> = {
  service: ["01_hero", "02_problem", "09_ablauf", "10_preise", "14_faq", "15_autor"],
  fehlercode: ["01_hero", "03_ursachen", "06_loesung", "14_faq", "15_autor"],
  pillar_page: ALL_SECTIONS.map((s) => s.key),
  pillar: ALL_SECTIONS.map((s) => s.key),
  transactional: ["01_hero", "11_service", "10_preise", "14_faq", "15_autor"],
  transactional_local: ["01_hero", "11_service", "10_preise", "14_faq", "15_autor"],
  blog: ["01_hero", "12_inhalt", "14_faq", "15_autor"],
};

const FALLBACK_SECTIONS: SectionKey[] = ["01_hero", "02_problem", "06_loesung", "14_faq", "15_autor"];

function getDefaultSections(pageType: string): SectionKey[] {
  return DEFAULTS_BY_TYPE[pageType] || FALLBACK_SECTIONS;
}

// ── Internal link item type ───────────────────────────────────
interface InternalLinkItem {
  keyword: string;
  slug: string;
  source: "cluster" | "search";
  checked: boolean;
  disabled: boolean;
}

export function GeneratePageModal({
  open,
  clusterPage,
  cluster,
  firm,
  siblingPages,
  onClose,
  onSuccess,
}: GeneratePageModalProps) {
  const { startGeneration, generating, error, result, jobId, clearError, clearResult } = useGenerationJob();

  // All firms for the user
  const [allFirms, setAllFirms] = useState<FirmData[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>(firm?.id || "");

  // Load all firms on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("firms")
        .select("*")
        .order("name", { ascending: true });
      if (data) {
        setAllFirms(data as unknown as FirmData[]);
        // If no firm selected yet, use activeFirm or first firm
        if (!selectedFirmId && data.length > 0) {
          const match = firm?.id ? data.find((f) => f.id === firm.id) : data[0];
          if (match) setSelectedFirmId(match.id);
        }
      }
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to populate fields from a firm
  const populateFromFirm = useCallback((f: FirmData | undefined | null) => {
    setFirmName(f?.name || "");
    setFirmStreet(f?.street || "");
    setFirmCity(f?.city || "");
    setFirmPhone(f?.phone || "");
    setFirmEmail(f?.email || "");
    setFirmWebsite(f?.website || "");
    setFirmServiceArea(f?.service_area || "");
    setFirmOeffnungszeiten(f?.oeffnungszeiten || "");
    setFirmAuthor(f?.author || "");
    setFirmAuthorTitle(f?.author_title || "");
    setFirmAuthorExp(f?.author_experience?.toString() || "");
    setFirmAuthorCerts(f?.author_certs || "");
  }, []);

  // Populate on firm selection change
  useEffect(() => {
    if (!selectedFirmId) return;
    const selected = allFirms.find((f) => f.id === selectedFirmId);
    if (selected) populateFromFirm(selected);
  }, [selectedFirmId, allFirms, populateFromFirm]);

  // Required fields
  const [uniqueData, setUniqueData] = useState("");
  const [informationGain, setInformationGain] = useState("");
  const [uspFokus, setUspFokus] = useState("");

  // Intent + Tone of Voice (Schritt 1)
  const intentFromPageType = (pt: string): string => {
    switch (pt) {
      case "service":
      case "transactional":
      case "transactional_local":
        return "transactional";
      case "supporting_commercial":
        return "commercial";
      case "pillar_page":
      case "pillar":
      case "fehlercode":
      case "blog":
      case "supporting_info":
      case "deep_page":
      default:
        return "informational";
    }
  };
  const [intent, setIntent] = useState<string>(() => intentFromPageType(clusterPage.page_type));
  const [toneOfVoice, setToneOfVoice] = useState<string>("sachlich");

  // SEO-Felder Accordion (Schritt 2)
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoTab, setSeoTab] = useState<"keywords" | "cluster" | "eeat" | "schema" | "y2026">("keywords");
  // 2A — Keywords
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [lsiTerms, setLsiTerms] = useState("");
  // 2B — Cluster-Kontext
  const [paaQuestions, setPaaQuestions] = useState("");
  const [contentGap, setContentGap] = useState("");
  const [deepPages, setDeepPages] = useState("");
  // 2C — E-E-A-T
  const [reviewer, setReviewer] = useState("");
  const [caseStudy, setCaseStudy] = useState("");
  // 2D — Schema
  const SCHEMA_DEFAULTS_BY_TYPE: Record<string, string[]> = {
    service: ["LocalBusiness", "Service", "FAQPage"],
    fehlercode: ["FAQPage", "HowTo"],
    pillar_page: ["WebPage", "FAQPage", "BreadcrumbList"],
    pillar: ["WebPage", "FAQPage", "BreadcrumbList"],
    transactional: ["LocalBusiness", "FAQPage"],
    transactional_local: ["LocalBusiness", "FAQPage"],
  };
  const SCHEMA_OPTIONS = ["LocalBusiness", "Service", "FAQPage", "HowTo", "WebPage", "BreadcrumbList"];
  const [schemaBlocks, setSchemaBlocks] = useState<string[]>(
    () => SCHEMA_DEFAULTS_BY_TYPE[clusterPage.page_type] || ["FAQPage"]
  );
  const [rating, setRating] = useState<string>("");
  const [reviewCount, setReviewCount] = useState<string>("");
  // 2E — 2026 Features
  const [informationGainFlag, setInformationGainFlag] = useState(true);
  const [comparativeCheck, setComparativeCheck] = useState(true);
  const [discoverReady, setDiscoverReady] = useState(false);

  // AI suggestions — per-field loading state
  const [aiFieldLoading, setAiFieldLoading] = useState<Record<string, boolean>>({});
  const [aiLoaded, setAiLoaded] = useState(false);
  const aiCalledRef = useRef(false);

  const getRequestBody = useCallback((field?: string) => {
    const selectedFirm = allFirms.find((f) => f.id === selectedFirmId);
    return {
      keyword: clusterPage.keyword,
      pageType: clusterPage.page_type,
      firm: selectedFirm?.name || firm?.name || "",
      branche: selectedFirm?.branche || cluster.branche || "hausgeraete",
      ...(field ? { field } : {}),
    };
  }, [clusterPage.keyword, clusterPage.page_type, allFirms, selectedFirmId, firm, cluster.branche]);

  const applyAiData = useCallback((data: Record<string, string>) => {
    if (data.uniqueData) setUniqueData(data.uniqueData);
    if (data.informationGain) setInformationGain(data.informationGain);
    if (data.uspFokus) setUspFokus(data.uspFokus);
    if (data.themeContext) setThemeContext(data.themeContext);
    if (data.differentiation) setDifferentiation(data.differentiation);
    if (data.paaQuestions) setPaaQuestions(data.paaQuestions);
    if (data.secondaryKeywords) setSecondaryKeywords(data.secondaryKeywords);
    if (data.lsiTerms) setLsiTerms(data.lsiTerms);
  }, []);

  const fetchAllSuggestions = useCallback(async () => {
    const allFields = ["uniqueData", "informationGain", "uspFokus", "themeContext", "differentiation"];
    setAiFieldLoading(Object.fromEntries(allFields.map((f) => [f, true])));
    try {
      const body = getRequestBody();
      console.log("AI Suggestions Request:", body);
      const { data, error: fnError } = await supabase.functions.invoke("generate-field-suggestions", { body });
      console.log("AI Suggestions Response:", { data, fnError });
      if (!fnError && data) applyAiData(data);
    } catch (err) {
      console.error("AI suggestions error:", err);
    } finally {
      setAiFieldLoading({});
      setAiLoaded(true);
    }
  }, [getRequestBody, applyAiData]);

  const fetchSingleField = useCallback(async (field: string) => {
    setAiFieldLoading((prev) => ({ ...prev, [field]: true }));
    try {
      const body = getRequestBody(field);
      const { data, error: fnError } = await supabase.functions.invoke("generate-field-suggestions", { body });
      if (!fnError && data) applyAiData(data);
    } catch (err) {
      console.error(`AI field ${field} error:`, err);
    } finally {
      setAiFieldLoading((prev) => ({ ...prev, [field]: false }));
    }
  }, [getRequestBody, applyAiData]);

  // Auto-fetch on open (once)
  useEffect(() => {
    if (open && !aiCalledRef.current) {
      aiCalledRef.current = true;
      void fetchAllSuggestions();
    }
  }, [open, fetchAllSuggestions]);

  // Firm fields (editable overrides)
  const [firmName, setFirmName] = useState("");
  const [firmStreet, setFirmStreet] = useState("");
  const [firmCity, setFirmCity] = useState("");
  const [firmPhone, setFirmPhone] = useState("");
  const [firmEmail, setFirmEmail] = useState("");
  const [firmWebsite, setFirmWebsite] = useState("");
  const [firmServiceArea, setFirmServiceArea] = useState("");
  const [firmOeffnungszeiten, setFirmOeffnungszeiten] = useState("");
  const [firmAuthor, setFirmAuthor] = useState("");
  const [firmAuthorTitle, setFirmAuthorTitle] = useState("");
  const [firmAuthorExp, setFirmAuthorExp] = useState("");
  const [firmAuthorCerts, setFirmAuthorCerts] = useState("");

  // Advanced settings
  const [kvaPrice, setKvaPrice] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [designPreset, setDesignPreset] = useState("trust");
  const [outputMode, setOutputMode] = useState("standalone");
  const [activeSections, setActiveSections] = useState<SectionKey[]>(() =>
    getDefaultSections(clusterPage.page_type)
  );

  // Design & context state
  const resolveDesignPhilosophy = () => cluster.design_philosophy || selectedFirmObj?.design_philosophy || "trust_classic";
  const selectedFirmObj = allFirms.find((f) => f.id === selectedFirmId) as (FirmData | undefined);
  const [designOverride, setDesignOverride] = useState<string | null>(null);
  const [designCustomOverride, setDesignCustomOverride] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [themeContext, setThemeContext] = useState("");
  const [differentiation, setDifferentiation] = useState("");

  // Clear stuck generation jobs on open
  useEffect(() => {
    if (open) clearStuckJob();
  }, [open]);

  // Init context from cluster/firm on open
  useEffect(() => {
    if (open) {
      setTargetAudience(cluster.target_audience || selectedFirmObj?.target_audience || "privatkunden");
      setThemeContext(String(cluster.theme_context || selectedFirmObj?.theme_context || ""));
      setDifferentiation(String(cluster.differentiation || selectedFirmObj?.differentiation || ""));
      setDesignOverride(selectedFirmObj?.design_philosophy || null);
      setDesignCustomOverride(String(selectedFirmObj?.design_philosophy_custom || ""));
      // Schritt 2 — E-E-A-T defaults aus Firma
      setRating(selectedFirmObj?.rating != null ? String(selectedFirmObj.rating) : "");
      setReviewCount(selectedFirmObj?.review_count != null ? String(selectedFirmObj.review_count) : "");
      // Schritt 2B — Deep Pages aus cluster_pages
      (async () => {
        const { data } = await supabase
          .from("cluster_pages")
          .select("keyword, url_slug")
          .eq("cluster_id", cluster.id)
          .eq("page_type", "deep_page");
        if (data && data.length) {
          setDeepPages(data.map((d) => `${d.keyword} → /${d.url_slug}`).join("\n"));
        }
      })();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePhilosophy = designOverride || resolveDesignPhilosophy();
  const activePalette = PALETTES.find((p) => p.id === activePhilosophy) || PALETTES[0];
  const designSource = designOverride ? "Seiten-Override" : cluster.design_philosophy ? "geerbt von Cluster" : "geerbt von Firma";

  // Internal links — checkbox-based
  const [linkItems, setLinkItems] = useState<InternalLinkItem[]>(() => {
    const siblings = siblingPages
      .filter((p) => p.id !== clusterPage.id)
      .slice(0, 30)
      .map((p) => ({
        keyword: p.keyword,
        slug: p.url_slug,
        source: "cluster" as const,
        checked: p.status === "generated" || p.status === "published" || p.status === "live",
        disabled: p.status === "planned" || p.status === "suggested",
      }));
    return siblings;
  });

  // Search for additional seo_pages
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ keyword: string; url_slug: string; firm: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("seo_pages")
      .select("keyword, intent, firm, meta_title, id")
      .ilike("keyword", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      // Filter out already-added items
      const existingSlugs = new Set(linkItems.map((l) => l.slug));
      // seo_pages don't have url_slug, derive from keyword
      setSearchResults(
        data
          .filter((d) => !existingSlugs.has(d.keyword.toLowerCase().replace(/\s+/g, "-")))
          .map((d) => ({
            keyword: d.keyword,
            url_slug: d.keyword.toLowerCase().replace(/\s+/g, "-"),
            firm: d.firm,
          }))
      );
    }
    setSearching(false);
  }, [linkItems]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, doSearch]);

  const addSearchResult = (r: { keyword: string; url_slug: string }) => {
    setLinkItems((prev) => [
      ...prev,
      { keyword: r.keyword, slug: r.url_slug, source: "search", checked: true, disabled: false },
    ]);
    setSearchResults((prev) => prev.filter((x) => x.keyword !== r.keyword));
    setSearchQuery("");
  };

  const toggleLink = (idx: number) => {
    setLinkItems((prev) =>
      prev.map((item, i) =>
        i === idx && !item.disabled ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // Compute combined output
  const siblingPagesString = useMemo(() => {
    return linkItems
      .filter((l) => l.checked)
      .map((l) => `${l.keyword} → /${l.slug}`)
      .join(", ");
  }, [linkItems]);

  // Accordion state
  const [firmOpen, setFirmOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);

  // Validation
  const [validationError, setValidationError] = useState("");
  const uniqueRef = useRef<HTMLTextAreaElement>(null);
  const infoGainRef = useRef<HTMLTextAreaElement>(null);

  // Handle result arriving via polling
  useEffect(() => {
    if (result?.pageId && !generating) {
      onSuccess(result.pageId, jobId || "");
    }
  }, [result, generating]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    clearError();
    setValidationError("");

    if (!uniqueData.trim()) {
      setValidationError("Unique Data ist ein Pflichtfeld");
      uniqueRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      uniqueRef.current?.focus();
      return;
    }
    if (!informationGain.trim()) {
      setValidationError("Information Gain ist ein Pflichtfeld");
      infoGainRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      infoGainRef.current?.focus();
      return;
    }

    const formData: Record<string, unknown> = {
      keyword: clusterPage.keyword,
      firmId: selectedFirmId || null,
      pageType: clusterPage.page_type,
      pillarTier: clusterPage.pillar_tier || 2,
      urlSlug: clusterPage.url_slug,
      branche: cluster.branche || firm?.branche || "hausgeraete",
      sprache: cluster.sprache || firm?.sprache || "de",
      firm: firmName,
      street: firmStreet,
      city: firmCity,
      phone: firmPhone,
      email: firmEmail,
      website: firmWebsite,
      serviceArea: firmServiceArea,
      oeffnungszeiten: firmOeffnungszeiten,
      author: firmAuthor,
      authorTitle: firmAuthorTitle,
      authorExperience: firmAuthorExp,
      authorCerts: firmAuthorCerts,
      rating: firm?.rating?.toString() || "",
      uniqueData,
      infoGain: informationGain,
      uspFokus,
      intent,
      toneOfVoice,
      kvaPrice,
      priceRange,
      designPreset,
      designPhilosophy: activePhilosophy,
      designPhilosophyCustom: designCustomOverride || cluster.design_philosophy_custom || selectedFirmObj?.design_philosophy_custom || "",
      primaryColor: activePalette.colors[0],
      secondaryColor: activePalette.colors[1],
      accentColor: activePalette.colors[2],
      targetAudience,
      themeContext: themeContext.trim(),
      differentiation: differentiation.trim(),
      outputMode,
      activeSections: activeSections.map((k) => {
        const sec = ALL_SECTIONS.find((s) => s.key === k);
        return sec ? sec.label : k;
      }),
      siblingPages: siblingPagesString,
      clusterPageId: clusterPage.id,
      clusterId: cluster.id,
      webhookPath: "seo-generate",
    };

    const basePrompt = buildMasterPrompt(formData);
    await startGeneration({ ...formData, basePrompt });
  };

  const toggleSection = (key: SectionKey) => {
    setActiveSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!generating && !v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seite generieren</DialogTitle>
          <DialogDescription>
            {clusterPage.keyword} · {clusterPage.page_type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* ── Firmen-Auswahl ── */}
          <div className="space-y-1.5">
            <Label>Firma auswählen</Label>
            <Select value={selectedFirmId} onValueChange={setSelectedFirmId} disabled={generating}>
              <SelectTrigger>
                <SelectValue placeholder="Firma wählen…" />
              </SelectTrigger>
              <SelectContent>
                {allFirms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── SEKTION 1: Info Card ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-muted/50 p-3 rounded-md">
            <div className="font-medium text-foreground truncate">{clusterPage.keyword}</div>
            <div className="text-right">
              <Badge variant="secondary" className="text-[11px]">{clusterPage.page_type}</Badge>
            </div>
            <div className="text-xs text-muted-foreground font-mono truncate">/{clusterPage.url_slug}</div>
            <div className="text-right">
              <Badge variant="outline" className="text-[11px]">Tier {clusterPage.pillar_tier || 2}</Badge>
            </div>
          </div>

          {/* ── SEKTION 2: Pflicht-Felder ── */}
          <div className="space-y-3">
            {/* Unique Data */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="gpm-unique">Was macht diese Seite einzigartig? <span className="text-destructive">*</span></Label>
                {aiLoaded && (
                  <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5" onClick={() => fetchSingleField("uniqueData")} disabled={!!aiFieldLoading.uniqueData || generating}>
                    {aiFieldLoading.uniqueData ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} ↻ Neu
                  </Button>
                )}
              </div>
              {aiFieldLoading.uniqueData && !uniqueData ? (
                <Skeleton className="h-20 w-full rounded-md" />
              ) : (
                <Textarea ref={uniqueRef} id="gpm-unique" placeholder="Eigene Daten, Statistiken, konkrete Zahlen..." value={uniqueData} onChange={(e) => setUniqueData(e.target.value)} disabled={generating} rows={3} />
              )}
            </div>

            {/* Information Gain */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="gpm-infogain">Welchen Mehrwert bietet diese Seite? <span className="text-destructive">*</span></Label>
                {aiLoaded && (
                  <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5" onClick={() => fetchSingleField("informationGain")} disabled={!!aiFieldLoading.informationGain || generating}>
                    {aiFieldLoading.informationGain ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} ↻ Neu
                  </Button>
                )}
              </div>
              {aiFieldLoading.informationGain && !informationGain ? (
                <Skeleton className="h-20 w-full rounded-md" />
              ) : (
                <Textarea ref={infoGainRef} id="gpm-infogain" placeholder="Exklusive Einblicke, Informationen die Wettbewerber nicht haben..." value={informationGain} onChange={(e) => setInformationGain(e.target.value)} disabled={generating} rows={3} />
              )}
            </div>

            {/* USP Fokus */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="gpm-usp">USP-Fokus (optional)</Label>
                {aiLoaded && (
                  <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5" onClick={() => fetchSingleField("uspFokus")} disabled={!!aiFieldLoading.uspFokus || generating}>
                    {aiFieldLoading.uspFokus ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} ↻ Neu
                  </Button>
                )}
              </div>
              {aiFieldLoading.uspFokus && !uspFokus ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <Input id="gpm-usp" placeholder="z.B. 24h Notdienst, Original-Ersatzteile, 15 Jahre Erfahrung" value={uspFokus} onChange={(e) => setUspFokus(e.target.value)} disabled={generating} />
              )}
            </div>

            {/* Intent + Tone of Voice (Schritt 1) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gpm-intent">Such-Intent</Label>
                <Select value={intent} onValueChange={setIntent} disabled={generating}>
                  <SelectTrigger id="gpm-intent"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informational">Informational (Ratgeber)</SelectItem>
                    <SelectItem value="commercial">Commercial (Vergleich/Entscheidung)</SelectItem>
                    <SelectItem value="transactional">Transactional (Kaufbereit/Lokal)</SelectItem>
                    <SelectItem value="navigational">Navigational (Marken-Suche)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gpm-tone">Tonalität</Label>
                <Select value={toneOfVoice} onValueChange={setToneOfVoice} disabled={generating}>
                  <SelectTrigger id="gpm-tone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sachlich">Sachlich-kompetent (Standard)</SelectItem>
                    <SelectItem value="freundlich">Freundlich-nahbar</SelectItem>
                    <SelectItem value="premium">Premium-exklusiv</SelectItem>
                    <SelectItem value="technisch">Technisch-präzise</SelectItem>
                    <SelectItem value="emotional">Emotional-empathisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {aiLoaded && (
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">KI-Vorschlag — bitte anpassen und ergänzen</p>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-2" onClick={() => fetchAllSuggestions()} disabled={Object.values(aiFieldLoading).some(Boolean) || generating}>
                  {Object.values(aiFieldLoading).some(Boolean) ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Alle neu generieren
                </Button>
              </div>
            )}

            {!aiLoaded && Object.values(aiFieldLoading).some(Boolean) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> KI analysiert Keyword…
              </p>
            )}
          </div>

          {/* ── SEKTION 3: Firmen-Daten (Accordion) ── */}
          <Collapsible open={firmOpen} onOpenChange={setFirmOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold py-2 hover:text-primary transition-colors">
              <ChevronRight className={`h-4 w-4 transition-transform ${firmOpen ? "rotate-90" : ""}`} />
              Firmen-Daten
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 pl-6">
              {/* NAP */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NAP-Daten</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Firma</Label>
                    <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} disabled={generating} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Straße</Label>
                    <Input value={firmStreet} onChange={(e) => setFirmStreet(e.target.value)} disabled={generating} />
                  </div>
                  <div>
                    <Label className="text-xs">PLZ + Stadt</Label>
                    <Input value={firmCity} onChange={(e) => setFirmCity(e.target.value)} disabled={generating} />
                  </div>
                  <div>
                    <Label className="text-xs">Telefon</Label>
                    <Input value={firmPhone} onChange={(e) => setFirmPhone(e.target.value)} disabled={generating} />
                  </div>
                  <div>
                    <Label className="text-xs">E-Mail</Label>
                    <Input value={firmEmail} onChange={(e) => setFirmEmail(e.target.value)} disabled={generating} />
                  </div>
                  <div>
                    <Label className="text-xs">Website</Label>
                    <Input value={firmWebsite} onChange={(e) => setFirmWebsite(e.target.value)} disabled={generating} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Servicegebiet</Label>
                    <Input value={firmServiceArea} onChange={(e) => setFirmServiceArea(e.target.value)} disabled={generating} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Öffnungszeiten</Label>
                    <Textarea value={firmOeffnungszeiten} onChange={(e) => setFirmOeffnungszeiten(e.target.value)} disabled={generating} rows={2} />
                  </div>
                </div>
              </div>

              {/* Autor */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Autor / E-E-A-T</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Autor</Label>
                    <Input value={firmAuthor} onChange={(e) => setFirmAuthor(e.target.value)} disabled={generating} />
                  </div>
                  <div>
                    <Label className="text-xs">Berufsbezeichnung</Label>
                    <Input value={firmAuthorTitle} onChange={(e) => setFirmAuthorTitle(e.target.value)} disabled={generating} />
                  </div>
                  <div>
                    <Label className="text-xs">Erfahrung (Jahre)</Label>
                    <Input type="number" value={firmAuthorExp} onChange={(e) => setFirmAuthorExp(e.target.value)} disabled={generating} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Zertifikate</Label>
                    <Textarea value={firmAuthorCerts} onChange={(e) => setFirmAuthorCerts(e.target.value)} disabled={generating} rows={2} />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Daten aus Firma-Stammdaten. Änderungen hier gelten nur für diese Seite.
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* ── SEKTION 4: Erweiterte Einstellungen (Accordion) ── */}
          <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold py-2 hover:text-primary transition-colors">
              <ChevronRight className={`h-4 w-4 transition-transform ${advOpen ? "rotate-90" : ""}`} />
              Erweiterte Einstellungen
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 pl-6">
              {/* Preise */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preise</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">KVA-Preis</Label>
                    <Input placeholder="z.B. ab 79€" value={kvaPrice} onChange={(e) => setKvaPrice(e.target.value)} disabled={generating} />
                  </div>
                  <div>
                    <Label className="text-xs">Preisspanne</Label>
                    <Input placeholder="z.B. 79€ – 299€" value={priceRange} onChange={(e) => setPriceRange(e.target.value)} disabled={generating} />
                  </div>
                </div>
              </div>

              {/* Design */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Design</p>
                <div className="flex items-center gap-3 rounded-md border p-2.5">
                  <div className="flex gap-1">
                    {activePalette.colors.map((c, i) => (
                      <span key={i} className="inline-block h-4 w-4 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{activePalette.name}</p>
                    <p className="text-[10px] text-muted-foreground">({designSource})</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] shrink-0" onClick={() => setPickerOpen(true)} disabled={generating}>
                    Ändern
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-border/50" style={{ backgroundColor: activePalette.colors[0] }} />
                    Primär: {activePalette.colors[0]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-border/50" style={{ backgroundColor: activePalette.colors[1] }} />
                    Sekundär: {activePalette.colors[1]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-border/50" style={{ backgroundColor: activePalette.colors[2] }} />
                    Akzent: {activePalette.colors[2]}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Output-Mode</Label>
                  <Select value={outputMode} onValueChange={setOutputMode} disabled={generating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">Standalone HTML</SelectItem>
                      <SelectItem value="tinymce">TinyMCE / Contao</SelectItem>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sektionen */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aktive Sektionen</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_SECTIONS.map((sec) => (
                    <label key={sec.key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={activeSections.includes(sec.key)}
                        onCheckedChange={() => toggleSection(sec.key)}
                        disabled={generating}
                      />
                      {sec.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Interne Verlinkung (Checkbox-based) ── */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Seiten intern verlinken</p>

                {/* QUELLE A: Cluster siblings */}
                {linkItems.filter((l) => l.source === "cluster").length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Aus diesem Cluster</p>
                    <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
                      {linkItems.map((item, idx) => {
                        if (item.source !== "cluster") return null;
                        return (
                          <label
                            key={`cluster-${idx}`}
                            className={`flex items-center gap-2 text-xs py-0.5 ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleLink(idx)}
                              disabled={item.disabled || generating}
                            />
                            <span className="truncate flex-1">
                              {item.keyword}
                              <span className="text-muted-foreground font-mono ml-1">→ /{item.slug}</span>
                            </span>
                            {item.disabled && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">geplant</Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* QUELLE B: Search other pages */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Weitere Seiten verlinken</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Keyword suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={generating}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  {(searchResults.length > 0 || searching) && (
                    <div className="border rounded-md bg-popover shadow-md max-h-36 overflow-y-auto">
                      {searching && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Suche…
                        </div>
                      )}
                      {searchResults.map((r) => (
                        <button
                          key={r.keyword}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                          onClick={() => addSearchResult(r)}
                        >
                          <span className="truncate flex-1">{r.keyword}</span>
                          {r.firm && (
                            <span className="text-[10px] text-muted-foreground shrink-0">{r.firm}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Show search-added items */}
                  {linkItems.filter((l) => l.source === "search").length > 0 && (
                    <div className="space-y-1 border rounded-md p-2 bg-muted/30">
                      {linkItems.map((item, idx) => {
                        if (item.source !== "search") return null;
                        return (
                          <label key={`search-${idx}`} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleLink(idx)}
                              disabled={generating}
                            />
                            <span className="truncate flex-1">
                              {item.keyword}
                              <span className="text-muted-foreground font-mono ml-1">→ /{item.slug}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Diese Seiten werden als interne Links in den Prompt eingebaut.
                </p>
              </div>

              {/* ── Kontext-Felder ── */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kontext-Felder</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Zielgruppe</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience} disabled={generating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ZIELGRUPPEN.map((z) => (
                        <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Themen-Kontext with AI */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Themen-Kontext</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5" onClick={() => fetchSingleField("themeContext")} disabled={!!aiFieldLoading.themeContext || generating}>
                      {aiFieldLoading.themeContext ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} ↻ Neu
                    </Button>
                  </div>
                  {aiFieldLoading.themeContext && !themeContext ? (
                    <Skeleton className="h-20 w-full rounded-md" />
                  ) : (
                    <Textarea value={themeContext} onChange={(e) => setThemeContext(e.target.value)} placeholder="Spezifische Details für diese Seite..." rows={3} disabled={generating} />
                  )}
                  <p className="text-[10px] text-muted-foreground">KI-Vorschlag — anpassen und ergänzen</p>
                </div>

                {/* Differenzierung with AI */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Differenzierung (Wettbewerbsvorteile)</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5" onClick={() => fetchSingleField("differentiation")} disabled={!!aiFieldLoading.differentiation || generating}>
                      {aiFieldLoading.differentiation ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} ↻ Neu
                    </Button>
                  </div>
                  {aiFieldLoading.differentiation && !differentiation ? (
                    <Skeleton className="h-16 w-full rounded-md" />
                  ) : (
                    <Textarea value={differentiation} onChange={(e) => setDifferentiation(e.target.value)} placeholder={"Was bietet ihr konkret was Wettbewerber nicht bieten?\nz.B.: Einziger Miele-Spezialist in Pankow, Originalteile auf Lager"} rows={2} disabled={generating} />
                  )}
                  <p className="text-[10px] text-muted-foreground">KI-Vorschlag — anpassen und ergänzen</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Errors ── */}
          {(error || validationError) && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              {validationError || error}
            </p>
          )}

          {/* ── Footer buttons ── */}
          <div className="flex gap-2 pt-1">
            {generating ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    clearResult();
                    onClose();
                    toast.info("Generierung abgebrochen");
                  }}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button disabled className="flex-1">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiere…
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Abbrechen
                </Button>
                <Button onClick={handleGenerate} className="flex-1">
                  Seite generieren →
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Design Picker Modal */}
      <PickerDialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <PickerDialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <PickerDialogHeader>
            <PickerDialogTitle>Design-Philosophie wählen</PickerDialogTitle>
          </PickerDialogHeader>
          {designCustomOverride.length >= 10 && (
            <p className="text-[10px] text-muted-foreground mt-1">Optional — eigene Beschreibung aktiv</p>
          )}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDesignOverride(p.id);
                }}
                className={cn(
                  "rounded-lg border p-2 text-left transition-all hover:shadow-md cursor-pointer",
                  (designOverride || activePhilosophy) === p.id
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                )}
              >
                <p className="text-[11px] font-bold leading-tight truncate">{p.name}</p>
                <div className="flex gap-1 mt-1.5">
                  {p.colors.map((c, i) => (
                    <span key={i} className="inline-block h-3.5 w-3.5 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs">Eigene Design-Beschreibung (optional)</Label>
            <Textarea
              value={designCustomOverride}
              onChange={(e) => setDesignCustomOverride(e.target.value)}
              placeholder="Eigene Design-Beschreibung..."
              rows={2}
            />
          </div>
          {!designOverride && designCustomOverride.length < 10 && (
            <p className="text-[10px] text-destructive mt-1">Bitte Preset wählen oder eigene Beschreibung eingeben</p>
          )}
          <Button
            className="w-full mt-3"
            disabled={!designOverride && designCustomOverride.length < 10}
            onClick={async () => {
              if (selectedFirmObj?.id) {
                await supabase
                  .from("firms")
                  .update({
                    design_philosophy: designOverride || selectedFirmObj.design_philosophy,
                    design_philosophy_custom: designCustomOverride || null,
                  })
                  .eq("id", selectedFirmObj.id);
                toast.success("Design gespeichert ✓");
              }
              setPickerOpen(false);
            }}
          >
            Design übernehmen →
          </Button>
        </PickerDialogContent>
      </PickerDialog>
    </>
  );
}
