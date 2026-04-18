import { useState, useMemo } from "react";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SeoFormData } from "./SeoForm";

// ─── Types ────────────────────────────────────────────────────────────────

interface QaGateInteractiveProps {
  formData: SeoFormData;
  onPass: () => void;
  onBack: () => void;
  onFieldUpdate: (field: keyof SeoFormData | string, value: unknown) => void;
}

type WidgetType = "input" | "textarea" | "select" | "readonly";

interface QaItem {
  id: string;
  label: string;
  points: number;
  check: (f: SeoFormData) => boolean;
  widgetType: WidgetType;
  placeholder?: string;
  rows?: number;
  kiField?: string | null;
  options?: { value: string; label: string }[];
  backToStep?: string;
  hint?: string | ((f: SeoFormData) => string);
}

// ─── Constants ────────────────────────────────────────────────────────────

const DESIGN_PHILOSOPHY_OPTIONS = [
  { value: "trust_classic", label: "Trust Classic" },
  { value: "german_precision", label: "German Precision" },
  { value: "handwerk_pro", label: "Handwerk Pro" },
  { value: "luxury_dark", label: "Luxury Dark" },
  { value: "futuristic_tech", label: "Futuristic Tech" },
  { value: "glassmorphism", label: "Glassmorphism" },
  { value: "berlin_urban", label: "Berlin Urban" },
  { value: "medical_clean", label: "Medical Clean" },
  { value: "automotive", label: "Automotive" },
  { value: "editorial_bold", label: "Editorial Bold" },
  { value: "minimalist_swiss", label: "Minimalist Swiss" },
  { value: "gradient_flow", label: "Gradient Flow" },
  { value: "eco_green", label: "Eco Green" },
  { value: "warm_trustful", label: "Warm Trustful" },
  { value: "brutalist_raw", label: "Brutalist Raw" },
  { value: "trust", label: "Trust & Service" },
  { value: "midnight_executive", label: "Midnight Executive" },
  { value: "clean_editorial", label: "Clean Editorial" },
  { value: "eco_service", label: "Eco Service" },
  { value: "warm_craft", label: "Warm Craft" },
  { value: "tech_precision", label: "Tech Precision" },
];

const LP_PAGE_TYPES = new Set([
  "salesfunnel_leadgen",
  "salesfunnel_ecommerce",
  "landingpage_service",
  "landingpage_local",
]);

