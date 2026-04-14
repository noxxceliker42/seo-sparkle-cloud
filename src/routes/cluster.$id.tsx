import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Zap, Eye, RefreshCw, Loader2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/cluster/$id")({
  component: ClusterDetailPage,
  head: () => ({
    meta: [
      { title: "Cluster-Detail – SEO-OS v3.1" },
      { name: "description", content: "Cluster-Detail und Seitenmanagement." },
    ],
  }),
});

interface Cluster {
  id: string;
  name: string;
  pillar_keyword: string;
  firm_id: string | null;
  status: string;
}

interface ClusterPage {
  id: string;
  cluster_id: string;
  keyword: string;
  page_type: string;
  intent: string | null;
  priority: string;
  reason: string | null;
  content_angle: string | null;
  differentiator: string | null;
  internal_link_anchor: string | null;
  estimated_volume: number | null;
  estimated_difficulty: number | null;
  firm_id: string | null;
  seo_page_id: string | null;
  status: string;
  sort_order: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  suggested: { label: "Vorgeschlagen", color: "bg-muted text-muted-foreground" },
  approved: { label: "Bereit", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  rejected: { label: "Abgelehnt", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  generating: { label: "Generiert...", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 animate-pulse" },
  generated: { label: "Fertig", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  published: { label: "Veröffentlicht", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

const NODE_COLORS: Record<string, { stroke: string; fill: string }> = {
  suggested: { stroke: "#9ca3af", fill: "#e5e7eb" },
  approved: { stroke: "#3b82f6", fill: "#93c5fd" },
  rejected: { stroke: "#ef4444", fill: "#fca5a5" },
  generating: { stroke: "#f59e0b", fill: "#fcd34d" },
  generated: { stroke: "#22c55e", fill: "#86efac" },
  published: { stroke: "#8b5cf6", fill: "#c4b5fd" },
};

const TYPE_LABELS: Record<string, string> = {
  supporting_info: "Info",
  supporting_commercial: "Commercial",
  transactional_local: "Local",
  deep_page: "Deep",
  pillar: "Pillar",
};

function ClusterDetailPage() {
  const { id } = Route.useParams();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [clusterPages, setClusterPages] = useState<ClusterPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPage, setPreviewPage] = useState<ClusterPage | null>(null);
  const [generateConfirm, setGenerateConfirm] = useState<ClusterPage | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generatingRef = useRef<{ jobId: string; pageId: string } | null>(null);

  const CLUSTER_GEN_KEY = "seo_os_cluster_gen";

  const stopClusterPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const loadData = useCallback(async () => {
    const [clusterRes, pagesRes] = await Promise.all([
      supabase.from("clusters").select("*").eq("id", id).single(),
      supabase.from("cluster_pages").select("*").eq("cluster_id", id).order("sort_order"),
    ]);
    if (clusterRes.data) setCluster(clusterRes.data as Cluster);
    setClusterPages((pagesRes.data as ClusterPage[]) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (pageId: string, status: string) => {
    await supabase.from("cluster_pages").update({ status }).eq("id", pageId);
    setClusterPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, status } : p)));
    if (previewPage?.id === pageId) setPreviewPage((prev) => prev ? { ...prev, status } : null);
  };

  const startClusterPolling = useCallback((jobId: string, pageId: string, pageKeyword: string) => {
    if (pollingRef.current) return;
    generatingRef.current = { jobId, pageId };
    try { sessionStorage.setItem(CLUSTER_GEN_KEY, JSON.stringify({ jobId, pageId })); } catch {}

    pollingRef.current = setInterval(async () => {
      try {
        const { data: job } = await supabase
          .from("generation_jobs")
          .select("status, page_id, error_message")
          .eq("id", jobId)
          .single();

        if (!job) return;

        if (job.status === "completed") {
          stopClusterPolling();
          try { sessionStorage.removeItem(CLUSTER_GEN_KEY); } catch {}
          generatingRef.current = null;
          if (job.page_id) {
            setClusterPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, status: "generated", seo_page_id: job.page_id } : p)));
          }
          toast.success(`Seite "${pageKeyword}" wurde generiert`);
          setGenerating(null);
        }

        if (job.status === "error") {
          stopClusterPolling();
          try { sessionStorage.removeItem(CLUSTER_GEN_KEY); } catch {}
          generatingRef.current = null;
          toast.error(job.error_message || "Generierung fehlgeschlagen");
          await updateStatus(pageId, "approved");
          setGenerating(null);
        }
      } catch (pollErr) {
        console.error("Poll error:", pollErr);
      }
    }, 5000);
  }, [stopClusterPolling, updateStatus]);

