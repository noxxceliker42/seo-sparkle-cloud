import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Zap, Network, Eye, Rocket, AlertCircle, RotateCcw, LinkIcon, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateScore, scoreColor, scoreTextColor } from "@/lib/clusterScore";
import { GeneratePageModal, type FirmData } from "@/components/seo/GeneratePageModal";
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

// ── Bulk score fetch ──────────────────────────────────────────
async function fetchClusterScores(clusterId: string, pages: ClusterPageRow[]): Promise<ClusterPageRow[]> {
  const keywords = pages.map((p) => p.keyword);

  const { data, error } = await supabase.functions.invoke("keyword-volume", {
    body: { keywords },
  });

  if (error || !data?.success || !data?.data) {
    console.warn("keyword-volume bulk fetch failed:", error || data?.error);
    return pages;
  }

  const results: Record<string, { volume: number; difficulty: number; cpc: number }> = data.data;

  // Update each page in DB
  for (const page of pages) {
    const r = results[page.keyword];
    if (!r) continue;

    const volume = r.volume || 0;
    const kd = r.difficulty || 50;
    const scoreVolume = Math.round(Math.min((volume / 500) * 25, 25));
    const scoreDifficulty = Math.round(((100 - kd) / 100) * 20);

    await supabase
      .from("cluster_pages")
      .update({
        search_volume: volume,
        keyword_difficulty: kd,
        cpc: r.cpc || null,
        trend_direction: "stable",
        score_volume: scoreVolume,
        score_difficulty: scoreDifficulty,
      })
      .eq("cluster_id", clusterId)
      .eq("keyword", page.keyword);
  }

  // Re-fetch all pages to compute score_total
  const { data: updated } = await supabase
    .from("cluster_pages")
    .select("*")
    .eq("cluster_id", clusterId);

  if (!updated) return pages;

  // Compute and save score_total
  for (const page of updated) {
    const total = Math.round(
      (page.score_volume || 0) +
      (page.score_difficulty || 10) +
      (page.score_pillar_support || 12) +
      (page.score_conversion || 8) +
      (page.score_gap || 10) +
      (page.score_trend || 3)
    );
    await supabase
      .from("cluster_pages")
      .update({ score_total: total })
      .eq("id", page.id);
  }

  // Final re-fetch with totals
  const { data: final } = await supabase
    .from("cluster_pages")
    .select("*")
    .eq("cluster_id", clusterId)
    .order("priority");

  return final || updated;
}

