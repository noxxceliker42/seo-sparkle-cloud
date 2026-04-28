import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Sparkles, ChevronRight } from "lucide-react";
import { FirmSelector } from "@/components/seo/FirmSelector";

export const Route = createFileRoute("/cluster/neu")({
  component: ClusterNeuPage,
  head: () => ({
    meta: [
      { title: "Neuer Cluster – SEO-OS v3.1" },
      { name: "description", content: "Cluster-Analyse erstellen mit KI und DataForSEO." },
    ],
  }),
});

interface Firm {
  id: string;
  name: string;
  city: string | null;
  street: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_area: string | null;
}

interface SuggestedPage {
  keyword: string;
  page_type: string;
  intent: string;
  priority: string;
  reason: string;
  content_angle: string;
  differentiator: string;
  internal_link_anchor: string;
  estimated_volume: number;
  estimated_difficulty: number;
  sort_order: number;
  selected: boolean;
  firm_id: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  supporting_info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  supporting_commercial: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  transactional_local: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  deep_page: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  pillar: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const TYPE_LABELS: Record<string, string> = {
  supporting_info: "Supporting Info",
  supporting_commercial: "Supporting Commercial",
  transactional_local: "Transactional/Local",
  deep_page: "Deep Page",
  pillar: "Pillar Page",
};

const PRIORITY_COLORS: Record<string, string> = {
  must_have: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  recommended: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  optional: "bg-muted text-muted-foreground",
};

function ClusterNeuPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [pillarKeyword, setPillarKeyword] = useState("");
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [clusterLogic, setClusterLogic] = useState("");
  const [pages, setPages] = useState<SuggestedPage[]>([]);
  const [saving, setSaving] = useState(false);
  const [firms, setFirms] = useState<Firm[]>([]);

  // Load firms for per-page selector
  useEffect(() => {
    supabase.from("firms").select("*").order("name").then(({ data }) => {
      if (data) setFirms(data);
    });
  }, []);

