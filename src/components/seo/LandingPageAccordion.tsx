import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SeoFormData } from "./SeoForm";

interface Props {
  form: SeoFormData;
  update: <K extends keyof SeoFormData>(key: K, value: SeoFormData[K]) => void;
}

export function LandingPageAccordion({ form, update }: Props) {
  const [headlineSuggestions, setHeadlineSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  async function callSuggest(field: string): Promise<Record<string, unknown> | null> {
    setLoading(field);
    try {
      const { data, error } = await supabase.functions.invoke("generate-field-suggestions", {
        body: {
          keyword: form.keyword,
          pageType: form.pageType,
          firm: form.firmName,
          branche: form.branche,
          targetAudience: "",
          field,
        },
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    } catch (err) {
      toast.error(`KI-Vorschlag fehlgeschlagen: ${err instanceof Error ? err.message : "Unknown"}`);
      return null;
    } finally {
      setLoading(null);
    }
  }

  async function suggestHeadline() {
    const data = await callSuggest("mainHeadline");
    if (data?.headlines && Array.isArray(data.headlines)) {
      setHeadlineSuggestions(data.headlines as string[]);
    } else if (typeof data?.mainHeadline === "string") {
      update("mainHeadline", data.mainHeadline);
    }
  }

  async function suggestPainPoints() {
    const data = await callSuggest("painPoints");
    if (data?.painPoints && Array.isArray(data.painPoints)) {
      const pts = (data.painPoints as string[]).slice(0, 6);
      const filled = [...pts, ...Array(6).fill("")].slice(0, 6);
      update("painPoints", filled);
      toast.success("6 Schmerzpunkte generiert");
    }
  }

  async function suggestPersonas() {
    const data = await callSuggest("personas");
    if (data?.personas && Array.isArray(data.personas)) {
      const ps = (data.personas as Array<{ emoji?: string; title?: string; description?: string }>)
        .slice(0, 3)
        .map((p) => ({ emoji: p.emoji || "", title: p.title || "", description: p.description || "" }));
      while (ps.length < 3) ps.push({ emoji: "", title: "", description: "" });
      update("personas", ps);
      toast.success("3 Personas generiert");
    }
  }

  function updatePainPoint(idx: number, value: string) {
    const arr = [...(form.painPoints || ["", "", "", "", "", ""])];
    arr[idx] = value;
    update("painPoints", arr);
  }

  function updatePersona(idx: number, key: "emoji" | "title" | "description", value: string) {
    const arr = [...(form.personas || [])];
    while (arr.length < 3) arr.push({ emoji: "", title: "", description: "" });
    arr[idx] = { ...arr[idx], [key]: value };
    update("personas", arr);
  }

  function updateBonus(idx: number, key: "title" | "value", value: string) {
    const arr = [...(form.bonusStack || [])];
    while (arr.length < 3) arr.push({ title: "", value: "" });
    arr[idx] = { ...arr[idx], [key]: value };
    update("bonusStack", arr);
  }

  const painPoints = form.painPoints || ["", "", "", "", "", ""];
  const personas = form.personas || [
    { emoji: "", title: "", description: "" },
    { emoji: "", title: "", description: "" },
    { emoji: "", title: "", description: "" },
  ];
  const bonusStack = form.bonusStack || [
    { title: "", value: "" },
    { title: "", value: "" },
    { title: "", value: "" },
  ];

  return (
    <Accordion type="single" collapsible defaultValue="lp" className="border-2 border-amber-300 rounded-lg bg-amber-50/30">
      <AccordionItem value="lp" className="border-0">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-2">
            <span className="text-amber-600">⚡</span>
            <span className="font-bold text-sm">Landingpage-Einstellungen</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({form.pageType})
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <Tabs defaultValue="basis">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="basis">Basis</TabsTrigger>
              <TabsTrigger value="psycho">Psychologie</TabsTrigger>
              <TabsTrigger value="proof">Social Proof</TabsTrigger>
              <TabsTrigger value="content">Inhalte</TabsTrigger>
              <TabsTrigger value="offer">Angebot</TabsTrigger>
            </TabsList>

            {/* TAB 1 — BASIS */}
            <TabsContent value="basis" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Haupt-Headline (wird zur H1) <span className="text-red-600">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={suggestHeadline}
                    disabled={loading === "mainHeadline" || !form.keyword}
                    className="h-7 text-xs gap-1"
                  >
                    {loading === "mainHeadline" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    KI-Headline
                  </Button>
                </div>
                <Input
                  value={form.mainHeadline || ""}
                  onChange={(e) => update("mainHeadline", e.target.value)}
                  placeholder="Beko Waschmaschine repariert in 24h — oder kostenlos"
                />
                {headlineSuggestions.length > 0 && (
                  <div className="space-y-1.5 mt-2 p-2 bg-white rounded-md border border-border">
                    <p className="text-[10px] text-muted-foreground font-medium">Vorschläge — klick zum Übernehmen:</p>
                    {headlineSuggestions.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          update("mainHeadline", h);
                          setHeadlineSuggestions([]);
                          toast.success("Headline übernommen");
                        }}
                        className="w-full text-left text-xs p-2 rounded hover:bg-accent border border-border flex items-start gap-2"
                      >
                        <Check className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Ziel der Seite</Label>
                <select
                  value={form.landingPageGoal || "call"}
                  onChange={(e) => update("landingPageGoal", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="call">📞 Anruf generieren</option>
                  <option value="form">📋 Formular ausfüllen</option>
                  <option value="booking">📅 Termin buchen</option>
                  <option value="purchase">🛒 Direktkauf</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Primärer CTA Button Text</Label>
                  <Input
                    value={form.primaryCtaText || ""}
                    onChange={(e) => update("primaryCtaText", e.target.value)}
                    placeholder="Jetzt kostenlos anfragen"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Sekundärer CTA (optional)</Label>
                  <Input
                    value={form.secondaryCtaText || ""}
                    onChange={(e) => update("secondaryCtaText", e.target.value)}
                    placeholder="Auf WhatsApp schreiben"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Video URL (YouTube/Vimeo)</Label>
                <Input
                  value={form.videoUrl || ""}
                  onChange={(e) => update("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Kontaktformular Typ</Label>
                <select
                  value={form.formType || "multistep"}
                  onChange={(e) => update("formType", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="simple">Einfaches Formular</option>
                  <option value="multistep">Multi-Step (empfohlen)</option>
                  <option value="conversational">Dialog-Stil (2026)</option>
                </select>
              </div>
            </TabsContent>

            {/* TAB 2 — PSYCHOLOGIE */}
            <TabsContent value="psycho" className="space-y-4 pt-4">
              <div className="rounded-lg border border-border bg-white p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">⏱ Countdown aktivieren</Label>
                  <Switch
                    checked={!!form.countdownActive}
                    onCheckedChange={(v) => update("countdownActive", v)}
                  />
                </div>
                {form.countdownActive && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Countdown Enddatum</Label>
                      <Input
                        type="date"
                        value={form.countdownEndDate || ""}
                        onChange={(e) => update("countdownEndDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Countdown Text</Label>
                      <Input
                        value={form.countdownText || ""}
                        onChange={(e) => update("countdownText", e.target.value)}
                        placeholder="Angebot endet in:"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-white p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">🔥 Urgency Bar aktivieren</Label>
                  <Switch
                    checked={!!form.urgencyBarActive}
                    onCheckedChange={(v) => update("urgencyBarActive", v)}
                  />
                </div>
                {form.urgencyBarActive && (
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <Label className="text-xs">Urgency Bar Text</Label>
                    <Input
                      value={form.urgencyBarText || ""}
                      onChange={(e) => update("urgencyBarText", e.target.value)}
                      placeholder="🔥 Nur noch heute: Kostenlose Erstberatung verfügbar"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Garantie Titel</Label>
                <Input
                  value={form.guaranteeTitle || ""}
                  onChange={(e) => update("guaranteeTitle", e.target.value)}
                  placeholder="Unsere Garantie"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Garantie-Text</Label>
                <Textarea
                  value={form.guaranteeText || ""}
                  onChange={(e) => update("guaranteeText", e.target.value)}
                  rows={2}
                  placeholder="Nicht zufrieden? Vollständige Rückerstattung innerhalb 30 Tagen."
                />
              </div>
            </TabsContent>

            {/* TAB 3 — SOCIAL PROOF */}
            <TabsContent value="proof" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Kunden</Label>
                  <Input
                    type="number"
                    value={form.socialProofCustomers || ""}
                    onChange={(e) => update("socialProofCustomers", e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Ø Bewertung</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.socialProofRating || ""}
                    onChange={(e) => update("socialProofRating", e.target.value)}
                    placeholder="4.9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Bewertungen</Label>
                  <Input
                    type="number"
                    value={form.socialProofReviews || ""}
                    onChange={(e) => update("socialProofReviews", e.target.value)}
                    placeholder="127"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Jahre</Label>
                  <Input
                    type="number"
                    value={form.socialProofYears || ""}
                    onChange={(e) => update("socialProofYears", e.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Live Social Proof Widget aktivieren</Label>
                  <Switch
                    checked={form.socialProofWidgetActive !== false}
                    onCheckedChange={(v) => update("socialProofWidgetActive", v)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Zeigt realistische Kundenaktivitäten aus Berlin & Brandenburg
                </p>
              </div>
            </TabsContent>

            {/* TAB 4 — INHALTE */}
            <TabsContent value="content" className="space-y-6 pt-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold">6 Schmerzpunkte</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={suggestPainPoints}
                    disabled={loading === "painPoints" || !form.keyword}
                    className="h-7 text-xs gap-1"
                  >
                    {loading === "painPoints" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Alle generieren
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-xs">Schmerzpunkt {i + 1}</Label>
                      <Textarea
                        value={painPoints[i] || ""}
                        onChange={(e) => updatePainPoint(i, e.target.value)}
                        rows={2}
                        placeholder="Waschmaschine defekt und der nächste Termin ist in 2 Wochen..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold">3 Personas — Für wen ist das?</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={suggestPersonas}
                    disabled={loading === "personas" || !form.keyword}
                    className="h-7 text-xs gap-1"
                  >
                    {loading === "personas" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Personas generieren
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-border bg-white p-3 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={personas[i]?.emoji || ""}
                          onChange={(e) => updatePersona(i, "emoji", e.target.value.slice(0, 2))}
                          placeholder="🔧"
                          className="w-14 text-center"
                          maxLength={2}
                        />
                        <Input
                          value={personas[i]?.title || ""}
                          onChange={(e) => updatePersona(i, "title", e.target.value)}
                          placeholder="Der Notfall-Kunde"
                          className="flex-1"
                        />
                      </div>
                      <Textarea
                        value={personas[i]?.description || ""}
                        onChange={(e) => updatePersona(i, "description", e.target.value)}
                        rows={2}
                        placeholder="Gerät ist ausgefallen, braucht sofort Hilfe..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 5 — ANGEBOT */}
            <TabsContent value="offer" className="space-y-6 pt-4">
              <div>
                <h4 className="text-sm font-bold mb-1">Bonus Stack (optional)</h4>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Was bekommt der Kunde zusätzlich gratis?
                </p>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="grid grid-cols-[1fr_120px] gap-2">
                      <Input
                        value={bonusStack[i]?.title || ""}
                        onChange={(e) => updateBonus(i, "title", e.target.value)}
                        placeholder={`Bonus ${i + 1} — z.B. Kostenlose Vor-Ort-Diagnose`}
                      />
                      <Input
                        value={bonusStack[i]?.value || ""}
                        onChange={(e) => updateBonus(i, "value", e.target.value)}
                        placeholder="49€"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-white p-3 space-y-3">
                <h4 className="text-sm font-bold">Lead Magnet (optional)</h4>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead Magnet Titel</Label>
                  <Input
                    value={form.leadMagnetTitle || ""}
                    onChange={(e) => update("leadMagnetTitle", e.target.value)}
                    placeholder="Gratis PDF: 10 Tipps bei Waschmaschinen-Defekt"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead Magnet Beschreibung</Label>
                  <Textarea
                    value={form.leadMagnetDescription || ""}
                    onChange={(e) => update("leadMagnetDescription", e.target.value)}
                    rows={2}
                    placeholder="Was bekommt der Nutzer konkret?"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
