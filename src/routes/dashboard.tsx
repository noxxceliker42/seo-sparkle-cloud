import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle2, Clock, BarChart3, Search, Trash2, ExternalLink, Pencil, Download, ArrowUpDown, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard – SEO-OS v3.1" },
      { name: "description", content: "Übersicht aller generierten SEO-Seiten." },
    ],
  }),
});

interface SeoPage {
  id: string;
  keyword: string;
  firm: string | null;
  intent: string | null;
  page_type: string | null;
  score: number | null;
  status: string | null;
  created_at: string | null;
  html_output: string | null;
  json_ld: string | null;
  meta_title: string | null;
  meta_desc: string | null;
  design_preset: string | null;
  city: string | null;
  active_sections: unknown;
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

function DashboardPage() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailPage, setDetailPage] = useState<SeoPage | null>(null);
  const [clusterCount, setClusterCount] = useState(0);

  useEffect(() => {
    loadPages();
    supabase.from("clusters").select("id", { count: "exact", head: true }).then(({ count }) => {
      setClusterCount(count || 0);
    });
  }, []);

  const loadPages = async () => {
    setLoading(true);
    const { data } = await supabase.from("seo_pages").select("*").order("created_at", { ascending: false });
    setPages((data as SeoPage[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Seite wirklich löschen?")) return;
    await supabase.from("seo_pages").delete().eq("id", id);
    setPages((p) => p.filter((x) => x.id !== id));
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from("seo_pages").update({ status: newStatus }).eq("id", id);
    setPages((p) => p.map((x) => (x.id === id ? { ...x, status: newStatus } : x)));
  };

  const exportHtml = async (page: SeoPage) => {
    // Always fetch fresh from DB to ensure we have html_output
    const { data: freshPage } = await supabase
      .from("seo_pages")
      .select("html_output, keyword")
      .eq("id", page.id)
      .single();

    const html = freshPage?.html_output || page.html_output;
    if (!html) {
      alert("HTML nicht gefunden in Datenbank");
      return;
    }

    const slug = (freshPage?.keyword || page.keyword || "seite")
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    let result = pages;
    if (searchQuery) result = result.filter((p) => p.keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    if (intentFilter !== "all") result = result.filter((p) => p.intent === intentFilter);
    result = [...result].sort((a, b) => {
      const sa = a.score || 0, sb = b.score || 0;
      return sortDir === "asc" ? sa - sb : sb - sa;
    });
    return result;
  }, [pages, searchQuery, statusFilter, intentFilter, sortDir]);

  const stats = useMemo(() => ({
    total: pages.length,
    approved: pages.filter((p) => p.status === "approved" || p.status === "published").length,
    inProgress: pages.filter((p) => p.status === "draft" || p.status === "reviewed").length,
    avgScore: pages.length ? Math.round(pages.reduce((s, p) => s + (p.score || 0), 0) / pages.length) : 0,
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Keyword suchen…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="reviewed">Geprüft</SelectItem>
            <SelectItem value="approved">Freigegeben</SelectItem>
            <SelectItem value="published">Veröffentlicht</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((page) => (
                <TableRow key={page.id} className="cursor-pointer" onClick={() => setDetailPage(page)}>
                  <TableCell className="font-medium">{page.keyword}</TableCell>
                  <TableCell>{page.firm || "–"}</TableCell>
                  <TableCell><Badge variant="outline">{page.intent || "–"}</Badge></TableCell>
                  <TableCell className="text-sm">{page.page_type || "–"}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${(page.score || 0) >= 85 ? "text-green-600" : (page.score || 0) >= 60 ? "text-amber-600" : "text-destructive"}`}>
                      {page.score || 0}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[page.status || "draft"]}>
                      {STATUS_LABELS[page.status || "draft"]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {page.created_at ? new Date(page.created_at).toLocaleDateString("de-DE") : "–"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setDetailPage(page)} title="Öffnen">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => exportHtml(page)} title="HTML exportieren">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id)} title="Löschen">
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
      <Dialog open={!!detailPage} onOpenChange={(open) => !open && setDetailPage(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {detailPage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{detailPage.keyword}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Meta */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Intent</p>
                    <p className="font-medium">{detailPage.intent || "–"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Seitentyp</p>
                    <p className="font-medium">{detailPage.page_type || "–"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Score</p>
                    <p className="font-bold text-lg">{detailPage.score || 0}%</p>
                  </div>
                </div>

                {/* Status change */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-2">Status ändern</p>
                  <div className="flex gap-2">
                    {["draft", "reviewed", "approved", "published"].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={detailPage.status === s ? "default" : "outline"}
                        onClick={() => { handleStatusChange(detailPage.id, s); setDetailPage({ ...detailPage, status: s }); }}
                      >
                        {STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Meta Title/Desc */}
                {detailPage.meta_title && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Meta Title</p>
                    <p className="font-medium">{detailPage.meta_title}</p>
                  </div>
                )}
                {detailPage.meta_desc && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Meta Description</p>
                    <p className="text-sm">{detailPage.meta_desc}</p>
                  </div>
                )}

                {/* HTML Preview */}
                {detailPage.html_output && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-2">HTML-Vorschau</p>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={detailPage.html_output}
                        className="w-full h-[400px]"
                        sandbox="allow-same-origin"
                        title="Preview"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => exportHtml(detailPage)}>
                      <Download className="h-4 w-4 mr-1" /> HTML exportieren
                    </Button>
                  </div>
                )}

                {/* JSON-LD */}
                {detailPage.json_ld && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-2">JSON-LD</p>
                    <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-[200px]">{detailPage.json_ld}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
