import { useState, useEffect, useMemo, useCallback } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { buildMasterPrompt } from "@/lib/buildMasterPrompt";
import { useGenerationJob, clearStuckJob, cancelCurrentJob } from "@/hooks/useGenerationJob";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { SeoForm, type SeoFormData } from "./SeoForm";
import { QaGateInteractive } from "./QaGateInteractive";

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

// Map cluster_pages.page_type → SeoForm pageType (some legacy values differ)
function normalizePageType(pt: string): string {
  switch (pt) {
    case "pillar":
      return "pillar_page";
    case "transactional_local":
      return "transactional";
    default:
      return pt;
  }
}

function intentFromPageType(pt: string): string {
  switch (pt) {
    case "service":
    case "transactional":
    case "transactional_local":
    case "landingpage_service":
    case "landingpage_local":
    case "salesfunnel_leadgen":
    case "salesfunnel_ecommerce":
      return "Transactional";
    case "supporting_commercial":
      return "Commercial";
    default:
      return "Informational";
  }
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

  // Deep pages from sibling cluster_pages
  const [deepPagesText, setDeepPagesText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"form" | "qa">("form");
  const [pendingForm, setPendingForm] = useState<SeoFormData | null>(null);

  // Reset phase whenever modal reopens
  useEffect(() => {
    if (open) {
      setPhase("form");
      setPendingForm(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    clearStuckJob();
    (async () => {
      const { data } = await supabase
        .from("cluster_pages")
        .select("keyword, url_slug")
        .eq("cluster_id", cluster.id)
        .eq("page_type", "deep_page");
      if (data?.length) {
        setDeepPagesText(data.map((d) => `${d.keyword} → /${d.url_slug}`).join("\n"));
      }
    })();
  }, [open, cluster.id]);

  // Build sibling links string for prompt
  const siblingPagesString = useMemo(() => {
    return siblingPages
      .filter((p) => p.id !== clusterPage.id)
      .slice(0, 30)
      .map((p) => `${p.keyword} → /${p.url_slug}`)
      .join(", ");
  }, [siblingPages, clusterPage.id]);

  // Build initial SeoFormData from cluster + firm + clusterPage
  const initialData = useMemo<Partial<SeoFormData>>(() => {
    const normalizedPT = normalizePageType(clusterPage.page_type);
    return {
      keyword: clusterPage.keyword,
      pageType: normalizedPT,
      pillarTier: String(clusterPage.pillar_tier || 2),
      branche: cluster.branche || firm?.branche || "hausgeraete",
      sprache: cluster.sprache || firm?.sprache || "de",
      intent: intentFromPageType(clusterPage.page_type),
      // Cluster context
      pillarTitle: cluster.name || "",
      siblingPages: siblingPagesString,
      deepPages: deepPagesText,
      // Firm / NAP
      firmId: firm?.id || null,
      firmName: firm?.name || "",
      street: firm?.street || "",
      zip: firm?.zip || "",
      city: firm?.city || "",
      phone: firm?.phone || "",
      email: firm?.email || "",
      website: firm?.website || "",
      serviceArea: firm?.service_area || "",
      oeffnungszeiten: firm?.oeffnungszeiten || "",
      // Author / E-E-A-T
      authorName: firm?.author || "",
      authorTitle: firm?.author_title || "",
      experienceYears: firm?.author_experience?.toString() || "",
      certificates: firm?.author_certs || "",
      // Schema rating
      rating: firm?.rating?.toString() || "4.9",
      reviewCount: firm?.review_count?.toString() || "",
      // Design — cluster wins, then firm
      designPreset: "trust",
      primaryColor:
        cluster.primary_color || firm?.primary_color || "#1d4ed8",
      sectionData:
        ((cluster as unknown as { section_data?: Record<string, string> }).section_data) || {},
    };
  }, [clusterPage, cluster, firm, siblingPagesString, deepPagesText]);

  // When job result arrives, propagate
  useEffect(() => {
    if (result?.pageId && !generating && submitting) {
      setSubmitting(false);
      onSuccess(result.pageId, jobId || "");
    }
  }, [result, generating, submitting, jobId, onSuccess]);

  const handleFormSubmit = useCallback((form: SeoFormData) => {
    clearError();
    setPendingForm(form);
    setPhase("qa");
  }, [clearError]);

  const runGeneration = useCallback(
    async (form: SeoFormData) => {
      clearError();
      setSubmitting(true);

      // Resolve design fields — Form input wins, then cluster, then firm
      const designPhilosophy =
        form.designPhilosophy || cluster.design_philosophy || firm?.design_philosophy || "trust_classic";
      const designPhilosophyCustom =
        form.designPhilosophyCustom || cluster.design_philosophy_custom || firm?.design_philosophy_custom || "";
      const primaryColor =
        form.primaryColor || cluster.primary_color || firm?.primary_color || "#1d4ed8";
      const secondaryColor =
        form.secondaryColor || cluster.secondary_color || firm?.secondary_color || "#ffffff";
      const accentColor =
        form.accentColor || cluster.accent_color || firm?.accent_color || "#dc2626";

      // Build complete formData payload — merge SeoFormData with cluster/job-specific fields
      const formData: Record<string, unknown> = {
        // Page identity
        keyword: form.keyword,
        firmId: firm?.id || null,
        pageType: form.pageType,
        pillarTier: parseInt(form.pillarTier, 10) || 2,
        urlSlug: clusterPage.url_slug,
        branche: form.branche,
        sprache: form.sprache,

        // Firm / NAP
        firm: form.firmName,
        street: form.street,
        zip: form.zip,
        city: form.city,
        phone: form.phone,
        email: form.email,
        website: form.website,
        serviceArea: form.serviceArea,
        oeffnungszeiten: form.oeffnungszeiten,

        // Author / E-E-A-T
        author: form.authorName,
        authorTitle: form.authorTitle,
        authorExperience: form.experienceYears,
        authorCerts: form.certificates,
        reviewer: form.reviewer,
        caseStudy: form.caseStudy,

        // Core SEO
        uniqueData: form.uniqueData,
        infoGain: form.informationGain,
        informationGain: form.informationGain,
        uspFokus: form.uspFokus,
        intent: form.intent,
        toneOfVoice: form.toneOfVoice,
        secondaryKeywords: form.secondaryKeywords,
        lsiTerms: form.lsiTerms,
        negativeKeywords: form.negativeKeywords,
        paaQuestions: form.paaQuestions,
        contentGap: form.contentGap,
        deepPages: form.deepPages,
        pillarUrl: form.pillarUrl,
        pillarTitle: form.pillarTitle,

        // Schema
        schemaBlocks: form.schemaBlocks,
        breadcrumb: form.breadcrumb,
        rating: form.rating,
        reviewCount: form.reviewCount,
        informationGainFlag: !!form.informationGain.trim(),
        comparativeCheck: form.comparativeCheck === "Top-3 analysiert",
        discoverReady: form.discoverReady === "Ja-Bild vorhanden",

        // Pricing
        kvaPrice: form.kvaPrice,
        priceRange: form.priceRange,
        priceCard1: form.priceCard1,
        priceCard2: form.priceCard2,
        priceCard3: form.priceCard3,
        repairVsBuy: form.repairVsBuy,

        // Design
        outputMode: form.outputMode,
        designPreset: form.designPreset,
        designPhilosophy,
        designPhilosophyCustom,
        primaryColor,
        secondaryColor,
        accentColor,
        targetAudience: form.targetAudience || cluster.target_audience || firm?.target_audience || "privatkunden",
        themeContext: form.themeContext || cluster.theme_context || firm?.theme_context || "",
        differentiation: form.differentiation || cluster.differentiation || firm?.differentiation || "",
        imageStrategy: form.imageStrategy,
        imagePlaceholders: form.imagePlaceholders || false,

        // Sections (as labels for n8n compatibility)
        activeSections: form.activeSections,
        sectionData: form.sectionData || {},

        // Cluster linking
        siblingPages: siblingPagesString,
        clusterPageId: clusterPage.id,
        clusterId: cluster.id,
        webhookPath: "seo-generate",

        // Landingpage / Sales Funnel fields
        landingPageGoal: form.landingPageGoal,
        mainHeadline: form.mainHeadline,
        primaryCtaText: form.primaryCtaText,
        secondaryCtaText: form.secondaryCtaText,
        videoUrl: form.videoUrl,
        formType: form.formType,
        countdownActive: form.countdownActive,
        countdownEndDate: form.countdownEndDate,
        countdownText: form.countdownText,
        urgencyBarActive: form.urgencyBarActive,
        urgencyBarText: form.urgencyBarText,
        guaranteeTitle: form.guaranteeTitle,
        guaranteeText: form.guaranteeText,
        socialProofCustomers: form.socialProofCustomers,
        socialProofRating: form.socialProofRating,
        socialProofReviews: form.socialProofReviews,
        socialProofYears: form.socialProofYears,
        socialProofWidgetActive: form.socialProofWidgetActive,
        painPoints: form.painPoints,
        personas: form.personas,
        bonusStack: form.bonusStack,
        leadMagnetTitle: form.leadMagnetTitle,
        leadMagnetDescription: form.leadMagnetDescription,
      };

      const basePrompt = buildMasterPrompt(formData);
      await startGeneration({ ...formData, basePrompt });
    },
    [
      clearError,
      cluster,
      firm,
      clusterPage,
      siblingPagesString,
      startGeneration,
    ],
  );

  const handleCancel = useCallback(async () => {
    await cancelCurrentJob("Vom Nutzer abgebrochen");
    setSubmitting(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!generating && !v) onClose(); }}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seite generieren</DialogTitle>
          <DialogDescription>
            {clusterPage.keyword} · {clusterPage.page_type}
            {firm && <> · {firm.name}</>}
          </DialogDescription>
        </DialogHeader>

        {(generating || submitting) ? (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                Seite wird generiert…
              </p>
              <p className="text-xs text-muted-foreground">
                Das kann 1–3 Minuten dauern. Du kannst diesen Tab geschlossen lassen — die Generierung läuft im Hintergrund weiter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="mt-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                ✕ Generierung abbrechen
              </Button>
            </div>
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}
          </div>
        ) : phase === "qa" && pendingForm ? (
          <div className="pt-2">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}
            <QaGateInteractive
              formData={pendingForm}
              onBack={() => setPhase("form")}
              onFieldUpdate={(field, value) => {
                setPendingForm((prev) =>
                  prev ? ({ ...prev, [field]: value } as SeoFormData) : prev,
                );
              }}
              onPass={() => {
                if (pendingForm) runGeneration(pendingForm);
              }}
            />
          </div>
        ) : (
          <div className="pt-2">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}
            <SeoForm
              initialData={pendingForm ?? initialData}
              autoFilledFields={{
                keyword: true,
                pageType: true,
                firmName: !!firm?.name,
                city: !!firm?.city,
                phone: !!firm?.phone,
                authorName: !!firm?.author,
              }}
              onSubmit={handleFormSubmit}
              onBack={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
