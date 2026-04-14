import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  Trash2,
  ExternalLink,
  Copy,
  BookmarkPlus,
  ArrowUpDown,
  BarChart3,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalysis } from "@/context/AnalysisContext";
import { useFormContext } from "@/context/FormContext";
import { useOutputContext } from "@/context/OutputContext";
import { useQaContext } from "@/context/QaContext";

export const Route = createFileRoute("/analysen")({
  component: AnalysenPage,
  head: () => ({
    meta: [
      { title: "Analysen – SEO-OS v3.1" },
      { name: "description", content: "Gespeicherte SEO-Analysen anzeigen und verwalten." },
    ],
  }),
});

interface SavedAnalysis {
  id: string;
  keyword: string;
  mode: string;
  analysis_status: string;
  result_kieai: unknown;
  result_serp: unknown;
  result_volume: unknown;
  form_data: Record<string, unknown> | null;
  qa_state: Record<string, unknown> | null;
  generated_html: string | null;
  json_ld: string | null;
  meta_title: string | null;
  meta_desc: string | null;
  page_id: string | null;
  name: string | null;
  tags: string[] | null;
  is_template: boolean;
  user_id: string;
  firm_id: string | null;
  created_at: string;
  updated_at: string;
}

function AnalysenPage() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "own" | "team">("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [detailAnalysis, setDetailAnalysis] = useState<SavedAnalysis | null>(null);

  const { update: updateAnalysis, clearAnalysis, savedAnalysisId } = useAnalysis();
  const { setFormData } = useFormContext();
  const { setOutput } = useOutputContext();
  const { setQaState } = useQaContext();

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("saved_analyses")
      .select("*")
      .order("created_at", { ascending: false });
    setAnalyses((data as unknown as SavedAnalysis[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAnalyses();
  }, [loadAnalyses]);

  const templates = useMemo(() => analyses.filter((a) => a.is_template), [analyses]);
  const regular = useMemo(() => analyses.filter((a) => !a.is_template), [analyses]);

  const filtered = useMemo(() => {
    let result = regular;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.keyword.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortDir === "desc" ? db - da : da - db;
    });
    return result;
  }, [regular, searchQuery, sortDir]);

  const loadAnalysis = useCallback(
    async (analysisId: string) => {
      const { data: analysis } = await supabase
        .from("saved_analyses")
        .select("*")
        .eq("id", analysisId)
        .maybeSingle();

      if (!analysis) return;
      const a = analysis as unknown as SavedAnalysis;

      updateAnalysis({
        keyword: a.keyword,
        mode: a.mode,
        isRunning: false,
        error: "",
        jobId: "",
        result: {
          kieai: a.result_kieai,
          serp: a.result_serp,
          volume: a.result_volume,
        },
        savedAnalysisId: a.id,
      });

      if (a.form_data) {
        setFormData(a.form_data);
      }

      if (a.generated_html) {
        setOutput({
          html: a.generated_html,
          jsonLd: a.json_ld || "",
          metaTitle: a.meta_title || "",
          metaDesc: a.meta_desc || "",
          pageId: a.page_id || "",
        });
      }

      if (a.qa_state) {
        setQaState(a.qa_state);
      }

      navigate({ to: "/" });
    },
    [updateAnalysis, setFormData, setOutput, setQaState, navigate],
  );

  const duplicateAnalysis = useCallback(
    async (analysis: SavedAnalysis) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("saved_analyses").insert({
        user_id: user.id,
        firm_id: analysis.firm_id,
        keyword: analysis.keyword,
        mode: analysis.mode,
        result_kieai: analysis.result_kieai as import("@/integrations/supabase/types").Json,
        result_serp: analysis.result_serp as import("@/integrations/supabase/types").Json,
        result_volume: analysis.result_volume as import("@/integrations/supabase/types").Json,
        form_data: analysis.form_data as import("@/integrations/supabase/types").Json,
        qa_state: analysis.qa_state as import("@/integrations/supabase/types").Json,
        analysis_status: "completed",
        name: analysis.name ? `${analysis.name} (Kopie)` : null,
      });

      void loadAnalyses();
    },
    [loadAnalyses],
  );

  const toggleTemplate = useCallback(
    async (id: string, current: boolean) => {
      await supabase.from("saved_analyses").update({ is_template: !current }).eq("id", id);
      setAnalyses((prev) => prev.map((a) => (a.id === id ? { ...a, is_template: !current } : a)));
    },
    [],
  );

  const deleteAnalysis = useCallback(
    async (id: string) => {
      if (!confirm("Analyse löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
      await supabase.from("saved_analyses").delete().eq("id", id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      if (savedAnalysisId === id) {
        clearAnalysis();
      }
      if (detailAnalysis?.id === id) {
        setDetailAnalysis(null);
      }
    },
    [savedAnalysisId, clearAnalysis, detailAnalysis],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gespeicherte Analysen</h1>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vorlagen</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => void loadAnalysis(t.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{t.keyword}</CardTitle>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px]">Vorlage</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{t.name || t.mode} • {new Date(t.created_at).toLocaleDateString("de-DE")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Keyword suchen…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))} className="gap-1">
          <ArrowUpDown className="h-4 w-4" /> {sortDir === "desc" ? "Neueste" : "Älteste"}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Analysen…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">Keine Analysen gefunden.</p>
          <p className="text-sm text-muted-foreground">Starte eine neue Analyse unter „Neue Seite".</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Modus</TableHead>
                <TableHead>HTML</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetailAnalysis(a)}>
                  <TableCell className="font-medium">{a.keyword}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{a.mode}</Badge>
                  </TableCell>
                  <TableCell>
                    {a.generated_html ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-muted-foreground text-xs">–</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={a.analysis_status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-muted text-muted-foreground"}>
                      {a.analysis_status === "completed" ? "Fertig" : a.analysis_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => void loadAnalysis(a.id)} title="Öffnen">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void duplicateAnalysis(a)} title="Duplizieren">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void toggleTemplate(a.id, a.is_template)} title={a.is_template ? "Vorlage entfernen" : "Als Vorlage"}>
                        <BookmarkPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void deleteAnalysis(a.id)} title="Löschen">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailAnalysis} onOpenChange={(open) => !open && setDetailAnalysis(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {detailAnalysis && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{detailAnalysis.keyword}</DialogTitle>
              </DialogHeader>

              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => { void loadAnalysis(detailAnalysis.id); setDetailAnalysis(null); }}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Öffnen & bearbeiten
                </Button>
                <Button variant="outline" size="sm" onClick={() => void duplicateAnalysis(detailAnalysis)}>
                  <Copy className="h-4 w-4 mr-1" /> Duplizieren
                </Button>
              </div>

              <Tabs defaultValue="ki" className="mt-4">
                <TabsList>
                  <TabsTrigger value="ki">KI-Ergebnisse</TabsTrigger>
                  <TabsTrigger value="form">Formular</TabsTrigger>
                  {detailAnalysis.generated_html && <TabsTrigger value="html">HTML</TabsTrigger>}
                  {detailAnalysis.qa_state && <TabsTrigger value="qa">QA</TabsTrigger>}
                </TabsList>

                <TabsContent value="ki" className="space-y-4">
                  {detailAnalysis.result_kieai ? (
                    <pre className="rounded-lg bg-muted p-4 text-xs overflow-auto max-h-[400px]">
                      {JSON.stringify(detailAnalysis.result_kieai, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-sm">Keine KI-Ergebnisse vorhanden.</p>
                  )}
                </TabsContent>

                <TabsContent value="form" className="space-y-4">
                  {detailAnalysis.form_data ? (
                    <pre className="rounded-lg bg-muted p-4 text-xs overflow-auto max-h-[400px]">
                      {JSON.stringify(detailAnalysis.form_data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-sm">Keine Formulardaten gespeichert.</p>
                  )}
                </TabsContent>

                {detailAnalysis.generated_html && (
                  <TabsContent value="html" className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {detailAnalysis.meta_title && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Meta Title</p>
                          <p className="font-medium text-sm">{detailAnalysis.meta_title}</p>
                        </div>
                      )}
                      {detailAnalysis.meta_desc && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Meta Description</p>
                          <p className="text-sm">{detailAnalysis.meta_desc}</p>
                        </div>
                      )}
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={detailAnalysis.generated_html}
                        className="w-full h-[400px]"
                        sandbox="allow-same-origin"
                        title="HTML-Vorschau"
                      />
                    </div>
                  </TabsContent>
                )}

                {detailAnalysis.qa_state && (
                  <TabsContent value="qa" className="space-y-4">
                    <pre className="rounded-lg bg-muted p-4 text-xs overflow-auto max-h-[400px]">
                      {JSON.stringify(detailAnalysis.qa_state, null, 2)}
                    </pre>
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
