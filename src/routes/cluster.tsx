import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/cluster")({
  component: ClusterPage,
  head: () => ({
    meta: [
      { title: "Cluster-Karte – SEO-OS v3.1" },
      { name: "description", content: "Visuelle Cluster-Karte aller SEO-Seiten." },
    ],
  }),
});

interface SeoPage {
  id: string;
  keyword: string;
  intent: string | null;
  page_type: string | null;
  score: number | null;
  status: string | null;
  firm: string | null;
  city: string | null;
  meta_title: string | null;
  meta_desc: string | null;
  html_output: string | null;
}

const TYPE_CONFIG: Record<string, { color: string; fill: string; size: number }> = {
  "Pillar Page": { color: "#ef4444", fill: "#fca5a5", size: 40 },
  "Supporting Info": { color: "#3b82f6", fill: "#93c5fd", size: 28 },
  "Supporting Commercial": { color: "#f59e0b", fill: "#fcd34d", size: 28 },
  "Transactional/Local": { color: "#22c55e", fill: "#86efac", size: 28 },
  "Deep Page": { color: "#8b5cf6", fill: "#c4b5fd", size: 22 },
};

function getNodeConfig(pageType: string | null) {
  if (!pageType) return TYPE_CONFIG["Supporting Info"];
  for (const [key, config] of Object.entries(TYPE_CONFIG)) {
    if (pageType.toLowerCase().includes(key.toLowerCase().split(" ")[0].toLowerCase())) return config;
  }
  return TYPE_CONFIG["Supporting Info"];
}

function ClusterPage() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<SeoPage | null>(null);

  useEffect(() => {
    supabase.from("seo_pages").select("*").then(({ data }) => {
      setPages((data as SeoPage[]) || []);
      setLoading(false);
    });
  }, []);

  const nodes = useMemo(() => {
    const cx = 400, cy = 300;
    if (pages.length === 0) return [];
    
    // Place pillar in center, others in rings
    const pillars = pages.filter((p) => p.page_type?.toLowerCase().includes("pillar"));
    const others = pages.filter((p) => !p.page_type?.toLowerCase().includes("pillar"));
    
    const result: Array<SeoPage & { x: number; y: number; config: typeof TYPE_CONFIG[string] }> = [];
    
    pillars.forEach((p, i) => {
      result.push({ ...p, x: cx + i * 80, y: cy, config: getNodeConfig(p.page_type) });
    });
    
    others.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / Math.max(others.length, 1);
      const radius = 150 + Math.random() * 60;
      result.push({
        ...p,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        config: getNodeConfig(p.page_type),
      });
    });
    
    return result;
  }, [pages]);

  // Draw connections from non-pillar to pillar nodes
  const connections = useMemo(() => {
    const pillars = nodes.filter((n) => n.page_type?.toLowerCase().includes("pillar"));
    const others = nodes.filter((n) => !n.page_type?.toLowerCase().includes("pillar"));
    if (pillars.length === 0) return [];
    return others.map((o) => {
      const pillar = pillars[0]; // connect to first pillar
      return { x1: pillar.x, y1: pillar.y, x2: o.x, y2: o.y };
    });
  }, [nodes]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Lade Cluster-Karte…</div>;

  if (pages.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Cluster-Karte</h1>
        <div className="text-center py-16 text-muted-foreground">
          <p>Noch keine Seiten vorhanden. Erstelle deine erste SEO-Seite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Cluster-Karte</h1>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(TYPE_CONFIG).map(([label, cfg]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="rounded-full" style={{ width: cfg.size / 2, height: cfg.size / 2, backgroundColor: cfg.color }} />
            <span className="text-sm text-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* SVG */}
      <TooltipProvider>
        <div className="rounded-lg border border-border bg-card overflow-auto">
          <svg viewBox="0 0 800 600" className="w-full min-h-[500px]">
            {/* Connections */}
            {connections.map((c, i) => (
              <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1.5} />
            ))}
            {/* Nodes */}
            {nodes.map((node) => (
              <Tooltip key={node.id}>
                <TooltipTrigger asChild>
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedPage(node)}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.config.size / 2}
                      fill={node.config.fill}
                      stroke={node.config.color}
                      strokeWidth={2}
                    />
                    <text
                      x={node.x}
                      y={node.y + node.config.size / 2 + 14}
                      textAnchor="middle"
                      className="fill-foreground text-[10px]"
                    >
                      {node.keyword.length > 20 ? node.keyword.slice(0, 18) + "…" : node.keyword}
                    </text>
                  </g>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{node.keyword}</p>
                  <p className="text-xs">Score: {node.score || 0}% • {node.page_type || "Unbekannt"}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </svg>
        </div>
      </TooltipProvider>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPage} onOpenChange={(o) => !o && setSelectedPage(null)}>
        <DialogContent className="max-w-lg">
          {selectedPage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPage.keyword}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="flex gap-2">
                  <Badge variant="outline">{selectedPage.intent || "–"}</Badge>
                  <Badge variant="outline">{selectedPage.page_type || "–"}</Badge>
                  <Badge className={`${(selectedPage.score || 0) >= 85 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {selectedPage.score || 0}%
                  </Badge>
                </div>
                {selectedPage.firm && <p className="text-sm"><span className="text-muted-foreground">Firma:</span> {selectedPage.firm}</p>}
                {selectedPage.city && <p className="text-sm"><span className="text-muted-foreground">Stadt:</span> {selectedPage.city}</p>}
                {selectedPage.meta_title && <p className="text-sm"><span className="text-muted-foreground">Title:</span> {selectedPage.meta_title}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
