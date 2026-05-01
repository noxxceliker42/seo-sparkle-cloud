import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Zap, Eye, Rocket, AlertCircle, RotateCcw, LinkIcon, Check, X, Network } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateScore, scoreColor, scoreTextColor } from "@/lib/clusterScore";
import { GeneratePageModal, type FirmData } from "@/components/seo/GeneratePageModal";
import { cancelCurrentJob } from "@/hooks/useGenerationJob";
import { BRANCHE_COLORS, getBrancheLabel } from "@/lib/clusterGermanyConstants";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/cluster-germany/$id")({
  component: ClusterGermanyDetailPage,
  head: () => ({
    meta: [
      { title: "Cluster Germany Detail – SEO-OS v3.1" },
      { name: "description", content: "Cluster Germany Detail und Seitenmanagement." },
    ],
  }),
});

type ClusterRow = Tables<"clusters">;
type ClusterPageRow = Tables<"cluster_pages">;

const KANBAN_COLUMNS = [
  { key: "pillar_page", label: "Pillar Page" },
  { key: "service", label: "Service" },
  { key: "fehlercode", label: "Fehlercode" },
  { key: "supporting_info", label: "Supporting Info" },
  { key: "supporting_commercial", label: "Supporting Commercial" },
  { key: "transactional", label: "Transaktional" },
  { key: "deep_page", label: "Deep Page" },
  { key: "blog", label: "Blog" },
] as const;

function toColumnKey(pageType: string): string {
  if (pageType === "pillar") return "pillar_page";
  if (pageType === "transactional_local") return "transactional";
  return pageType;
}

