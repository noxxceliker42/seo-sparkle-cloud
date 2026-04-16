import { useState, useMemo, useRef, useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { buildMasterPrompt } from "@/lib/buildMasterPrompt";
import { useGenerationJob } from "@/hooks/useGenerationJob";
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
import { Loader2, ChevronRight, Info } from "lucide-react";

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

export function GeneratePageModal({
  open,
  clusterPage,
  cluster,
  firm,
  siblingPages,
  onClose,
  onSuccess,
}: GeneratePageModalProps) {
  const { startGeneration, generating, error, result, jobId, clearError } = useGenerationJob();

  // Required fields
  const [uniqueData, setUniqueData] = useState("");
  const [informationGain, setInformationGain] = useState("");
  const [uspFokus, setUspFokus] = useState("");

  // Firm fields (editable overrides)
  const [firmName, setFirmName] = useState(firm?.name || "");
  const [firmStreet, setFirmStreet] = useState(firm?.street || "");
  const [firmCity, setFirmCity] = useState(firm?.city || "");
  const [firmPhone, setFirmPhone] = useState(firm?.phone || "");
  const [firmEmail, setFirmEmail] = useState(firm?.email || "");
  const [firmWebsite, setFirmWebsite] = useState(firm?.website || "");
  const [firmServiceArea, setFirmServiceArea] = useState(firm?.service_area || "");
  const [firmOeffnungszeiten, setFirmOeffnungszeiten] = useState(firm?.oeffnungszeiten || "");
  const [firmAuthor, setFirmAuthor] = useState(firm?.author || "");
  const [firmAuthorTitle, setFirmAuthorTitle] = useState(firm?.author_title || "");
  const [firmAuthorExp, setFirmAuthorExp] = useState(firm?.author_experience?.toString() || "");
  const [firmAuthorCerts, setFirmAuthorCerts] = useState(firm?.author_certs || "");

  // Advanced settings
  const [kvaPrice, setKvaPrice] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [designPreset, setDesignPreset] = useState("trust");
  const [outputMode, setOutputMode] = useState("standalone");
  const [activeSections, setActiveSections] = useState<SectionKey[]>(() =>
    getDefaultSections(clusterPage.page_type)
  );

  // Internal links textarea
  const siblingLinksDefault = useMemo(() => {
    return siblingPages
      .filter((p) => p.id !== clusterPage.id && p.status === "generated")
      .slice(0, 10)
      .map((p) => `${p.keyword} → /${p.url_slug}`)
      .join("\n");
  }, [siblingPages, clusterPage.id]);
  const [internalLinks, setInternalLinks] = useState(siblingLinksDefault);

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
      kvaPrice,
      priceRange,
      designPreset,
      outputMode,
      activeSections: activeSections.map((k) => {
        const sec = ALL_SECTIONS.find((s) => s.key === k);
        return sec ? sec.label : k;
      }),
      siblingPages: internalLinks,
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
    <Dialog open={open} onOpenChange={(v) => { if (!generating && !v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seite generieren</DialogTitle>
          <DialogDescription>
            {clusterPage.keyword} · {clusterPage.page_type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
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
            <div className="space-y-1.5">
              <Label htmlFor="gpm-unique">
                Was macht diese Seite einzigartig? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                ref={uniqueRef}
                id="gpm-unique"
                placeholder="Eigene Daten, Statistiken, Erfahrungswerte, konkrete Zahlen, echte Kundenerfahrungen..."
                value={uniqueData}
                onChange={(e) => setUniqueData(e.target.value)}
                disabled={generating}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gpm-infogain">
                Welchen Mehrwert bietet diese Seite? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                ref={infoGainRef}
                id="gpm-infogain"
                placeholder="Neue Perspektive, exklusive Einblicke, praktische Anleitungen, Informationen die Wettbewerber nicht haben..."
                value={informationGain}
                onChange={(e) => setInformationGain(e.target.value)}
                disabled={generating}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gpm-usp">USP-Fokus (optional)</Label>
              <Input
                id="gpm-usp"
                placeholder="z.B. 24h Notdienst, Original-Ersatzteile, 15 Jahre Erfahrung"
                value={uspFokus}
                onChange={(e) => setUspFokus(e.target.value)}
                disabled={generating}
              />
            </div>
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Design-Preset</Label>
                    <Select value={designPreset} onValueChange={setDesignPreset} disabled={generating}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trust">Trust (Standard)</SelectItem>
                        <SelectItem value="glassmorphism">Glassmorphism (Modern)</SelectItem>
                        <SelectItem value="editorial">Editorial (Reduziert)</SelectItem>
                      </SelectContent>
                    </Select>
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

              {/* Interne Verlinkung */}
              <div className="space-y-1.5">
                <Label className="text-xs">Interne Verlinkung (Geschwister-Seiten)</Label>
                <Textarea
                  value={internalLinks}
                  onChange={(e) => setInternalLinks(e.target.value)}
                  disabled={generating}
                  rows={4}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Diese Seiten werden als interne Links in den Prompt eingebaut.
                </p>
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
            <Button variant="outline" onClick={onClose} disabled={generating} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="flex-1">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiere…</>
              ) : (
                "Seite generieren →"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
