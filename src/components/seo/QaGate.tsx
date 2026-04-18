import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, ChevronDown, RotateCcw, CheckCheck, Eye } from "lucide-react";
import type { SeoFormData } from "./SeoForm";

// ─── Types ────────────────────────────────────────────────────────────────

type Priority = "K" | "H" | "M"; // Kritisch, Hoch, Mittel

interface QaParameter {
  id: string;
  label: string;
  detail: string;
  priority: Priority;
}

interface QaCategory {
  id: string;
  label: string;
  colorClasses: { badge: string; header: string; progress: string };
  params: QaParameter[];
}

interface QaGateProps {
  formData: SeoFormData;
  onBack: () => void;
  onGenerate: (data: SeoFormData) => void;
}

// ─── Data ─────────────────────────────────────────────────────────────────

const CATEGORIES: QaCategory[] = [
  {
    id: "tech",
    label: "Technisch & CWV",
    colorClasses: { badge: "bg-purple-100 text-purple-800", header: "text-purple-700", progress: "bg-purple-500" },
    params: [
      { id: "t1", label: "CLS < 0.1", detail: "Alle Bilder width+height Attribut, kein Layout-Shift", priority: "K" },
      { id: "t2", label: "LCP < 2.5s", detail: "Hero-Bild loading=eager fetchpriority=high", priority: "K" },
      { id: "t3", label: "INP < 200ms", detail: "Kein schweres JS, nur Smooth-Scroll Script", priority: "H" },
      { id: "t4", label: "HTTPS aktiv", detail: "Pflicht seit 2018", priority: "K" },
      { id: "t5", label: "Canonical-Tag gesetzt", detail: "Verhindert Duplicate Content", priority: "K" },
      { id: "t6", label: "robots.txt crawlbar", detail: "Kein Disallow für Hauptseiten", priority: "K" },
      { id: "t7", label: "URL-Slug sauber", detail: "Kleinbuchstaben, Bindestriche, keine Umlaute", priority: "H" },
      { id: "t8", label: "Mobile Tap-Targets ≥44px", detail: "Alle Buttons/Links berührbar", priority: "H" },
      { id: "t9", label: "Inline CSS only", detail: "Kein externes Stylesheet", priority: "M" },
      { id: "t10", label: "Kein Render-Blocking Script im Head", detail: "Kein script ohne async/defer", priority: "H" },
    ],
  },
  {
    id: "onpage",
    label: "On-Page SEO",
    colorClasses: { badge: "bg-blue-100 text-blue-800", header: "text-blue-700", progress: "bg-blue-500" },
    params: [
      { id: "o1", label: "H1 enthält Keyword exakt (1x)", detail: "Danach nur Synonyme", priority: "K" },
      { id: "o2", label: "Title ≤60 Zeichen, Keyword zuerst", detail: "Kein Abschneiden in SERP", priority: "K" },
      { id: "o3", label: "Meta-Description 140–155 Zeichen", detail: "CTR-Optimierung", priority: "H" },
      { id: "o4", label: "Keyword-Dichte ≤1%", detail: "Kein Keyword-Stuffing", priority: "K" },
      { id: "o5", label: "8+ LSI-Begriffe natürlich eingebaut", detail: "Topical Authority", priority: "H" },
      { id: "o6", label: "Entities benannt (Marke, Modell, Ort)", detail: "Knowledge Graph", priority: "H" },
      { id: "o7", label: "H-Hierarchie korrekt (H1→H2→H3)", detail: "Passage Indexing", priority: "M" },
      { id: "o8", label: "Alle PAA-Fragen beantwortet", detail: "Featured Snippet Chancen", priority: "H" },
      { id: "o9", label: "Unique Data sichtbar und prominent", detail: "HCU-Schutz", priority: "K" },
      { id: "o10", label: "Lesbarkeit: Sätze ≤20 Wörter", detail: "Verweildauer", priority: "M" },
      { id: "o11", label: "Text-Bild-Mix in Hauptsektionen", detail: "Absprungrate senken", priority: "M" },
      { id: "o12", label: "3+ interne Links (Cluster)", detail: "PageRank-Flow", priority: "H" },
    ],
  },
  {
    id: "eeat",
    label: "E-E-A-T",
    colorClasses: { badge: "bg-teal-100 text-teal-800", header: "text-teal-700", progress: "bg-teal-500" },
    params: [
      { id: "e1", label: "Autorbox mit Name + Foto-Platzhalter", detail: "Seit Dez 2025 universell", priority: "K" },
      { id: "e2", label: "Zertifikate + Qualifikationen sichtbar", detail: "Trust-Signal", priority: "H" },
      { id: "e3", label: "Datum: Erstellt + Aktualisiert", detail: "Freshness-Signal", priority: "H" },
      { id: "e4", label: "Reviewer / Checker benannt", detail: "Peer Review Signal", priority: "M" },
      { id: "e5", label: "Experience-Anker: konkreter Fall", detail: "Mount-AI-Schutz mit Modellnr.", priority: "K" },
      { id: "e6", label: "Fachbegriffe authentisch verwendet", detail: "Echte Expertise", priority: "H" },
      { id: "e7", label: "NAP vollständig und konsistent", detail: "Local SEO Pflicht", priority: "K" },
      { id: "e8", label: "Impressum/Datenschutz erreichbar", detail: "Trust + Recht", priority: "K" },
    ],
  },
  {
    id: "schema",
    label: "Schema",
    colorClasses: { badge: "bg-red-100 text-red-800", header: "text-red-700", progress: "bg-red-500" },
    params: [
      { id: "s1", label: "FAQPage valide (Fragen = sichtbar)", detail: "Kein Ghost-Schema", priority: "K" },
      { id: "s2", label: "HowTo mit echten Zeitangaben", detail: "Rich Result", priority: "H" },
      { id: "s3", label: "LocalBusiness vollständig (NAP+Hours)", detail: "Local Pack", priority: "K" },
      { id: "s4", label: "BreadcrumbList korrekt", detail: "SERP URL-Zeile", priority: "M" },
      { id: "s5", label: "Schema-Werte = sichtbarer Text", detail: "Kein Spam-Schema", priority: "K" },
      { id: "s6", label: "AggregateRating: nur echte Werte", detail: "Kein Fake-Rating", priority: "K" },
      { id: "s7", label: "Rich Results Test: 0 Fehler", detail: "Validator vor Launch", priority: "H" },
    ],
  },
  {
    id: "cluster",
    label: "Cluster & Verlinkung",
    colorClasses: { badge: "bg-amber-100 text-amber-800", header: "text-amber-700", progress: "bg-amber-500" },
    params: [
      { id: "c1", label: "Link zur Pillar-Seite", detail: "Topical Authority", priority: "K" },
      { id: "c2", label: "Pillar verlinkt zurück", detail: "Bidirektional", priority: "K" },
      { id: "c3", label: "2+ Geschwister-Seiten verlinkt", detail: "Horizontale Stärkung", priority: "H" },
      { id: "c4", label: "3+ eingehende interne Links", detail: "PageRank Fluss", priority: "H" },
      { id: "c5", label: "Anchor-Texte variiert", detail: "Kein Exact-Match Spam", priority: "H" },
      { id: "c6", label: "Keine Keyword-Kannibalisierung", detail: "Zwei Seiten konkurrieren nicht", priority: "K" },
    ],
  },
  {
    id: "psycho",
    label: "Psychologie & Conversion",
    colorClasses: { badge: "bg-violet-100 text-violet-800", header: "text-violet-700", progress: "bg-violet-500" },
    params: [
      { id: "p1", label: "AIDA-Hook in ersten 100 Pixeln", detail: "3-Sekunden-Entscheidung", priority: "K" },
      { id: "p2", label: "Erster CTA nach Sektion 8–9", detail: "Nicht zu früh", priority: "H" },
      { id: "p3", label: "Risikoumkehr als eigene Karte", detail: "Verlust-Aversion", priority: "H" },
      { id: "p4", label: "Testimonials vollständig", detail: "Name + Ort + Gerät — konkrete Details", priority: "M" },
      { id: "p5", label: "Trust-Layer sichtbar (Badges, Siegel)", detail: "+15–30% Conversion", priority: "M" },
    ],
  },
  {
    id: "updates2026",
    label: "2026 Updates",
    colorClasses: { badge: "bg-rose-100 text-rose-800", header: "text-rose-700", progress: "bg-rose-500" },
    params: [
      { id: "u1", label: "Information Gain Sektion vorhanden", detail: "März 2026 Core Update", priority: "K" },
      { id: "u2", label: "Discover-Ready: Bild 1200x675 + meta", detail: "max-image-preview:large — Feb 2026", priority: "H" },
      { id: "u3", label: "Comparative Value: Top-3 adressiert", detail: "März 2026", priority: "K" },
      { id: "u4", label: "Mount-AI-Schutz: keine Fülltext-Sektionen", detail: "Feb 2026", priority: "K" },
      { id: "u5", label: "SpeakableSpecification für Voice Search", detail: "AI Overviews", priority: "M" },
      { id: "u6", label: "AI Overview-Optimierung: 2-Satz-Antworten", detail: "Direkte Antworten unter H2 — 2026", priority: "H" },
    ],
  },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string; weight: number }> = {
  K: { label: "Kritisch", className: "bg-red-100 text-red-800", weight: 3 },
  H: { label: "Hoch", className: "bg-amber-100 text-amber-800", weight: 2 },
  M: { label: "Mittel", className: "bg-blue-100 text-blue-800", weight: 1 },
};

