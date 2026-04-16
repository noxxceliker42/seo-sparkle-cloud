import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Network, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/cluster/")({
  component: ClusterListPage,
  head: () => ({
    meta: [
      { title: "Cluster – SEO-OS v3.1" },
      { name: "description", content: "Alle SEO-Cluster verwalten." },
    ],
  }),
});

type ClusterRow = Tables<"clusters">;
type ClusterPageRow = Tables<"cluster_pages">;

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  planning: "Wird geplant…",
  active: "Aktiv",
  completed: "Abgeschlossen",
  error: "Fehler",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 animate-pulse",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const TYPE_LABELS: Record<string, string> = {
  pillar_page: "Pillar",
  service: "Service",
  fehlercode: "Fehlercode",
  supporting_info: "Info",
  supporting_commercial: "Kommerz.",
  transactional: "Transakt.",
  deep_page: "Deep",
  blog: "Blog",
  pillar: "Pillar",
  transactional_local: "Local",
};

interface ClusterWithPages extends ClusterRow {
  pages: ClusterPageRow[];
}

function ClusterListPage() {
  const [clusters, setClusters] = useState<ClusterWithPages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: clusterData } = await supabase
        .from("clusters")
        .select("*")
        .order("created_at", { ascending: false });

      if (!clusterData || clusterData.length === 0) {
        setClusters([]);
        setLoading(false);
        return;
      }

      const ids = clusterData.map((c) => c.id);
      const { data: pageData } = await supabase
        .from("cluster_pages")
        .select("*")
        .in("cluster_id", ids);

      const pagesByCluster = new Map<string, ClusterPageRow[]>();
      (pageData || []).forEach((p) => {
        const arr = pagesByCluster.get(p.cluster_id || "") || [];
        arr.push(p);
        pagesByCluster.set(p.cluster_id || "", arr);
      });

      setClusters(
        clusterData.map((c) => ({
          ...c,
          pages: pagesByCluster.get(c.id) || [],
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Lade Cluster…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Meine Cluster</h1>
        <Button asChild className="gap-2">
          <Link to="/cluster/neu">
            <PlusCircle className="h-4 w-4" /> Neuen Cluster starten
          </Link>
        </Button>
      </div>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-4">
            <Network className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Noch keine Cluster angelegt</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Ein Cluster gruppiert eine Pillar-Seite mit allen zugehörigen Unterseiten zu einem Themengebiet.
            </p>
            <Button asChild className="gap-2">
              <Link to="/cluster/neu">
                <PlusCircle className="h-4 w-4" /> Ersten Cluster anlegen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((c) => (
            <ClusterCard key={c.id} cluster={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: ClusterWithPages }) {
  const pages = cluster.pages;
  const total = pages.length;
  const generated = pages.filter((p) => p.status === "generated" || p.status === "published" || p.status === "live").length;
  const pct = total > 0 ? Math.round((generated / total) * 100) : 0;

  // Count by page_type
  const typeCounts = new Map<string, number>();
  pages.forEach((p) => {
    typeCounts.set(p.page_type, (typeCounts.get(p.page_type) || 0) + 1);
  });
  const topTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const status = cluster.status || "draft";

  return (
    <Link to="/cluster/$id" params={{ id: cluster.id }} className="block group">
      <Card className="transition-all hover:ring-2 hover:ring-primary/30 hover:shadow-md cursor-pointer h-full">
        <CardContent className="pt-5 space-y-3">
          {/* Name + Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {cluster.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">{cluster.main_keyword}</p>
            </div>
            <Badge className={`shrink-0 ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
              {STATUS_LABELS[status] || status}
            </Badge>
          </div>

          {/* Firm badge */}
          {cluster.firm_id && (
            <Badge variant="outline" className="text-xs">
              Firma zugewiesen
            </Badge>
          )}

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{generated} / {total} Seiten generiert</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          {/* Type mini-badges */}
          {topTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {topTypes.map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {TYPE_LABELS[type] || type} {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