function buildQaItems(formData: SeoFormData): QaItem[] {
  const isLP = LP_PAGE_TYPES.has(formData.pageType);

  const base: QaItem[] = [
    {
      id: "keyword",
      label: "Keyword vorhanden",
      points: 15,
      check: (f) => !!f.keyword?.trim(),
      widgetType: "readonly",
      backToStep: "A",
      hint: "In Schritt A eingeben",
    },
    {
      id: "phone",
      label: "Telefonnummer (NAP)",
      points: 10,
      check: (f) => !!f.phone?.trim(),
      widgetType: "readonly",
      backToStep: "C",
      hint: "In Schritt C eingeben",
    },
    {
      id: "activeSections",
      label: "Sektionen ausgewählt (min. 3)",
      points: 10,
      check: (f) => (f.activeSections?.length || 0) >= 3,
      widgetType: "readonly",
      backToStep: "S",
      hint: (f) => `${f.activeSections?.length || 0} Sektionen aktiv`,
    },
    {
      id: "designPhilosophy",
      label: "Design-Philosophie gewählt",
      points: 5,
      check: (f) => !!f.designPhilosophy && f.designPhilosophy !== "",
      widgetType: "select",
      options: DESIGN_PHILOSOPHY_OPTIONS,
    },
  ];

  const seoItems: QaItem[] = [
    {
      id: "uniqueData",
      label: "Unique Data",
      points: 15,
      check: (f) => (f.uniqueData?.length || 0) > 20,
      widgetType: "textarea",
      placeholder:
        'Eigene Zahlen, Statistiken...\nz.B. "500+ Reparaturen 2024, Ø 90 Min"',
      kiField: "uniqueData",
      rows: 3,
    },
    {
      id: "informationGain",
      label: "Information Gain",
      points: 10,
      check: (f) => (f.informationGain?.length || 0) > 20,
      widgetType: "textarea",
      placeholder: "Was erfährt Nutzer exklusiv?",
      kiField: "informationGain",
      rows: 2,
    },
    {
      id: "authorName",
      label: "Autor-Name (E-E-A-T)",
      points: 10,
      check: (f) => !!f.authorName?.trim(),
      widgetType: "input",
      placeholder: "Vorname Nachname",
      kiField: null,
    },
    {
      id: "paaQuestions",
      label: "PAA-Fragen",
      points: 10,
      check: (f) => (f.paaQuestions?.length || 0) > 20,
      widgetType: "textarea",
      placeholder: "Typische Google-Fragen...",
      kiField: "paaQuestions",
      rows: 3,
    },
    {
      id: "contentGap",
      label: "Content Gap",
      points: 10,
      check: (f) => (f.contentGap?.length || 0) > 20,
      widgetType: "textarea",
      placeholder: "Was haben Top-3 nicht?",
      kiField: "contentGap",
      rows: 2,
    },
    {
      id: "uspFokus",
      label: "USP-Fokus",
      points: 5,
      check: (f) => (f.uspFokus?.length || 0) > 5,
      widgetType: "input",
      placeholder: "Stärkster Vorteil in 1 Satz",
      kiField: "uspFokus",
    },
  ];

  const lpItems: QaItem[] = [
    {
      id: "mainHeadline",
      label: "Haupt-Headline (H1)",
      points: 15,
      check: (f) => (f.mainHeadline?.length || 0) > 10,
      widgetType: "input",
      placeholder: 'z.B. "Waschmaschine repariert in 24h"',
      kiField: "mainHeadline",
    },
    {
      id: "landingPageGoal",
      label: "Ziel der Landingpage",
      points: 10,
      check: (f) => !!f.landingPageGoal,
      widgetType: "select",
      options: [
        { value: "call", label: "📞 Anruf generieren" },
        { value: "form", label: "📋 Formular ausfüllen" },
        { value: "booking", label: "📅 Termin buchen" },
        { value: "purchase", label: "🛒 Direktkauf" },
      ],
    },
    {
      id: "painPoints",
      label: "Schmerzpunkte definiert",
      points: 10,
      check: (f) =>
        (f.painPoints?.filter((p) => {
          const text =
            typeof p === "string"
              ? p
              : ((p as { title?: string })?.title || "");
          return text.length > 5;
        })?.length || 0) >= 3,
      widgetType: "textarea",
      placeholder: "Mindestens 3 Schmerzpunkte (einer pro Zeile)",
      kiField: "painPoints",
      rows: 4,
      hint: "Werden als Liste übergeben (eine pro Zeile)",
    },
    {
      id: "primaryCtaText",
      label: "CTA-Button Text",
      points: 5,
      check: (f) => (f.primaryCtaText?.length || 0) > 5,
      widgetType: "input",
      placeholder: "Jetzt kostenlos anfragen",
      kiField: null,
    },
    {
      id: "guaranteeText",
      label: "Garantie-Text",
      points: 5,
      check: (f) => (f.guaranteeText?.length || 0) > 10,
      widgetType: "textarea",
      placeholder: "Nicht zufrieden? Vollständige Rückerstattung.",
      kiField: "guarantee",
      rows: 2,
    },
    {
      id: "uspFokus",
      label: "USP-Fokus",
      points: 5,
      check: (f) => (f.uspFokus?.length || 0) > 5,
      widgetType: "input",
      placeholder: "Stärkster Vorteil",
      kiField: "uspFokus",
    },
  ];

  return [...base, ...(isLP ? lpItems : seoItems)];
}

// ─── Component ────────────────────────────────────────────────────────────

