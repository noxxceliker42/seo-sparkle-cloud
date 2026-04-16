import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, Zap, Network } from "lucide-react";
import { calculateScore, scoreColor, scoreTextColor } from "@/lib/clusterScore";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/cluster/$id")({
  component: ClusterDetailPage,
  head: () => ({
    meta: [
      { title: "Cluster-Detail – SEO-OS v3.1" },
      { name: "description", content: "Cluster-Detail und Seitenmanagement." },
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

// Map DB page_type values to kanban column keys
function toColumnKey(pageType: string): string {
  if (pageType === "pillar") return "pillar_page";
  if (pageType === "transactional_local") return "transactional";
  return pageType;
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

function ClusterDetailPage() {
  const { id } = Route.useParams();
  const [cluster, setCluster] = useState<ClusterRow | null>(null);
  const [pages, setPages] = useState<ClusterPageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [clusterRes, pagesRes] = await Promise.all([
        supabase.from("clusters").select("*").eq("id", id).single(),
        supabase.from("cluster_pages").select("*").eq("cluster_id", id).order("priority"),
      ]);
      if (clusterRes.data) setCluster(clusterRes.data);
      setPages(pagesRes.data || []);
      setLoading(false);
    }
    load();
  }, [id]);

  // Group pages by kanban column
  const columns = useMemo(() => {
    const map = new Map<string, ClusterPageRow[]>();
    KANBAN_COLUMNS.forEach((col) => map.set(col.key, []));
    pages.forEach((p) => {
      const key = toColumnKey(p.page_type);
      const arr = map.get(key);
      if (arr) {
        arr.push(p);
      } else {
        // Unknown type → first column that exists, or skip
        const fallback = map.get("deep_page");
        if (fallback) fallback.push(p);
      }
    });
    return map;
  }, [pages]);

  // Stats
  const stats = useMemo(() => {
    const total = pages.filter((p) => p.status !== "rejected").length;
    const done = pages.filter((p) => p.status === "generated" || p.status === "published" || p.status === "live").length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [pages]);

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
        <Button asChild>
          <Link to="/cluster">Zurück</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cluster">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{cluster.name}</h1>
          <p className="text-sm text-muted-foreground truncate">Haupt-Keyword: {cluster.main_keyword}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium">
            {stats.done} / {stats.total} Seiten generiert
          </p>
          <Progress value={stats.pct} className="h-2 w-32 mt-1" />
        </div>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {KANBAN_COLUMNS.map((col) => {
            const colPages = columns.get(col.key) || [];
            return (
              <div
                key={col.key}
                className="w-[260px] shrink-0 rounded-lg border border-border bg-muted/30"
              >
                {/* Column header */}
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {colPages.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {colPages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Keine Seiten</p>
                  )}
                  {colPages.map((page) => (
                    <ClusterPageCard key={page.id} page={page} />
                  ))}
                </div>

                {/* More button */}
                <div className="p-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" disabled>
                    Mehr vorschlagen
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function ClusterPageCard({ page }: { page: ClusterPageRow }) {
  const score = calculateScore(page);
  const status = page.status || "planned";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.planned;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 space-y-2">
        {/* Keyword */}
        <p className="font-semibold text-sm text-foreground leading-tight truncate">{page.keyword}</p>

        {/* URL slug */}
        <p className="text-[10px] text-muted-foreground font-mono truncate">/{page.url_slug}</p>

        {/* Score bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreColor(score)}`}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${scoreTextColor(score)}`}>
            {score}/100
          </span>
        </div>

        {/* Metrics badges */}
        <div className="flex gap-1 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Vol: {page.search_volume != null ? page.search_volume.toLocaleString() : "—"}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            KD: {page.keyword_difficulty != null ? page.keyword_difficulty : "—"}
          </Badge>
        </div>

        {/* Status + Sub-cluster badges */}
        <div className="flex gap-1 flex-wrap">
          <Badge className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
            {statusCfg.label}
          </Badge>
          {page.has_sub_cluster_potential && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
              <Network className="h-2.5 w-2.5 mr-0.5" /> Sub-Cluster
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 pt-1">
          <Button size="sm" className="flex-1 text-[11px] h-7 gap-1" disabled>
            <Zap className="h-3 w-3" /> Generieren
          </Button>
          {page.has_sub_cluster_potential && (
            <Button size="sm" variant="outline" className="text-[11px] h-7" disabled>
              Sub-Cluster
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