  // Restore generation state on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CLUSTER_GEN_KEY);
      if (!raw) return;
      const { jobId, pageId } = JSON.parse(raw);
      if (!jobId || !pageId) return;
      setGenerating(pageId);
      const page = clusterPages.find((p) => p.id === pageId);
      startClusterPolling(jobId, pageId, page?.keyword || "");
    } catch {}
    return () => stopClusterPolling();
  }, [clusterPages.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume polling on tab visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      const cur = generatingRef.current;
      if (cur && !pollingRef.current) {
        const page = clusterPages.find((p) => p.id === cur.pageId);
        startClusterPolling(cur.jobId, cur.pageId, page?.keyword || "");
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [startClusterPolling, clusterPages]);

  const handleGenerate = async (page: ClusterPage) => {
    setGenerateConfirm(null);
    setGenerating(page.id);
    await updateStatus(page.id, "generating");

    try {
      // Get firm data
      let firmData: Record<string, unknown> = {};
      if (page.firm_id) {
        const { data } = await supabase.from("firms").select("*").eq("id", page.firm_id).single();
        if (data) firmData = data;
      }

      // Get sibling pages for internal linking
      const siblings = clusterPages
        .filter((p) => p.id !== page.id && p.status === "generated" && p.seo_page_id)
        .map((p) => ({ keyword: p.keyword, anchor: p.internal_link_anchor }));

      // Get user for userId
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setGenerating(null); return; }

      const { data, error } = await supabase.functions.invoke("generate-page", {
        body: {
          keyword: page.keyword,
          firm: (firmData as { name?: string })?.name || "",
          city: (firmData as { city?: string })?.city || "",
          phone: (firmData as { phone?: string })?.phone || "",
          email: (firmData as { email?: string })?.email || "",
          website: (firmData as { website?: string })?.website || "",
          street: (firmData as { street?: string })?.street || "",
          zip: (firmData as { zip?: string })?.zip || "",
          serviceArea: (firmData as { service_area?: string })?.service_area || "",
          activeSections: ["01", "02", "03", "04", "05", "09", "10", "13", "14", "15"],
          designPreset: "trust",
          primaryColor: "#1d4ed8",
          uniqueData: "",
          infoGain: "",
          pillarKeyword: cluster?.pillar_keyword || "",
          clusterSiblings: siblings,
          userId: user.id,
          clusterPageId: page.id,
        },
      });

      if (error || !data?.jobId) {
        toast.error(data?.error || error?.message || "Generierung konnte nicht gestartet werden");
        await updateStatus(page.id, "approved");
        setGenerating(null);
        return;
      }

      toast.info("Generierung gestartet — dauert 2–4 Minuten. Tab-Wechsel ist sicher.");
      startClusterPolling(data.jobId, page.id, page.keyword);
    } catch (err) {
      console.error(err);
      toast.error("Generierung fehlgeschlagen");
      await updateStatus(page.id, "approved");
      setGenerating(null);
    }
  };

  const stats = useMemo(() => {
    const total = clusterPages.filter((p) => p.status !== "rejected").length;
    const done = clusterPages.filter((p) => p.status === "generated" || p.status === "published").length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [clusterPages]);

  // SVG cluster map
  const nodes = useMemo(() => {
    const cx = 400, cy = 250;
    const active = clusterPages.filter((p) => p.status !== "rejected");
    return active.map((p, i) => {
      const angle = (2 * Math.PI * i) / Math.max(active.length, 1);
      const radius = 140;
      return {
        ...p,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
  }, [clusterPages]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Lade Cluster…</div>;
  if (!cluster) return <div className="text-center py-12"><p>Cluster nicht gefunden.</p><Button asChild><Link to="/cluster">Zurück</Link></Button></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cluster"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{cluster.name}</h1>
          <p className="text-sm text-muted-foreground">Pillar: {cluster.pillar_keyword}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{stats.done} / {stats.total} Seiten generiert</p>
          <Progress value={stats.pct} className="h-2 w-32 mt-1" />
        </div>
      </div>

      {/* SVG Cluster Map */}
      <TooltipProvider>
        <Card>
          <CardContent className="pt-4">
            <svg viewBox="0 0 800 500" className="w-full h-[300px]">
              {/* Pillar center */}
              <circle cx={400} cy={250} r={24} fill="#fca5a5" stroke="#ef4444" strokeWidth={3} />
              <text x={400} y={254} textAnchor="middle" className="fill-foreground text-[9px] font-semibold">
                {cluster.pillar_keyword.length > 16 ? cluster.pillar_keyword.slice(0, 14) + "…" : cluster.pillar_keyword}
              </text>
              {/* Connections + Nodes */}
              {nodes.map((node) => {
                const nc = NODE_COLORS[node.status] || NODE_COLORS.suggested;
                return (
                  <g key={node.id}>
                    <line x1={400} y1={250} x2={node.x} y2={node.y} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1.5} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <circle
                          cx={node.x} cy={node.y} r={16}
                          fill={nc.fill} stroke={nc.stroke} strokeWidth={2}
                          className="cursor-pointer" onClick={() => setPreviewPage(node)}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{node.keyword}</p>
                        <p className="text-xs">{STATUS_CONFIG[node.status]?.label}</p>
                      </TooltipContent>
                    </Tooltip>
                    <text x={node.x} y={node.y + 26} textAnchor="middle" className="fill-foreground text-[8px]">
                      {node.keyword.length > 14 ? node.keyword.slice(0, 12) + "…" : node.keyword}
                    </text>
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>
      </TooltipProvider>

      {/* Page table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Priorität</TableHead>
              <TableHead>Vol.</TableHead>
              <TableHead>KD</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clusterPages.map((page) => (
              <TableRow key={page.id} className={page.status === "rejected" ? "opacity-40 line-through" : ""}>
                <TableCell className="font-medium">{page.keyword}</TableCell>
                <TableCell><Badge variant="outline">{TYPE_LABELS[page.page_type] || page.page_type}</Badge></TableCell>
                <TableCell><Badge variant="outline">{page.priority.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-sm">{(page.estimated_volume || 0).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{page.estimated_difficulty || 0}</TableCell>
                <TableCell>
                  <Badge className={STATUS_CONFIG[page.status]?.color || ""}>
                    {STATUS_CONFIG[page.status]?.label || page.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    {page.status === "suggested" && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPreviewPage(page)}>
                          <Eye className="h-3 w-3" /> Prüfen
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => updateStatus(page.id, "rejected")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {page.status === "approved" && (
                      <>
                        <Button
                          size="sm" className="gap-1 text-xs"
                          disabled={generating === page.id}
                          onClick={() => setGenerateConfirm(page)}
                        >
                          {generating === page.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          Generieren
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => updateStatus(page.id, "suggested")}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {page.status === "generated" && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(page.id, "published")}>
                        <Check className="h-3 w-3 mr-1" /> Veröffentlichen
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Preview Sheet */}
      <Sheet open={!!previewPage} onOpenChange={(open) => !open && setPreviewPage(null)}>
        <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
          {previewPage && (
            <>
              <SheetHeader>
                <SheetTitle>{previewPage.keyword}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{previewPage.intent || "–"}</Badge>
                  <Badge variant="outline">{TYPE_LABELS[previewPage.page_type] || previewPage.page_type}</Badge>
                  <Badge variant="outline">{previewPage.priority.replace("_", " ")}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Suchvolumen:</span> {(previewPage.estimated_volume || 0).toLocaleString()}</div>
                  <div><span className="text-muted-foreground">KD:</span> {previewPage.estimated_difficulty || 0}</div>
                </div>
                {previewPage.reason && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Warum wichtig</p>
                    <p className="text-sm">{previewPage.reason}</p>
                  </div>
                )}
                {previewPage.content_angle && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Content Angle</p>
                    <p className="text-sm">{previewPage.content_angle}</p>
                  </div>
                )}
                {previewPage.differentiator && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Differentiator</p>
                    <p className="text-sm">{previewPage.differentiator}</p>
                  </div>
                )}
                {previewPage.internal_link_anchor && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Interner Link Anchor</p>
                    <p className="text-sm font-mono">{previewPage.internal_link_anchor}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-border">
                  {previewPage.status === "suggested" && (
                    <>
                      <Button className="flex-1 gap-1" onClick={() => { updateStatus(previewPage.id, "approved"); toast.success(`"${previewPage.keyword}" freigegeben`); }}>
                        <Check className="h-4 w-4" /> Freigeben
                      </Button>
                      <Button variant="destructive" className="gap-1" onClick={() => { updateStatus(previewPage.id, "rejected"); setPreviewPage(null); }}>
                        <X className="h-4 w-4" /> Ablehnen
                      </Button>
                    </>
                  )}
                  {previewPage.status === "approved" && (
                    <Button className="flex-1 gap-1" onClick={() => { setPreviewPage(null); setGenerateConfirm(previewPage); }}>
                      <Zap className="h-4 w-4" /> Jetzt generieren
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Generate Confirmation Dialog */}
      <Dialog open={!!generateConfirm} onOpenChange={(open) => !open && setGenerateConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seite generieren?</DialogTitle>
          </DialogHeader>
          {generateConfirm && (
            <p className="text-sm text-muted-foreground">
              Seite "<span className="font-medium text-foreground">{generateConfirm.keyword}</span>" generieren?
              Dies nutzt 1 Kie.AI-Generierung.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateConfirm(null)}>Abbrechen</Button>
            <Button onClick={() => generateConfirm && handleGenerate(generateConfirm)}>Generieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
