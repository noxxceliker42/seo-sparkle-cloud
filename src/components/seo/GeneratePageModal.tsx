import { useState, useMemo } from "react";
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
import { Loader2 } from "lucide-react";

type ClusterPageRow = Tables<"cluster_pages">;
type ClusterRow = Tables<"clusters">;

interface FirmData {
  id: string;
  name: string;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  service_area?: string | null;
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

const SECTION_OPTIONS: Record<string, { key: string; label: string }[]> = {
  pillar_page: [
    { key: "01_hero", label: "Hero" },
    { key: "02_problem", label: "Problem" },
    { key: "04_symptome", label: "Symptome" },
    { key: "07_unique", label: "Unique Data" },
    { key: "08_infogain", label: "Information Gain" },
    { key: "09_ablauf", label: "Ablauf" },
    { key: "10_preise", label: "Preise" },
    { key: "14_faq", label: "FAQ" },
    { key: "15_autor", label: "Autor" },
  ],
  service: [
    { key: "01_hero", label: "Hero" },
    { key: "02_problem", label: "Problem" },
    { key: "09_ablauf", label: "Ablauf" },
    { key: "10_preise", label: "Preise" },
    { key: "14_faq", label: "FAQ" },
    { key: "15_autor", label: "Autor" },
  ],
  supporting_info: [
    { key: "01_hero", label: "Hero" },
    { key: "04_symptome", label: "Symptome" },
    { key: "05_selbsthilfe", label: "Selbsthilfe" },
    { key: "07_unique", label: "Unique Data" },
    { key: "14_faq", label: "FAQ" },
  ],
  supporting_commercial: [
    { key: "01_hero", label: "Hero" },
    { key: "02_problem", label: "Problem" },
    { key: "09_ablauf", label: "Ablauf" },
    { key: "10_preise", label: "Preise" },
    { key: "14_faq", label: "FAQ" },
  ],
  blog: [
    { key: "01_hero", label: "Hero" },
    { key: "07_unique", label: "Unique Data" },
    { key: "08_infogain", label: "Information Gain" },
    { key: "14_faq", label: "FAQ" },
    { key: "15_autor", label: "Autor" },
  ],
};

// Default: use pillar_page sections
function getSections(pageType: string) {
  return SECTION_OPTIONS[pageType] || SECTION_OPTIONS.pillar_page;
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

  const [uniqueData, setUniqueData] = useState("");
  const [informationGain, setInformationGain] = useState("");
  const [uspFokus, setUspFokus] = useState("");

  const availableSections = useMemo(() => getSections(clusterPage.page_type), [clusterPage.page_type]);
  const [activeSections, setActiveSections] = useState<string[]>(() =>
    availableSections.map((s) => s.key)
  );

  // Build sibling links for prompt
  const siblingLinks = useMemo(() => {
    return siblingPages
      .filter((p) => p.id !== clusterPage.id)
      .slice(0, 10)
      .map((p) => `${p.keyword} → /${p.url_slug}`)
      .join(", ");
  }, [siblingPages, clusterPage.id]);

  // Handle result arriving via polling
  if (result?.pageId && !generating) {
    onSuccess(result.pageId, jobId || "");
  }

  const handleGenerate = async () => {
    clearError();

    const formData: Record<string, unknown> = {
      keyword: clusterPage.keyword,
      pageType: clusterPage.page_type,
      pillarTier: clusterPage.pillar_tier || 2,
      urlSlug: clusterPage.url_slug,
      branche: cluster.branche || "hausgeraete",
      sprache: cluster.sprache || "de",
      firmName: firm?.name || "",
      firm: firm?.name || "",
      street: firm?.street || "",
      city: firm?.city || "",
      phone: firm?.phone || "",
      email: firm?.email || "",
      website: firm?.website || "",
      serviceArea: firm?.service_area || "",
      uniqueData,
      informationGain,
      uspFokus,
      siblingPages: siblingLinks,
      activeSections: activeSections.map((k) => {
        const sec = availableSections.find((s) => s.key === k);
        return sec ? sec.label : k;
      }),
      designPreset: "trust",
      outputMode: "standalone",
      clusterPageId: clusterPage.id,
    };

    const basePrompt = buildMasterPrompt(formData);

    await startGeneration({
      ...formData,
      basePrompt,
      webhookPath: "seo-generate",
    });
  };

  const toggleSection = (key: string) => {
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

        <div className="space-y-4 pt-2">
          {/* Pre-filled info */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <div><span className="font-medium text-foreground">Keyword:</span> {clusterPage.keyword}</div>
            <div><span className="font-medium text-foreground">Typ:</span> {clusterPage.page_type}</div>
            <div><span className="font-medium text-foreground">URL:</span> /{clusterPage.url_slug}</div>
            <div><span className="font-medium text-foreground">Tier:</span> {clusterPage.pillar_tier || 2}</div>
            {firm && <div className="col-span-2"><span className="font-medium text-foreground">Firma:</span> {firm.name}{firm.city ? ` · ${firm.city}` : ""}</div>}
          </div>

          {/* Unique Data */}
          <div className="space-y-1.5">
            <Label htmlFor="gpm-unique">Was macht diese Seite einzigartig?</Label>
            <Textarea
              id="gpm-unique"
              placeholder="Eigene Daten, Statistiken, Erfahrungswerte…"
              value={uniqueData}
              onChange={(e) => setUniqueData(e.target.value)}
              disabled={generating}
              rows={2}
            />
          </div>

          {/* Information Gain */}
          <div className="space-y-1.5">
            <Label htmlFor="gpm-infogain">Welchen Mehrwert bietet diese Seite?</Label>
            <Textarea
              id="gpm-infogain"
              placeholder="Neue Perspektive, exklusive Einblicke…"
              value={informationGain}
              onChange={(e) => setInformationGain(e.target.value)}
              disabled={generating}
              rows={2}
            />
          </div>

          {/* USP */}
          <div className="space-y-1.5">
            <Label htmlFor="gpm-usp">USP-Fokus (optional)</Label>
            <Input
              id="gpm-usp"
              placeholder="z.B. 24h Notdienst, Original-Ersatzteile"
              value={uspFokus}
              onChange={(e) => setUspFokus(e.target.value)}
              disabled={generating}
            />
          </div>

          {/* Active Sections */}
          <div className="space-y-2">
            <Label>Aktive Sektionen</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {availableSections.map((sec) => (
                <label
                  key={sec.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
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

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              {error}
            </p>
          )}

          {/* Generate */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiere…
              </>
            ) : (
              "Seite generieren"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
