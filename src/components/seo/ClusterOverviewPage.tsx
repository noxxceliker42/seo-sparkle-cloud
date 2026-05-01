import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Network, Globe, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { ClusterStartModal } from "@/components/seo/ClusterStartModal";
import { ClusterGermanyStartModal } from "@/components/seo/ClusterGermanyStartModal";
import { BRANCHE_COLORS, getBrancheLabel } from "@/lib/clusterGermanyConstants";

export type ClusterScope = "default" | "germany";

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

interface ClusterOverviewPageProps {
  scope: ClusterScope;
}

export function ClusterOverviewPage({ scope }: ClusterOverviewPageProps) {
  const [clusters, setClusters] = useState<ClusterWithPages[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFirm, setActiveFirm] = useState<{
    id: string; name: string; city?: string | null; service_area?: string | null;
    branche?: string | null; target_audience?: string | null;
    design_philosophy?: string | null; design_philosophy_custom?: string | null;
    primary_color?: string | null; secondary_color?: string | null; accent_color?: string | null;
  } | null>(null);

  const isGermany = scope === "germany";

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("firm_id")
          .eq("id", session.user.id)
          .single();
        if (profile?.firm_id) {
          const { data: firm } = await supabase
            .from("firms")
            .select("id, name, city, service_area, branche, target_audience, design_philosophy, design_philosophy_custom, primary_color, secondary_color, accent_color")
            .eq("id", profile.firm_id)
            .single();
          if (firm) setActiveFirm(firm);
        }
      }

      let query = supabase
        .from("clusters")
        .select("*")
        .order("created_at", { ascending: false });

      if (isGermany) {
        query = query.eq("scope", "germany");
      } else {
        // Default cluster: exclude germany scope
        query = query.or("scope.is.null,scope.neq.germany");
      }

      const { data: clusterData } = await query;

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
        clusterData.map((c) => ({ ...c, pages: pagesByCluster.get(c.id) || [] }))
      );
      setLoading(false);
    }
    load();
  }, [isGermany]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Lade Cluster{isGermany ? " Germany" : ""}…
      </div>
    );
  }

  const title = isGermany ? "Cluster Germany" : "Meine Cluster";
  const emptyIcon = isGermany ? <Globe className="h-12 w-12 text-muted-foreground" /> : <Network className="h-12 w-12 text-muted-foreground" />;
  const emptyTitle = isGermany ? "Noch keine Germany-Cluster" : "Noch keine Cluster angelegt";
  const emptyDesc = isGermany
    ? "Erstelle branchenübergreifende Cluster für beliebige deutsche Städte und Regionen."
    : "Ein Cluster gruppiert eine Pillar-Seite mit allen zugehörigen Unterseiten zu einem Themengebiet.";
  const buttonLabel = isGermany ? "Neuer Cluster Germany" : "Neuen Cluster starten";
  const emptyButtonLabel = isGermany ? "Ersten Cluster Germany anlegen" : "Ersten Cluster anlegen";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" /> {buttonLabel}
        </Button>
      </div>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-4">
            {emptyIcon}
            <h2 className="text-lg font-semibold text-foreground">{emptyTitle}</h2>
            <p className="text-muted-foreground text-center max-w-md">{emptyDesc}</p>
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" /> {emptyButtonLabel}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((c) => (
            <ClusterCard key={c.id} cluster={c} scope={scope} />
          ))}
        </div>
      )}

      {isGermany ? (
        <ClusterGermanyStartModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          activeFirm={activeFirm}
        />
      ) : (
        <ClusterStartModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          activeFirm={activeFirm}
        />
      )}
    </div>
  );
}

function ClusterCard({ cluster, scope }: { cluster: ClusterWithPages; scope: ClusterScope }) {
  const isGermany = scope === "germany";
  const pages = cluster.pages;
  const total = pages.length;
  const generated = pages.filter((p) => p.status === "generated" || p.status === "published" || p.status === "live").length;
  const pct = total > 0 ? Math.round((generated / total) * 100) : 0;
  const status = cluster.status || "draft";
  const brancheColor = BRANCHE_COLORS[cluster.branche || ""] || "#64748b";

  // Count by page_type (for default scope)
  const typeCounts = new Map<string, number>();
  pages.forEach((p) => {
    typeCounts.set(p.page_type, (typeCounts.get(p.page_type) || 0) + 1);
  });
  const topTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const cardJsx = (
    <Card className="transition-all hover:ring-2 hover:ring-primary/30 hover:shadow-md cursor-pointer h-full">
      <CardContent className="pt-5 space-y-3">
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

        {isGermany && (
          <div className="flex flex-wrap gap-1.5">
            {cluster.city && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(0,200,255,0.1)", color: "var(--accent, #06b6d4)", border: "1px solid rgba(0,200,255,0.2)" }}>
                {cluster.city}
              </span>
            )}
            {cluster.branche && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: `${brancheColor}26`, color: brancheColor, border: `1px solid ${brancheColor}4D` }}>
                {getBrancheLabel(cluster.branche)}
              </span>
            )}
          </div>
        )}

        {!isGermany && cluster.firm_id && (
          <Badge variant="outline" className="text-xs">Firma zugewiesen</Badge>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{generated} / {total} Seiten generiert</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        {!isGermany && topTypes.length > 0 && (
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
  );

  if (isGermany) {
    return (
      <Link to="/cluster-germany/$id" params={{ id: cluster.id }} className="block group">
        {cardJsx}
      </Link>
    );
  }

  return (
    <Link to="/cluster/$id" params={{ id: cluster.id }} className="block group">
      {cardJsx}
    </Link>
  );
}