// ─── Auto-check logic ─────────────────────────────────────────────────────

function autoCheckParams(formData: SeoFormData): Set<string> {
  const checked = new Set<string>();
  const d = formData;

  // Tech
  if (d.keyword) checked.add("t4"); // HTTPS assumed
  if (d.keyword) checked.add("t5"); // canonical will be set
  if (d.keyword) checked.add("t6"); // robots ok
  if (!/[äöüß\s]/.test(d.keyword.replace(/\s+/g, "-").toLowerCase())) checked.add("t7");
  checked.add("t8"); // we enforce 44px
  checked.add("t9"); // inline CSS

  // On-Page
  if (d.keyword) checked.add("o1");
  if (d.keyword && d.keyword.length <= 50) checked.add("o2");
  if (d.lsiTerms && d.lsiTerms.split(",").filter(Boolean).length >= 8) checked.add("o5");
  if (d.firmName || d.city) checked.add("o6");
  if (d.paaQuestions && d.paaQuestions.split("\n").filter(Boolean).length >= 3) checked.add("o8");
  if (d.uniqueData.trim()) checked.add("o9");
  if (d.siblingPages || d.pillarUrl) checked.add("o12");

  // E-E-A-T
  if (d.authorName.trim()) checked.add("e1");
  if (d.certificates.trim()) checked.add("e2");
  checked.add("e3"); // dates auto-added
  if (d.reviewer.trim()) checked.add("e4");
  if (d.caseStudy.trim()) checked.add("e5");
  if (d.lsiTerms.trim()) checked.add("e6");
  if (d.firmName && d.city && d.phone) checked.add("e7");

  // Schema
  if (d.schemaBlocks.includes("FAQPage") && d.paaQuestions.trim()) checked.add("s1");
  if (d.schemaBlocks.includes("HowTo")) checked.add("s2");
  if (d.schemaBlocks.includes("LocalBusiness") && d.firmName && d.city && d.phone) checked.add("s3");
  if (d.schemaBlocks.includes("BreadcrumbList") || d.breadcrumb.trim()) checked.add("s4");
  if (d.schemaBlocks.length > 0) checked.add("s5");
  if (d.rating && d.reviewCount) checked.add("s6");

  // Cluster
  if (d.pillarUrl.trim()) checked.add("c1");
  if (d.pillarUrl.trim()) checked.add("c2"); // assume bidirectional
  if (d.siblingPages && d.siblingPages.split("\n").filter(Boolean).length >= 2) checked.add("c3");
  if (d.deepPages.trim() || d.siblingPages.trim()) checked.add("c4");
  checked.add("c5"); // anchor variation enforced
  if (d.contentGap.trim()) checked.add("c6");

  // Psycho
  checked.add("p1"); // AIDA built into template
  checked.add("p2"); // CTA placement enforced
  if (d.repairVsBuy.trim() || d.priceRange.trim()) checked.add("p3");

  // 2026
  if (d.informationGain.trim()) checked.add("u1");
  if (d.discoverReady === "Ja-Bild vorhanden" || d.discoverReady === "NanoBanana generieren") checked.add("u2");
  if (d.comparativeCheck === "Top-3 analysiert") checked.add("u3");
  if (d.uniqueData.trim() && d.informationGain.trim()) checked.add("u4");

  return checked;
}