export function QaGateInteractive({
  formData,
  onPass,
  onBack,
  onFieldUpdate,
}: QaGateInteractiveProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Merge local string overrides into formData snapshot for live checks
  const localFormData = useMemo(() => {
    const merged: SeoFormData = { ...formData };
    for (const [k, v] of Object.entries(localValues)) {
      if (k === "painPoints") {
        // string textarea -> array for check function
        const arr = v.split("\n").map((s) => s.trim()).filter(Boolean);
        (merged as unknown as Record<string, unknown>)[k] = arr;
      } else {
        (merged as unknown as Record<string, unknown>)[k] = v;
      }
    }
    return merged;
  }, [formData, localValues]);

  const items = useMemo(() => buildQaItems(localFormData), [localFormData]);
  const totalPoints = items.reduce((s, i) => s + i.points, 0);
  const score = items.reduce(
    (s, i) => s + (i.check(localFormData) ? i.points : 0),
    0,
  );
  const scorePercent = Math.round((score / totalPoints) * 100);
  const missingCount = items.filter((i) => !i.check(localFormData)).length;

  const getDisplayValue = (item: QaItem): string => {
    if (item.id in localValues) return localValues[item.id];
    const raw = (formData as unknown as Record<string, unknown>)[item.id];
    if (Array.isArray(raw)) {
      return raw
        .map((p) =>
          typeof p === "string"
            ? p
            : ((p as { title?: string })?.title || ""),
        )
        .filter(Boolean)
        .join("\n");
    }
    return typeof raw === "string" ? raw : "";
  };

  const handleLocalChange = (item: QaItem, value: string) => {
    setLocalValues((prev) => ({ ...prev, [item.id]: value }));
    if (item.id === "painPoints") {
      const arr = value.split("\n").map((s) => s.trim()).filter(Boolean);
      onFieldUpdate("painPoints", arr);
    } else {
      onFieldUpdate(item.id, value);
    }
  };

  const handleKiSuggest = async (item: QaItem) => {
    if (!item.kiField) return;
    setLoadingField(item.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-field-suggestions",
        {
          body: {
            keyword: localFormData.keyword,
            pageType: localFormData.pageType,
            firm: localFormData.firmName,
            branche: localFormData.branche,
            targetAudience: localFormData.targetAudience,
            field: item.kiField,
          },
        },
      );
      if (error) throw error;
      const value = (data as Record<string, unknown> | null)?.[item.kiField];
      if (value === undefined || value === null) return;

      if (item.kiField === "painPoints" && Array.isArray(value)) {
        const arr = value.map((v) => String(v));
        const text = arr.join("\n");
        setLocalValues((prev) => ({ ...prev, [item.id]: text }));
        onFieldUpdate("painPoints", arr);
      } else if (Array.isArray(value)) {
        const text = value.map((v) => String(v)).join("\n");
        handleLocalChange(item, text);
      } else {
        handleLocalChange(item, String(value));
      }
      setExpanded((prev) => new Set(prev).add(item.id));
    } catch (e) {
      console.error("QA KI suggestion error:", e);
    } finally {
      setLoadingField(null);
    }
  };

  const handleFixAll = async () => {
    setIsLoadingAll(true);
    const missing = items.filter(
      (i) => !i.check(localFormData) && i.kiField,
    );
    for (const item of missing) {
      await handleKiSuggest(item);
      await new Promise((r) => setTimeout(r, 600));
    }
    setIsLoadingAll(false);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scoreColor =
    scorePercent >= 70
      ? "text-green-600"
      : scorePercent >= 40
      ? "text-yellow-600"
      : "text-red-600";
  const barColor =
    scorePercent >= 70
      ? "bg-green-500"
      : scorePercent >= 40
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm text-foreground">
            QA-Gate — Pre-Generation Check
          </span>
          <span className={`text-2xl font-bold ${scoreColor}`}>
            {scorePercent}%
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mb-1">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {score}/{totalPoints} Punkte • {missingCount} Felder noch offen
        </p>
      </div>

      {/* Status Banner */}
      {scorePercent < 40 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          ✗ Qualität unzureichend — bitte Mängel beheben
        </div>
      )}
      {scorePercent >= 40 && scorePercent < 70 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
          ⚠ Ausreichende Qualität — weitere Felder empfohlen
        </div>
      )}
      {scorePercent >= 70 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          ✓ Optimale Qualität — bereit zur Generierung
        </div>
      )}

      {/* Fix All Button */}
      {items.some((i) => !i.check(localFormData) && i.kiField) && (
        <button
          type="button"
          onClick={handleFixAll}
          disabled={isLoadingAll}
          className="w-full py-2.5 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoadingAll ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird optimiert...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Alle Mängel mit KI beheben
            </>
          )}
        </button>
      )}

      {/* Item list */}
      <div className="space-y-2">
        {items.map((item) => {
          const ok = item.check(localFormData);
          const isOpen = expanded.has(item.id) || (!ok && item.widgetType !== "readonly");
          const value = getDisplayValue(item);
          const hintText =
            typeof item.hint === "function" ? item.hint(localFormData) : item.hint;

          return (
            <div
              key={item.id}
              className={`rounded-lg border p-3 transition-colors ${
                ok
                  ? "border-green-200 bg-green-50/40"
                  : "border-red-200 bg-red-50/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-base ${
                    ok ? "text-green-600" : "text-red-600"
                  }`}
                  aria-hidden
                >
                  {ok ? "✓" : "✗"}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.points} Pkt
                </span>
                {item.widgetType !== "readonly" && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Aufklappen"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Readonly hint */}
              {item.widgetType === "readonly" && (
                <p className="text-xs text-muted-foreground mt-1.5 ml-7">
                  {hintText}
                  {item.backToStep && (
                    <button
                      type="button"
                      onClick={onBack}
                      className="ml-2 text-primary hover:underline"
                    >
                      → zurück zu Schritt {item.backToStep}
                    </button>
                  )}
                </p>
              )}

              {/* Editable widget */}
              {isOpen && item.widgetType !== "readonly" && (
                <div className="mt-3 ml-7 space-y-2">
                  {item.widgetType === "input" && (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleLocalChange(item, e.target.value)}
                      placeholder={item.placeholder}
                      className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                  {item.widgetType === "textarea" && (
                    <textarea
                      value={value}
                      onChange={(e) => handleLocalChange(item, e.target.value)}
                      placeholder={item.placeholder}
                      rows={item.rows || 2}
                      className="w-full text-sm p-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                  {item.widgetType === "select" && item.options && (
                    <select
                      value={value}
                      onChange={(e) => handleLocalChange(item, e.target.value)}
                      className="w-full text-sm p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">— bitte wählen —</option>
                      {item.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {hintText && (
                      <span className="text-xs text-muted-foreground">
                        {hintText}
                      </span>
                    )}
                    {item.kiField && (
                      <button
                        type="button"
                        onClick={() => handleKiSuggest(item)}
                        disabled={loadingField === item.id}
                        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {loadingField === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        KI-Vorschlag
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2 text-sm border border-input rounded-lg hover:bg-secondary"
        >
          ← Zurück
        </button>
        {scorePercent < 40 && (
          <button
            type="button"
            onClick={onPass}
            className="flex-1 py-2 text-sm text-muted-foreground border border-input rounded-lg hover:bg-secondary"
          >
            Trotzdem generieren
          </button>
        )}
        <button
          type="button"
          onClick={onPass}
          disabled={scorePercent < 40}
          className={`flex-[2] py-2 text-sm font-medium rounded-lg text-white transition-colors ${
            scorePercent >= 70
              ? "bg-green-600 hover:bg-green-700"
              : scorePercent >= 40
              ? "bg-primary hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {scorePercent >= 70
            ? "✓ Seite generieren"
            : scorePercent >= 40
            ? "Seite generieren →"
            : "Mängel beheben um fortzufahren"}
        </button>
      </div>
    </div>
  );
}