  const handleAnalyze = async () => {
    if (!pillarKeyword.trim()) return;
    setAnalyzing(true);
    setProgress(15);
    setProgressText("Schritt 1/3: Kie.AI analysiert Cluster-Architektur...");

    try {
      setProgress(30);
      const { data, error } = await supabase.functions.invoke("analyze-cluster", {
        body: { pillarKeyword: pillarKeyword.trim(), firmId: selectedFirm?.id },
      });

      setProgress(60);
      setProgressText("Schritt 2/3: DataForSEO lädt Suchvolumen...");

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Analyse fehlgeschlagen");
        setAnalyzing(false);
        return;
      }

      setProgress(90);
      setProgressText("Schritt 3/3: Ergebnisse werden aufbereitet...");

      setClusterName(data.cluster_name || pillarKeyword.trim());
      setClusterLogic(data.cluster_logic || "");

      const suggested = (data.suggested_pages || []).map((p: Omit<SuggestedPage, 'selected' | 'firm_id'>) => ({
        ...p,
        selected: p.priority !== "optional",
        firm_id: selectedFirm?.id || null,
      }));
      setPages(suggested);
      setProgress(100);

      setTimeout(() => {
        setStep(2);
        setAnalyzing(false);
      }, 500);
    } catch (err) {
      console.error(err);
      toast.error("Analyse fehlgeschlagen");
      setAnalyzing(false);
    }
  };

  const togglePage = (idx: number) => {
    setPages((prev) => prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p)));
  };

  const updatePageFirm = (idx: number, firmId: string) => {
    setPages((prev) => prev.map((p, i) => (i === idx ? { ...p, firm_id: firmId } : p)));
  };

  const grouped = useMemo(() => ({
    must_have: pages.filter((p) => p.priority === "must_have"),
    recommended: pages.filter((p) => p.priority === "recommended"),
    optional: pages.filter((p) => p.priority === "optional"),
  }), [pages]);

  const selectedCount = pages.filter((p) => p.selected).length;

  const handleCreateCluster = async () => {
    const selectedPages = pages.filter((p) => p.selected);
    if (selectedPages.length === 0) {
      toast.error("Wähle mindestens eine Seite aus");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet");
        setSaving(false);
        return;
      }

      // Create cluster
      const { data: cluster, error: clusterErr } = await supabase
        .from("clusters")
        .insert({
          name: clusterName,
          main_keyword: pillarKeyword.trim(),
          firm_id: selectedFirm?.id || null,
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      if (clusterErr || !cluster) {
        toast.error("Cluster konnte nicht angelegt werden");
        console.error(clusterErr);
        setSaving(false);
        return;
      }

      // Insert cluster pages
      const pagesToInsert = selectedPages.map((p) => ({
        cluster_id: cluster.id,
        keyword: p.keyword,
        url_slug: p.keyword.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, ""),
        page_type: p.page_type,
        ai_description: [p.reason, p.content_angle, p.differentiator].filter(Boolean).join(" | ") || null,
        search_volume: p.estimated_volume || null,
        keyword_difficulty: p.estimated_difficulty || null,
        priority: p.sort_order ?? 99,
        user_id: user.id,
        status: "suggested",
      }));

      const { error: pagesErr } = await supabase.from("cluster_pages").insert(pagesToInsert);
      if (pagesErr) {
        toast.error("Fehler beim Speichern der Unterseiten");
        console.error(pagesErr);
        setSaving(false);
        return;
      }

      toast.success(`Cluster "${clusterName}" mit ${selectedPages.length} Seiten angelegt`);
      navigate({ to: "/cluster/$id", params: { id: cluster.id } });
    } catch (err) {
      console.error(err);
      toast.error("Unerwarteter Fehler");
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cluster"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Neuen Cluster erstellen</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Pillar-Keyword</label>
              <Input
                value={pillarKeyword}
                onChange={(e) => setPillarKeyword(e.target.value)}
                placeholder="z.B. Waschmaschine reparieren"
                className="mt-1"
                disabled={analyzing}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Firma</label>
              <FirmSelector
                selectedFirmId={selectedFirm?.id || null}
                onFirmChange={setSelectedFirm}
              />
            </div>

            {analyzing ? (
              <div className="space-y-3 py-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">{progressText}</p>
              </div>
            ) : (
              <Button
                onClick={handleAnalyze}
                disabled={!pillarKeyword.trim()}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Cluster analysieren
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Page selection
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{clusterName}</h1>
          <p className="text-sm text-muted-foreground">Pillar: {pillarKeyword}</p>
        </div>
      </div>

      {clusterLogic && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{clusterLogic}</p>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      {(["must_have", "recommended", "optional"] as const).map((group) => {
        const groupPages = grouped[group];
        if (groupPages.length === 0) return null;
        const labels = { must_have: "Must Have", recommended: "Empfohlen", optional: "Optional" };
        const headerColors = { must_have: "text-red-600", recommended: "text-blue-600", optional: "text-muted-foreground" };

        return (
          <div key={group}>
            <h2 className={`text-lg font-semibold mb-3 ${headerColors[group]}`}>
              {labels[group]} ({groupPages.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupPages.map((page) => {
                const globalIdx = pages.indexOf(page);
                return (
                  <Card key={globalIdx} className={`transition-all ${page.selected ? "ring-2 ring-primary/50" : "opacity-60"}`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={page.selected}
                          onCheckedChange={() => togglePage(globalIdx)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{page.keyword}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge className={TYPE_COLORS[page.page_type] || "bg-muted"} variant="secondary">
                              {TYPE_LABELS[page.page_type] || page.page_type}
                            </Badge>
                            <Badge variant="outline">{page.intent}</Badge>
                            <Badge className={PRIORITY_COLORS[page.priority]} variant="secondary">
                              {page.priority.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Vol: {page.estimated_volume.toLocaleString()}</span>
                        <span>KD: {page.estimated_difficulty}</span>
                      </div>

                      {page.reason && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{page.reason}</p>
                      )}

                      {firms.length > 1 && (
                        <Select
                          value={page.firm_id || ""}
                          onValueChange={(val) => updatePageFirm(globalIdx, val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Firma wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {firms.map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Summary + Create */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4 -mx-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{selectedCount}</span> Seiten ausgewählt — Geschätzter Aufwand: {selectedCount} Generierungen
        </p>
        <Button onClick={handleCreateCluster} disabled={saving || selectedCount === 0} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          Cluster anlegen mit ausgewählten Seiten
        </Button>
      </div>
    </div>
  );
}