// ─── Component ────────────────────────────────────────────────────────────

export function QaGate({ formData, onBack, onGenerate }: QaGateProps) {
  const autoChecked = useMemo(() => autoCheckParams(formData), [formData]);
  const [checkedParams, setCheckedParams] = useState<Set<string>>(() => autoChecked);
  const [detailMode, setDetailMode] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const toggleParam = useCallback((id: string) => {
    setCheckedParams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleDetail = useCallback((id: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const checkAll = useCallback(() => {
    const all = new Set<string>();
    CATEGORIES.forEach((c) => c.params.forEach((p) => all.add(p.id)));
    setCheckedParams(all);
  }, []);

  const resetAll = useCallback(() => {
    setCheckedParams(autoChecked);
  }, [autoChecked]);

  // Score
  const { score, totalWeight, checkedWeight } = useMemo(() => {
    let tw = 0;
    let cw = 0;
    CATEGORIES.forEach((cat) => {
      cat.params.forEach((p) => {
        const w = PRIORITY_CONFIG[p.priority].weight;
        tw += w;
        if (checkedParams.has(p.id)) cw += w;
      });
    });
    return { score: tw > 0 ? Math.round((cw / tw) * 100) : 0, totalWeight: tw, checkedWeight: cw };
  }, [checkedParams]);

  const categoryScores = useMemo(() => {
    const map: Record<string, { checked: number; total: number }> = {};
    CATEGORIES.forEach((cat) => {
      const total = cat.params.length;
      const checked = cat.params.filter((p) => checkedParams.has(p.id)).length;
      map[cat.id] = { checked, total };
    });
    return map;
  }, [checkedParams]);

  const gateColor = score >= 85 ? "green" : score >= 60 ? "amber" : "red";

  return (
    <div className="space-y-6">
      {/* Score bar */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">QA-Gate — Pre-Generation Check</h2>
          <span className={`text-3xl font-black ${
            gateColor === "green" ? "text-green-600" : gateColor === "amber" ? "text-amber-600" : "text-red-600"
          }`}>
            {score}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              gateColor === "green" ? "bg-green-500" : gateColor === "amber" ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {checkedWeight}/{totalWeight} gewichtete Punkte • 56 Parameter in 7 Kategorien
        </p>
      </div>

      {/* Gate Status */}
      <div className={`rounded-lg border-2 p-4 text-sm font-medium ${
        gateColor === "green"
          ? "border-green-500 bg-green-50 text-green-800"
          : gateColor === "amber"
          ? "border-amber-500 bg-amber-50 text-amber-800"
          : "border-red-500 bg-red-50 text-red-800"
      }`}>
        {gateColor === "green"
          ? "✅ FREIGABE — HTML-Generierung möglich"
          : gateColor === "amber"
          ? `⚠️ Fast bereit — ${85 - score}% bis Freigabe`
          : `❌ Nicht bereit — Score ≥85% erforderlich (aktuell ${score}%)`}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={checkAll} className="h-9 gap-1.5 text-xs">
          <CheckCheck className="h-3.5 w-3.5" /> Alle abhaken
        </Button>
        <Button variant="outline" size="sm" onClick={resetAll} className="h-9 gap-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen
        </Button>
        <Button
          variant={detailMode ? "default" : "outline"}
          size="sm"
          onClick={() => setDetailMode(!detailMode)}
          className="h-9 gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" /> Detail-Modus
        </Button>
      </div>

      {/* Categories */}
      <Accordion type="multiple" defaultValue={CATEGORIES.map((c) => c.id)} className="space-y-2">
        {CATEGORIES.map((cat) => {
          const cs = categoryScores[cat.id];
          return (
            <AccordionItem key={cat.id} value={cat.id} className="rounded-lg border border-border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 w-full">
                  <Badge className={`${cat.colorClasses.badge} text-xs px-2 py-0.5`}>
                    {cs.checked}/{cs.total}
                  </Badge>
                  <span className={`text-sm font-bold ${cat.colorClasses.header}`}>
                    {cat.label}
                  </span>
                  <div className="flex-1 mx-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cat.colorClasses.progress}`}
                      style={{ width: `${cs.total > 0 ? (cs.checked / cs.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3 pt-0">
                <div className="space-y-1">
                  {cat.params.map((param) => {
                    const isChecked = checkedParams.has(param.id);
                    const showDetail = detailMode || expandedDetails.has(param.id);
                    const pc = PRIORITY_CONFIG[param.priority];
                    return (
                      <div key={param.id} className="rounded-md border border-border/50 bg-background p-2.5">
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleParam(param.id)}
                            className="shrink-0"
                          />
                          <span className={`text-sm flex-1 ${isChecked ? "text-foreground" : "text-muted-foreground"}`}>
                            {param.label}
                          </span>
                          <Badge className={`${pc.className} text-[10px] px-1.5 py-0 h-5 shrink-0`}>
                            {pc.label}
                          </Badge>
                          {!detailMode && (
                            <button
                              onClick={() => toggleDetail(param.id)}
                              className="text-xs text-muted-foreground hover:text-foreground px-1"
                            >
                              {showDetail ? "−" : "+"}
                            </button>
                          )}
                        </div>
                        {showDetail && (
                          <p className="text-xs text-muted-foreground mt-1.5 ml-7">
                            {param.detail}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
        <Button variant="outline" onClick={onBack} className="min-h-[44px] gap-2">
          <ArrowLeft className="h-4 w-4" /> Zurück und ergänzen
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {score < 85 && (
            <Button
              variant="outline"
              onClick={() => onGenerate(formData)}
              className="min-h-[44px] gap-2 text-muted-foreground"
              title="Generierung ohne 85%-Freigabe starten"
            >
              Trotzdem generieren
            </Button>
          )}
          <Button
            onClick={() => onGenerate(formData)}
            disabled={score < 60}
            className={`min-h-[44px] gap-2 ${
              score >= 85
                ? "bg-green-600 hover:bg-green-700"
                : score >= 60
                ? "bg-amber-600 hover:bg-amber-700"
                : ""
            }`}
          >
            Seite generieren
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
