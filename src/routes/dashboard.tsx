import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle2, Clock, BarChart3, Search, Trash2, ExternalLink, Download, ArrowUpDown, Layers, X, Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cancelCurrentJob } from "@/hooks/useGenerationJob";
import PageDetailPanel, { type SeoPage } from "@/components/dashboard/PageDetailPanel";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard – SEO-OS v3.1" },
      { name: "description", content: "Übersicht aller generierten SEO-Seiten." },
    ],
  }),
});

interface ClusterInfo {
  cluster_id: string;
  cluster_name: string;
  pillar_tier: number | null;
}

interface ClusterOption {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  published: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  reviewed: "Geprüft",
  approved: "Freigegeben",
  published: "Veröffentlicht",
};

function calculateQAScore(page: SeoPage): number {
  let score = 0;
  const html = page.html_output || "";
  if (html && html.includes("</html>")) score += 25;
  if (page.meta_title && page.meta_title.length > 10) score += 20;
  if (page.meta_desc && page.meta_desc.length > 50) score += 15;
  if (page.json_ld) score += 20;
  if (/faq/i.test(html)) score += 10;
  if (/auto(r|hor)/i.test(html)) score += 10;
  return Math.min(score, 100);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} · ${hh}:${min}`;
}

function scoreColor(s: number): string {
  if (s >= 71) return "text-green-600";
  if (s >= 41) return "text-amber-600";
  return "text-destructive";
}

const TIER_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: "Pillar", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  2: { label: "Tier 2", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  3: { label: "Tier 3", className: "bg-muted text-muted-foreground" },
};

function DashboardPage() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailPage, setDetailPage] = useState<SeoPage | null>(null);
  const [clusterCount, setClusterCount] = useState(0);
  const [clusters, setClusters] = useState<ClusterOption[]>([]);
  const [runningJobs, setRunningJobs] = useState<Record<string, string>>({}); // page_id → job_id
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
    loadClusters();
    loadRunningJobs();
    const interval = setInterval(loadRunningJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRunningJobs = async () => {
    const { data } = await supabase
      .from("generation_jobs")
      .select("id, page_id")
      .eq("status", "running");
    if (!data) return;
    const map: Record<string, string> = {};
    data.forEach((j) => {
      if (j.page_id) map[j.page_id] = j.id;
    });
    setRunningJobs(map);
  };

  const handleCancelJob = async (jobId: string, pageId: string, keyword: string) => {
    setCancellingId(jobId);
    try {
      await cancelCurrentJob("Vom Nutzer abgebrochen");
      await supabase
        .from("generation_jobs")
        .update({ status: "error", error_message: "Vom Nutzer abgebrochen" })
        .eq("id", jobId);
      setRunningJobs((prev) => {
        const next = { ...prev };
        delete next[pageId];
        return next;
      });
      toast.success("Abgebrochen", {
        description: `Generierung für „${keyword}" gestoppt`,
      });
    } finally {
      setCancellingId(null);
    }
  };

  const loadClusters = async () => {
    const { data } = await supabase.from("clusters").select("id, name").order("name");
    if (data) {
      setClusters(data);
      setClusterCount(data.length);
    }
  };

  const loadPages = async () => {
    setLoading(true);
    const { data: rawPages } = await supabase
      .from("seo_pages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!rawPages || rawPages.length === 0) {
      setPages([]);
      setLoading(false);
      return;
    }

    const firmIds = [...new Set(rawPages.filter((p) => p.firm_id).map((p) => p.firm_id!))];
    let firmMap = new Map<string, string>();
    if (firmIds.length > 0) {
      const { data: firms } = await supabase.from("firms").select("id, name").in("id", firmIds);
      if (firms) firms.forEach((f) => firmMap.set(f.id, f.name));
    }

    const pageIds = rawPages.map((p) => p.id);
    let clusterMap = new Map<string, ClusterInfo>();
    if (pageIds.length > 0) {
      const { data: cpData } = await supabase
        .from("cluster_pages")
        .select("seo_page_id, cluster_id, pillar_tier")
        .in("seo_page_id", pageIds);

      if (cpData && cpData.length > 0) {
        const clusterIds = [...new Set(cpData.map((cp) => cp.cluster_id).filter(Boolean) as string[])];
        let clusterNames = new Map<string, string>();
        if (clusterIds.length > 0) {
          const { data: cData } = await supabase.from("clusters").select("id, name").in("id", clusterIds);
          if (cData) cData.forEach((c) => clusterNames.set(c.id, c.name));
        }
        cpData.forEach((cp) => {
          if (cp.seo_page_id && cp.cluster_id) {
            clusterMap.set(cp.seo_page_id, {
              cluster_id: cp.cluster_id,
              cluster_name: clusterNames.get(cp.cluster_id) || "–",
              pillar_tier: cp.pillar_tier,
            });
          }
        });
      }
    }

    const enriched: SeoPage[] = rawPages.map((p) => {
      const qaScore = calculateQAScore(p as unknown as SeoPage);
      if (qaScore !== (p.qa_score || 0)) {
        supabase.from("seo_pages").update({ qa_score: qaScore }).eq("id", p.id).then(() => {});
      }
      return {
        ...p,
        firm_name: p.firm_id ? firmMap.get(p.firm_id) || p.firm : p.firm,
        cluster_info: clusterMap.get(p.id) || null,
        qa_score: qaScore,
      } as SeoPage;
    });

    setPages(enriched);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Seite wirklich löschen?")) return;
    await supabase.from("seo_pages").delete().eq("id", id);
    setPages((p) => p.filter((x) => x.id !== id));
  };

  const exportHtml = async (page: SeoPage) => {
    const { data: freshPage } = await supabase
      .from("seo_pages")
      .select("html_output, keyword")
      .eq("id", page.id)
      .single();

    const html = freshPage?.html_output || page.html_output;
    if (!html) { alert("HTML nicht gefunden"); return; }

    const slug = (freshPage?.keyword || page.keyword || "seite")
      .toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
      .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${slug}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePageUpdate = (updated: SeoPage) => {
    setPages((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setDetailPage(updated);
  };

  const filtered = useMemo(() => {
    let result = pages;
    if (searchQuery) result = result.filter((p) => p.keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    if (intentFilter !== "all") result = result.filter((p) => p.intent === intentFilter);
    if (clusterFilter !== "all") result = result.filter((p) => p.cluster_info?.cluster_id === clusterFilter);
    result = [...result].sort((a, b) => {
      const sa = a.qa_score || 0, sb = b.qa_score || 0;
      return sortDir === "asc" ? sa - sb : sb - sa;
    });
    return result;
  }, [pages, searchQuery, statusFilter, intentFilter, clusterFilter, sortDir]);

  const stats = useMemo(() => ({
    total: pages.length,
    approved: pages.filter((p) => p.status === "approved" || p.status === "published").length,
    inProgress: pages.filter((p) => p.status === "draft" || p.status === "reviewed").length,
    avgScore: pages.length ? Math.round(pages.reduce((s, p) => s + (p.qa_score || 0), 0) / pages.length) : 0,
  }), [pages]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Gesamt Seiten", value: stats.total, icon: FileText, color: "text-foreground" },
          { label: "Freigegeben", value: stats.approved, icon: CheckCircle2, color: "text-green-600" },
          { label: "In Bearbeitung", value: stats.inProgress, icon: Clock, color: "text-amber-600" },
          { label: "Ø QA-Score", value: `${stats.avgScore}%`, icon: BarChart3, color: "text-primary" },
          { label: "Aktive Cluster", value: clusterCount, icon: Layers, color: "text-purple-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {[
          { id: "all", label: "Alle" },
          { id: "draft", label: "Geplant" },
          { id: "reviewed", label: "Generiert" },
          { id: "published", label: "Veröffentlicht" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Keyword suchen…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Intent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Intents</SelectItem>
            <SelectItem value="Informational">Informational</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
            <SelectItem value="Transactional">Transactional</SelectItem>
            <SelectItem value="Local">Local</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Cluster" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Cluster</SelectItem>
            {clusters.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")} className="gap-1">
          <ArrowUpDown className="h-4 w-4" /> Score {sortDir === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Seiten…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">Keine Seiten gefunden.</p>
          <Button asChild><Link to="/">Neue Seite erstellen</Link></Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>QA-Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((page) => (
                <TableRow key={page.id} className="cursor-pointer" onClick={() => setDetailPage(page)}>
                  <TableCell className="font-medium">{page.keyword}</TableCell>
                  <TableCell>{page.firm_name || page.firm || "–"}</TableCell>
                  <TableCell><Badge variant="outline">{page.intent || "–"}</Badge></TableCell>
                  <TableCell className="text-sm">{page.page_type || "–"}</TableCell>
                  <TableCell>
                    {page.cluster_info ? (
                      <div className="flex items-center gap-1.5">
                        <Link to="/cluster/$id" params={{ id: page.cluster_info.cluster_id }} className="text-sm text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          {page.cluster_info.cluster_name}
                        </Link>
                        {page.cluster_info.pillar_tier && TIER_CONFIG[page.cluster_info.pillar_tier] && (
                          <Badge className={`text-[10px] px-1 py-0 ${TIER_CONFIG[page.cluster_info.pillar_tier].className}`}>
                            {TIER_CONFIG[page.cluster_info.pillar_tier].label}
                          </Badge>
                        )}
                      </div>
                    ) : "–"}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${scoreColor(page.qa_score || 0)}`}>{page.qa_score || 0}%</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[page.status || "draft"]}>{STATUS_LABELS[page.status || "draft"]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(page.created_at)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      {runningJobs[page.id] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Generierung abbrechen"
                          disabled={cancellingId === runningJobs[page.id]}
                          onClick={() => handleCancelJob(runningJobs[page.id], page.id, page.keyword)}
                        >
                          {cancellingId === runningJobs[page.id]
                            ? <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            : <X className="h-4 w-4 text-red-500" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDetailPage(page)} title="Öffnen"><ExternalLink className="h-4 w-4" /></Button>
                      {page.html_output && (
                        <Button asChild variant="outline" size="sm" title="Seite bearbeiten">
                          <Link to="/editor/$pageId" params={{ pageId: page.id }}>
                            <Pencil className="h-4 w-4" /> Bearbeiten
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => exportHtml(page)} title="HTML exportieren"><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id)} title="Löschen"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailPage} onOpenChange={(open) => !open && setDetailPage(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {detailPage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{detailPage.keyword}</DialogTitle>
              </DialogHeader>
              <PageDetailPanel page={detailPage} onUpdate={handlePageUpdate} onClose={() => setDetailPage(null)} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}