function fromColumnKey(colKey: string): string {
  if (colKey === "pillar_page") return "pillar";
  if (colKey === "transactional") return "transactional_local";
  return colKey;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: "Geplant", color: "bg-muted text-muted-foreground" },
  suggested: { label: "Vorgeschlagen", color: "bg-muted text-muted-foreground" },
  approved: { label: "Bereit", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  generating: { label: "Generiert…", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 animate-pulse" },
  generated: { label: "Generiert", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  published: { label: "Veröffentlicht", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  live: { label: "Live", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  rejected: { label: "Abgelehnt", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

async function fetchClusterScores(clusterId: string, pages: ClusterPageRow[]): Promise<ClusterPageRow[]> {
  const keywords = pages.map((p) => p.keyword);
  const { data, error } = await supabase.functions.invoke("keyword-volume", { body: { keywords } });
  if (error || !data?.success || !data?.data) return pages;

  const results: Record<string, { volume: number; difficulty: number; cpc: number }> = data.data;
  for (const page of pages) {
    const r = results[page.keyword];
    if (!r) continue;
    const volume = r.volume || 0;
    const kd = r.difficulty || 50;
    await supabase.from("cluster_pages").update({
      search_volume: volume,
      keyword_difficulty: kd,
      cpc: r.cpc || null,
      trend_direction: "stable",
      score_volume: Math.round(Math.min((volume / 500) * 25, 25)),
      score_difficulty: Math.round(((100 - kd) / 100) * 20),
    }).eq("cluster_id", clusterId).eq("keyword", page.keyword);
  }

  const { data: updated } = await supabase.from("cluster_pages").select("*").eq("cluster_id", clusterId);
  if (!updated) return pages;

  for (const page of updated) {
    const total = Math.round(
      (page.score_volume || 0) + (page.score_difficulty || 10) +
      (page.score_pillar_support || 12) + (page.score_conversion || 8) +
      (page.score_gap || 10) + (page.score_trend || 3)
    );
    await supabase.from("cluster_pages").update({ score_total: total }).eq("id", page.id);
  }

  const { data: final } = await supabase.from("cluster_pages").select("*").eq("cluster_id", clusterId).order("priority");
  return final || updated;
}

function ClusterGermanyDetailPage() {
  const { id } = Route.useParams();
  const [cluster, setCluster] = useState<ClusterRow | null>(null);
  const [pages, setPages] = useState<ClusterPageRow[]>([]);
  const [firm, setFirm] = useState<FirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingScores, setFetchingScores] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ClusterPageRow | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [expandingCols, setExpandingCols] = useState<Set<string>>(new Set());
  const scoreFetchedRef = useRef(false);

  useEffect(() => {
    async function load() {
      const [clusterRes, pagesRes] = await Promise.all([
        supabase.from("clusters").select("*").eq("id", id).single(),
        supabase.from("cluster_pages").select("*").eq("cluster_id", id).order("priority"),
      ]);
      if (clusterRes.data) {
        setCluster(clusterRes.data);
        if (clusterRes.data.firm_id) {
          const { data: firmData } = await supabase
            .from("firms")
            .select("id, name, street, city, zip, phone, email, website, service_area, oeffnungszeiten, branche, sprache, author, author_title, author_experience, author_certs, rating, review_count")
            .eq("id", clusterRes.data.firm_id)
            .single();
          if (firmData) setFirm(firmData);
        }
      }
      setPages(pagesRes.data || []);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (loading || scoreFetchedRef.current || pages.length === 0) return;
    const allZero = pages.every((p) => !p.score_volume || p.score_volume === 0);
    if (!allZero) return;
    scoreFetchedRef.current = true;
    setFetchingScores(true);
    fetchClusterScores(id, pages).then((updated) => {
      setPages(updated);
      setFetchingScores(false);
    }).catch(() => setFetchingScores(false));
  }, [loading, pages, id]);

  const columns = useMemo(() => {
    const map = new Map<string, ClusterPageRow[]>();
    KANBAN_COLUMNS.forEach((col) => map.set(col.key, []));
    pages.forEach((p) => {
      const key = toColumnKey(p.page_type);
      const arr = map.get(key);
      if (arr) arr.push(p);
      else {
        const fallback = map.get("deep_page");
        if (fallback) fallback.push(p);
      }
    });
    return map;
  }, [pages]);

  const stats = useMemo(() => {
    const total = pages.filter((p) => p.status !== "rejected").length;
    const done = pages.filter((p) => p.status === "generated" || p.status === "published" || p.status === "live").length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [pages]);

  const handleGenerateClick = useCallback((page: ClusterPageRow) => {
    setSelectedPage(page);
  }, []);

  const handleGenerationSuccess = useCallback(async (pageId: string, _jobId: string) => {
    if (!selectedPage) return;
    await supabase.from("cluster_pages").update({
      status: "generated",
      seo_page_id: pageId,
      generated_at: new Date().toISOString(),
    }).eq("id", selectedPage.id);

    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedPage.id
          ? { ...p, status: "generated", seo_page_id: pageId, generated_at: new Date().toISOString() }
          : p
      )
    );
    setGeneratingIds((prev) => { const n = new Set(prev); n.delete(selectedPage.id); return n; });
    setSelectedPage(null);
  }, [selectedPage]);

  const handleSetLive = useCallback(async (page: ClusterPageRow) => {
    await supabase.from("cluster_pages").update({ status: "live" }).eq("id", page.id);
    setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, status: "live" } : p)));
  }, []);

  const handleExpandColumn = useCallback(async (colKey: string) => {
    if (!cluster || expandingCols.has(colKey)) return;
    const pageType = fromColumnKey(colKey);
    const colPages = pages.filter((p) => p.page_type === pageType);
    const prevCount = colPages.length;

    setExpandingCols((prev) => new Set(prev).add(colKey));

    try {
      await supabase.functions.invoke("n8n-proxy", {
        body: {
          webhookType: "cluster-germany-expand",
          payload: {
            clusterId: cluster.id,
            pageType,
            mainKeyword: cluster.main_keyword,
            firm: firm?.name || "",
            branche: cluster.branche || "custom",
            city: cluster.city || "",
            existingKeywords: colPages.map((p) => p.keyword),
          },
        },
      });

      let elapsed = 0;
      const interval = setInterval(async () => {
        elapsed += 3000;
        const { count } = await supabase
          .from("cluster_pages")
          .select("*", { count: "exact", head: true })
          .eq("cluster_id", cluster.id)
          .eq("page_type", pageType);

        if (count !== null && count > prevCount) {
          clearInterval(interval);
          const { data: fresh } = await supabase.from("cluster_pages").select("*").eq("cluster_id", cluster.id).order("priority");
          if (fresh) setPages(fresh);
          setExpandingCols((prev) => { const n = new Set(prev); n.delete(colKey); return n; });
          const added = count - prevCount;
          import("sonner").then(({ toast }) => toast.success(`${added} neue Seite${added > 1 ? "n" : ""} vorgeschlagen`));
        }
        if (elapsed >= 30000) {
          clearInterval(interval);
          setExpandingCols((prev) => { const n = new Set(prev); n.delete(colKey); return n; });
          import("sonner").then(({ toast }) => toast.error("Zeitüberschreitung — bitte später erneut versuchen"));
        }
      }, 3000);
    } catch {
      setExpandingCols((prev) => { const n = new Set(prev); n.delete(colKey); return n; });
      import("sonner").then(({ toast }) => toast.error("Fehler beim Erweitern der Spalte"));
    }
  }, [cluster, firm, pages, expandingCols]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Lade Cluster…
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">Cluster nicht gefunden.</p>
        <Button asChild><Link to="/cluster-germany">Zurück</Link></Button>
      </div>
    );
  }

  const brancheColor = BRANCHE_COLORS[cluster.branche || ""] || "#64748b";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cluster-germany"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{cluster.name}</h1>
          <p className="text-sm text-muted-foreground truncate">Haupt-Keyword: {cluster.main_keyword}</p>
          {/* Germany-specific badges */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {cluster.city && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{
                  background: "rgba(0,200,255,0.1)",
                  color: "var(--accent, #06b6d4)",
                  border: "1px solid rgba(0,200,255,0.2)",
                }}
              >
                {cluster.city}
              </span>
            )}
            {cluster.branche && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{
                  background: `${brancheColor}26`,
                  color: brancheColor,
                  border: `1px solid ${brancheColor}4D`,
                }}
              >
                {getBrancheLabel(cluster.branche)}
              </span>
            )}
            {cluster.bundesland && (
              <span className="text-[11px] text-muted-foreground">{cluster.bundesland}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium">{stats.done} / {stats.total} Seiten generiert</p>
          <Progress value={stats.pct} className="h-2 w-32 mt-1" />
        </div>
      </div>

      {fetchingScores && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Scores werden geladen…
        </div>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {KANBAN_COLUMNS.map((col) => {
            const colPages = columns.get(col.key) || [];
            return (
              <div key={col.key} className="w-[260px] shrink-0 rounded-lg border border-border bg-muted/30">
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{colPages.length}</Badge>
                </div>
                <div className="p-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {colPages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Keine Seiten</p>
                  )}
                  {colPages.map((page) => (
                    <GermanyPageCard
                      key={page.id}
                      page={page}
                      isGenerating={generatingIds.has(page.id)}
                      isFetchingScores={fetchingScores}
                      onGenerate={() => handleGenerateClick(page)}
                      onSetLive={() => handleSetLive(page)}
                    />
                  ))}
                </div>
                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    disabled={expandingCols.has(col.key)}
                    onClick={() => handleExpandColumn(col.key)}
                  >
                    {expandingCols.has(col.key) ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Wird geladen…</>
                    ) : (
                      "Mehr vorschlagen"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {selectedPage && cluster && (
        <GeneratePageModal
          open={!!selectedPage}
          clusterPage={selectedPage}
          cluster={cluster}
          firm={firm}
          siblingPages={pages}
          onClose={() => setSelectedPage(null)}
          onSuccess={handleGenerationSuccess}
        />
      )}
    </div>
  );
}

// Simplified page card for Germany detail
interface GermanyPageCardProps {
  page: ClusterPageRow;
  isGenerating: boolean;
  isFetchingScores: boolean;
  onGenerate: () => void;
  onSetLive: () => void;
}

function GermanyPageCard({ page, isGenerating, isFetchingScores, onGenerate, onSetLive }: GermanyPageCardProps) {
  const [isStuck, setIsStuck] = useState(false);
  const [resetting, setResetting] = useState(false);
  const score = calculateScore(page);
  const status = page.status || "planned";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  const isGenerated = status === "generated" || status === "published" || status === "live";
  const showSkeleton = isFetchingScores && !page.score_volume;

  useEffect(() => {
    if (!page.generation_jobs_id || isGenerated) { setIsStuck(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("generation_jobs")
        .select("status, created_at").eq("id", page.generation_jobs_id!).maybeSingle();
      if (cancelled || !data) return;
      const isRunning = data.status === "running" || data.status === "pending";
      setIsStuck(isRunning && Date.now() - new Date(data.created_at).getTime() > 5 * 60 * 1000);
    })();
    return () => { cancelled = true; };
  }, [page.generation_jobs_id, isGenerated, isGenerating]);

  const canGenerate = !isGenerated && status !== "generating" && !isGenerating && !isStuck;

  const handleResetStuck = async () => {
    if (!page.generation_jobs_id) return;
    setResetting(true);
    try {
      await cancelCurrentJob("Vom Nutzer abgebrochen");
      await supabase.from("generation_jobs").update({ status: "error", error_message: "Vom Nutzer abgebrochen" }).eq("id", page.generation_jobs_id);
      await supabase.from("cluster_pages").update({ status: "approved", generation_jobs_id: null }).eq("id", page.id);
      setIsStuck(false);
      onGenerate();
    } finally { setResetting(false); }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 space-y-2">
        <p className="font-semibold text-sm text-foreground leading-tight truncate">{page.keyword}</p>
        <p className="text-[10px] text-muted-foreground font-mono truncate">/{page.url_slug}</p>

        {showSkeleton ? (
          <div className="space-y-1.5">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="flex gap-1"><Skeleton className="h-4 w-14 rounded" /><Skeleton className="h-4 w-12 rounded" /></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${scoreColor(score)}`} style={{ width: `${Math.min(score, 100)}%` }} />
              </div>
              <span className={`text-xs font-bold ${scoreTextColor(score)}`}>{score}/100</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Vol: {page.search_volume != null ? page.search_volume.toLocaleString() : "—"}</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">KD: {page.keyword_difficulty != null ? page.keyword_difficulty : "—"}</Badge>
            </div>
          </>
        )}

        <div className="flex gap-1 flex-wrap">
          <Badge className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
            {isGenerating ? "Generiert…" : statusCfg.label}
          </Badge>
        </div>

        <div className="flex gap-1 pt-1">
          {canGenerate && (
            <Button size="sm" className="flex-1 text-[11px] h-7 gap-1" onClick={onGenerate}>
              <Zap className="h-3 w-3" /> Generieren
            </Button>
          )}
          {isStuck && !isGenerated && (
            <Button size="sm" variant="destructive" className="flex-1 text-[11px] h-7 gap-1" onClick={handleResetStuck} disabled={resetting}>
              {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Erneut versuchen
            </Button>
          )}
          {isGenerated && page.seo_page_id && (
            <>
              <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7 gap-1" onClick={() => window.open(`/preview/${page.seo_page_id}`, "_blank")}>
                <Eye className="h-3 w-3" /> Vorschau
              </Button>
              {status !== "live" && (
                <Button size="sm" variant="default" className="text-[11px] h-7 gap-1" onClick={onSetLive}>
                  <Rocket className="h-3 w-3" /> Live
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