// ── Main Component ────────────────────────────────────────────
function ClusterDetailPage() {
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

  // Auto-fetch scores when all pages have score_volume = 0
  useEffect(() => {
    if (loading || scoreFetchedRef.current || pages.length === 0) return;
    const allZero = pages.every((p) => !p.score_volume || p.score_volume === 0);
    if (!allZero) return;

    scoreFetchedRef.current = true;
    setFetchingScores(true);

    fetchClusterScores(id, pages).then((updated) => {
      setPages(updated);
      setFetchingScores(false);
    }).catch(() => {
      setFetchingScores(false);
    });
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
    await supabase
      .from("cluster_pages")
      .update({
        status: "generated",
        seo_page_id: pageId,
        generated_at: new Date().toISOString(),
      })
      .eq("id", selectedPage.id);

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
    await supabase
      .from("cluster_pages")
      .update({ status: "live" })
      .eq("id", page.id);
    setPages((prev) =>
      prev.map((p) => (p.id === page.id ? { ...p, status: "live" } : p))
    );
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
          webhookType: "cluster-expand",
          payload: {
            clusterId: cluster.id,
            pageType,
            mainKeyword: cluster.main_keyword,
            firm: firm?.name || "",
            branche: cluster.branche || firm?.branche || "hausgeraete",
            existingKeywords: colPages.map((p) => p.keyword),
          },
        },
      });

      // Poll for new pages
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
          // Reload all pages
          const { data: fresh } = await supabase
            .from("cluster_pages")
            .select("*")
            .eq("cluster_id", cluster.id)
            .order("priority");
          if (fresh) setPages(fresh);
          setExpandingCols((prev) => { const n = new Set(prev); n.delete(colKey); return n; });
          const added = count - prevCount;
          const { toast } = await import("sonner");
          toast.success(`${added} neue Seite${added > 1 ? "n" : ""} vorgeschlagen`);
        }

        if (elapsed >= 30000) {
          clearInterval(interval);
          setExpandingCols((prev) => { const n = new Set(prev); n.delete(colKey); return n; });
          const { toast } = await import("sonner");
          toast.error("Zeitüberschreitung — bitte später erneut versuchen");
        }
      }, 3000);
    } catch {
      setExpandingCols((prev) => { const n = new Set(prev); n.delete(colKey); return n; });
      const { toast } = await import("sonner");
      toast.error("Fehler beim Erweitern der Spalte");
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

      {/* Score loading banner */}
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
              <div
                key={col.key}
                className="w-[260px] shrink-0 rounded-lg border border-border bg-muted/30"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {colPages.length}
                  </Badge>
                </div>

                <div className="p-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {colPages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Keine Seiten</p>
                  )}
                  {colPages.map((page) => (
                    <ClusterPageCard
                      key={page.id}
                      page={page}
                      cluster={cluster!}
                      firm={firm}
                      isGenerating={generatingIds.has(page.id)}
                      isFetchingScores={fetchingScores}
                      onGenerate={() => handleGenerateClick(page)}
                      onSetLive={() => handleSetLive(page)}
                      onSubClusterCreated={(subClusterId) => {
                        setPages((prev) =>
                          prev.map((p) =>
                            p.id === page.id
                              ? { ...p, sub_cluster_id: subClusterId, is_sub_cluster_suggested: true }
                              : p
                          )
                        );
                      }}
                      onLinksUpdated={(pageId, links) => {
                        setPages((prev) =>
                          prev.map((p) =>
                            p.id === pageId
                              ? { ...p, internal_links_set: true, internal_links_list: links as unknown as import("@/integrations/supabase/types").Json }
                              : p
                          )
                        );
                      }}
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

      {/* Generate Page Modal */}
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

// ── Sub-Cluster Modal ─────────────────────────────────────────
const SUB_CLUSTER_TYPES = [
  { value: "brand_pillar", label: "Marke + Service" },
  { value: "generic_local", label: "Gerät/Service lokal" },
  { value: "device_cluster", label: "Gerätetyp-fokussiert" },
  { value: "local_cluster", label: "Ortsteil-fokussiert" },
];

const SUB_CLUSTER_DEPTHS = [
  { value: "kompakt", label: "Kompakt (15–20 Seiten)" },
  { value: "standard", label: "Standard (25–35 Seiten)" },
  { value: "vollstaendig", label: "Vollständig (40–50 Seiten)" },
];

const SUB_LOADING_MSGS = [
  { after: 0, text: "Claude analysiert Keywords…" },
  { after: 10000, text: "Sub-Cluster wird aufgebaut…" },
  { after: 20000, text: "Keywords werden zugewiesen…" },
  { after: 30000, text: "Fast fertig…" },
];

interface SubClusterModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  page: ClusterPageRow;
  cluster: ClusterRow;
  firm: FirmData | null;
  onCreated: (subClusterId: string) => void;
}

function SubClusterModal({ open, onOpenChange, page, cluster, firm, onCreated }: SubClusterModalProps) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(page.keyword);
  const [clusterType, setClusterType] = useState(cluster.cluster_type || "brand_pillar");
  const [clusterDepth, setClusterDepth] = useState("kompakt");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    msgTimers.current.forEach(clearTimeout);
    msgTimers.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleSubmit = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);

    setLoadingMsg(SUB_LOADING_MSGS[0].text);
    SUB_LOADING_MSGS.slice(1).forEach((m) => {
      const t = setTimeout(() => setLoadingMsg(m.text), m.after);
      msgTimers.current.push(t);
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Nicht eingeloggt");
        setLoading(false);
        cleanup();
        return;
      }

      const { error: fnError } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          webhookType: "cluster-plan",
          payload: {
            mainKeyword: keyword.trim(),
            firm: firm?.name || "",
            city: firm?.city || "",
            branche: cluster.branche || firm?.branche || "",
            clusterType,
            clusterDepth,
            userId: session.user.id,
            firmId: firm?.id || null,
            parentClusterId: cluster.id,
          },
        },
      });

      if (fnError) {
        setError(fnError.message || "Fehler beim Starten");
        setLoading(false);
        cleanup();
        return;
      }

      const userId = session.user.id;
      pollRef.current = setInterval(async () => {
        const { data: clusters } = await supabase
          .from("clusters")
          .select("id, status, plan_generated")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!clusters || clusters.length === 0) return;
        const latest = clusters[0];

        if (latest.plan_generated === true && latest.status === "active") {
          cleanup();
          setLoading(false);

          // Update the source cluster_page
          await supabase
            .from("cluster_pages")
            .update({
              sub_cluster_id: latest.id,
              is_sub_cluster_suggested: true,
            })
            .eq("id", page.id);

          onCreated(latest.id);
          onOpenChange(false);
          navigate({ to: "/cluster/$id", params: { id: latest.id } });
        } else if (latest.status === "error") {
          cleanup();
          setLoading(false);
          setError("Sub-Cluster-Generierung fehlgeschlagen. Bitte erneut versuchen.");
        }
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setLoading(false);
      cleanup();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sub-Cluster starten</DialogTitle>
          <DialogDescription>
            Erstelle einen Sub-Cluster basierend auf diesem Thema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Diese Seite hat Potenzial für einen eigenen Cluster. Starte einen Sub-Cluster mit diesem
            Thema als Haupt-Keyword und erhalte automatisch einen vollständigen Seitenplan.
          </p>

          <div className="space-y-2">
            <Label htmlFor="sub-keyword">Haupt-Keyword *</Label>
            <Input
              id="sub-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Cluster-Typ</Label>
            <Select value={clusterType} onValueChange={setClusterType} disabled={loading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUB_CLUSTER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cluster-Tiefe</Label>
            <RadioGroup value={clusterDepth} onValueChange={setClusterDepth} disabled={loading}>
              {SUB_CLUSTER_DEPTHS.map((d) => (
                <div key={d.value} className="flex items-center gap-2">
                  <RadioGroupItem value={d.value} id={`sub-depth-${d.value}`} />
                  <Label htmlFor={`sub-depth-${d.value}`} className="font-normal cursor-pointer">
                    {d.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                <Button variant="ghost" size="sm" className="mt-1 h-7 gap-1 px-2" onClick={handleSubmit}>
                  <RotateCcw className="h-3 w-3" /> Erneut versuchen
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {loadingMsg}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!keyword.trim() || loading} className="flex-1">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiere…</>
              ) : (
                "Sub-Cluster generieren"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Links Modal ───────────────────────────────────────────────
interface LinksModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  page: ClusterPageRow;
  clusterId: string;
  onLinksSet: (links: Array<{ keyword: string; slug: string }>) => void;
}

function LinksModal({ open, onOpenChange, page, clusterId, onLinksSet }: LinksModalProps) {
  const [siblings, setSiblings] = useState<Array<{ id: string; keyword: string; url_slug: string; status: string | null; page_type: string; checked: boolean }>>([]);
  const [claudeLinks, setClaudeLinks] = useState<Array<{ keyword: string; slug: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [loadingSiblings, setLoadingSiblings] = useState(true);
  const [resolvedClusterId, setResolvedClusterId] = useState(clusterId);

  useEffect(() => {
    if (!open) return;

    async function load() {
      setLoadingSiblings(true);

      // Resolve cluster_id if not provided
      let cId = clusterId;
      if (!cId && page.seo_page_id) {
        const { data: cpData } = await supabase
          .from("cluster_pages")
          .select("cluster_id")
          .eq("seo_page_id", page.seo_page_id)
          .limit(1)
          .single();
        if (cpData?.cluster_id) cId = cpData.cluster_id;
        setResolvedClusterId(cId);
      }

      // Load sibling pages
      if (cId) {
        const { data: siblingData } = await supabase
          .from("cluster_pages")
          .select("id, keyword, url_slug, status, page_type")
          .eq("cluster_id", cId)
          .neq("id", page.id)
          .order("priority", { ascending: true });

        const existingSet = new Set(
          ((page.internal_links_list || []) as Array<{ keyword?: string }>).map((l) => l.keyword)
        );

        setSiblings(
          (siblingData || []).map((s) => ({
            ...s,
            checked:
              existingSet.has(s.keyword) ||
              s.status === "generated" ||
              s.status === "live" ||
              s.status === "published",
          }))
        );
      }

      // Load Claude-embedded links from seo_pages
      if (page.seo_page_id) {
        const { data: pageData } = await supabase
          .from("seo_pages")
          .select("internal_links")
          .eq("id", page.seo_page_id)
          .single();

        if (pageData?.internal_links) {
          const rawLinks = pageData.internal_links as Array<{ keyword?: string; slug?: string; url?: string }>;
          setClaudeLinks(
            rawLinks.map((l) => ({
              keyword: l.keyword || "",
              slug: l.slug || l.url || "",
            }))
          );
        }
      }

      setLoadingSiblings(false);
    }
    load();
  }, [open, clusterId, page.id, page.seo_page_id, page.internal_links_list]);

  const handleSave = async () => {
    setSaving(true);
    const selectedLinks = siblings
      .filter((s) => s.checked)
      .map((s) => ({ keyword: s.keyword, url_slug: s.url_slug }));

    await supabase
      .from("cluster_pages")
      .update({
        internal_links_set: true,
        internal_links_list: selectedLinks as unknown as import("@/integrations/supabase/types").Json,
      })
      .eq("id", page.id);

    onLinksSet(selectedLinks.map((l) => ({ keyword: l.keyword, slug: l.url_slug })));
    setSaving(false);
    onOpenChange(false);
    import("sonner").then(({ toast }) => toast.success("Interne Links als gesetzt markiert ✓"));
  };

  const activeSiblings = siblings.filter((s) => s.status !== "planned" && s.status !== "suggested");
  const plannedSiblings = siblings.filter((s) => s.status === "planned" || s.status === "suggested");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Interne Links verwalten</DialogTitle>
          <DialogDescription>{page.keyword}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
          {/* Section 1: Sibling Pages */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Geschwister-Seiten dieses Clusters</h4>
            {loadingSiblings ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Lade Seiten…
              </div>
            ) : siblings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine anderen Seiten in diesem Cluster.
              </p>
            ) : (
              <div className="space-y-1 border rounded-md p-2 bg-muted/30 max-h-52 overflow-y-auto">
                {activeSiblings.map((s) => {
                  const sCfg = STATUS_CONFIG[s.status || "planned"] || STATUS_CONFIG.planned;
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                      <Checkbox
                        checked={s.checked}
                        onCheckedChange={() =>
                          setSiblings((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, checked: !x.checked } : x))
                          )
                        }
                        disabled={saving}
                      />
                      <span className="truncate flex-1">
                        {s.keyword}
                        <span className="text-muted-foreground font-mono ml-1">→ /{s.url_slug}</span>
                      </span>
                      <Badge className={`text-[9px] px-1 py-0 ${sCfg.color} shrink-0`}>{sCfg.label}</Badge>
                    </label>
                  );
                })}
                {plannedSiblings.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs py-0.5 opacity-50 cursor-not-allowed">
                    <Checkbox checked={false} disabled />
                    <span className="truncate flex-1">
                      {s.keyword}
                      <span className="text-muted-foreground font-mono ml-1">→ /{s.url_slug}</span>
                    </span>
                    <Badge className="text-[9px] px-1 py-0 bg-muted text-muted-foreground shrink-0">Geplant</Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Claude-embedded links (read-only) */}
          {page.seo_page_id && claudeLinks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Links im generierten HTML</h4>
              <p className="text-[11px] text-muted-foreground mb-2">Diese Links hat Claude in die Seite eingebaut.</p>
              <div className="space-y-1 border rounded-md p-2 bg-muted/20 max-h-40 overflow-y-auto">
                {claudeLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs py-0.5">
                    <Check className="h-3 w-3 text-green-600 shrink-0" />
                    <span className="truncate flex-1">
                      {link.keyword}
                      <span className="text-muted-foreground font-mono ml-1">→ /{link.slug}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving || activeSiblings.filter((s) => s.checked).length === 0} className="flex-1">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Speichere…</>
              ) : (
                "Als gesetzt markieren"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Card Component ────────────────────────────────────────────
interface ClusterPageCardProps {
  page: ClusterPageRow;
  cluster: ClusterRow;
  firm: FirmData | null;
  isGenerating: boolean;
  isFetchingScores: boolean;
  onGenerate: () => void;
  onSetLive: () => void;
  onSubClusterCreated: (subClusterId: string) => void;
  onLinksUpdated: (pageId: string, links: Array<{ keyword: string; slug: string }>) => void;
}

function ClusterPageCard({ page, cluster, firm, isGenerating, isFetchingScores, onGenerate, onSetLive, onSubClusterCreated, onLinksUpdated }: ClusterPageCardProps) {
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [linksModalOpen, setLinksModalOpen] = useState(false);
  const score = calculateScore(page);
  const status = page.status || "planned";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  const isGenerated = status === "generated" || status === "published" || status === "live";
  const canGenerate = !isGenerated && status !== "generating" && !isGenerating;
  const showSkeleton = isFetchingScores && !page.score_volume;
  const hasSubCluster = !!page.sub_cluster_id;

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-3 space-y-2">
          <p className="font-semibold text-sm text-foreground leading-tight truncate">{page.keyword}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">/{page.url_slug}</p>

          {/* Score bar — skeleton while fetching */}
          {showSkeleton ? (
            <div className="space-y-1.5">
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="flex gap-1">
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            </div>
          ) : (
            <>
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

              <div className="flex gap-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Vol: {page.search_volume != null ? page.search_volume.toLocaleString() : "—"}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  KD: {page.keyword_difficulty != null ? page.keyword_difficulty : "—"}
                </Badge>
              </div>
            </>
          )}

          {/* Sub-Cluster Badge */}
          {page.has_sub_cluster_potential && (
            hasSubCluster ? (
              <Link to="/cluster/$id" params={{ id: page.sub_cluster_id! }}>
                <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 cursor-pointer hover:bg-green-200 dark:hover:bg-green-800 transition-colors">
                  <Network className="h-2.5 w-2.5 mr-0.5" /> Sub-Cluster aktiv
                </Badge>
              </Link>
            ) : (
              <Badge
                className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                onClick={() => setSubModalOpen(true)}
              >
                <Network className="h-2.5 w-2.5 mr-0.5" /> Sub-Cluster möglich
              </Badge>
            )
          )}

          {/* Status */}
          <div className="flex gap-1 flex-wrap">
            <Badge className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
              {isGenerating ? "Generiert…" : statusCfg.label}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 pt-1">
            {canGenerate && (
              <Button size="sm" className="flex-1 text-[11px] h-7 gap-1" onClick={onGenerate}>
                <Zap className="h-3 w-3" /> Generieren
              </Button>
            )}
            {isGenerating && (
              <Button size="sm" className="flex-1 text-[11px] h-7 gap-1" disabled>
                <Loader2 className="h-3 w-3 animate-spin" /> Generiere…
              </Button>
            )}
            {isGenerated && page.seo_page_id && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-[11px] h-7 gap-1"
                  onClick={() => window.open(`/preview/${page.seo_page_id}`, "_blank")}
                >
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

          {/* Links setzen button for generated pages */}
          {isGenerated && page.seo_page_id && (
            page.internal_links_set ? (
              <div className="w-full text-center text-[11px] h-7 flex items-center justify-center gap-1 text-green-700 dark:text-green-400">
                <Check className="h-3 w-3" /> Links gesetzt ✓
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-[11px] h-7 gap-1"
                onClick={() => setLinksModalOpen(true)}
              >
                <LinkIcon className="h-3 w-3" /> Links setzen
              </Button>
            )
          )}
        </CardContent>
      </Card>

      {/* Sub-Cluster Modal */}
      {subModalOpen && (
        <SubClusterModal
          open={subModalOpen}
          onOpenChange={setSubModalOpen}
          page={page}
          cluster={cluster}
          firm={firm}
          onCreated={onSubClusterCreated}
        />
      )}

      {/* Links Modal */}
      {linksModalOpen && (
        <LinksModal
          open={linksModalOpen}
          onOpenChange={setLinksModalOpen}
          page={page}
          onLinksSet={(links) => onLinksUpdated(page.id, links)}
        />
      )}
    </>
  );
}
