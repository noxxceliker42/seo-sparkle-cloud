import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, XCircle, AlertTriangle, Download, ExternalLink,
  RefreshCw, Save, Clock, Calendar, Zap, Timer,
} from "lucide-react";

/* ────────── Types ────────── */

interface ClusterInfo {
  cluster_id: string;
  cluster_name: string;
  pillar_tier: number | null;
}

export interface SeoPage {
  id: string;
  keyword: string;
  firm: string | null;
  firm_id: string | null;
  firm_name?: string | null;
  intent: string | null;
  page_type: string | null;
  score: number | null;
  qa_score: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  status_changed_at: string | null;
  html_output: string | null;
  json_ld: string | null;
  meta_title: string | null;
  meta_desc: string | null;
  meta_keywords: string | null;
  design_preset: string | null;
  city: string | null;
  active_sections: unknown;
  cluster_info?: ClusterInfo | null;
  published_url: string | null;
  sitemap_added: boolean | null;
  internal_links: unknown;
  contao_mode: boolean | null;
  body_content: string | null;
  css_block: string | null;
}

interface Props {
  page: SeoPage;
  onUpdate: (page: SeoPage) => void;
  onClose: () => void;
}

const STATUS_FLOW = ["draft", "reviewed", "approved", "published"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf", reviewed: "Geprüft", approved: "Freigegeben", published: "Veröffentlicht",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  published: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};
const TIER_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: "Pillar", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  2: { label: "Tier 2", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  3: { label: "Tier 3", className: "bg-muted text-muted-foreground" },
};

function formatDT(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function scoreColor(s: number) {
  if (s >= 71) return "text-green-600";
  if (s >= 41) return "text-amber-600";
  return "text-destructive";
}

function scoreRingColor(s: number) {
  if (s >= 71) return "stroke-green-500";
  if (s >= 41) return "stroke-amber-500";
  return "stroke-destructive";
}

/* ────────── Component ────────── */

export default function PageDetailPanel({ page: initialPage, onUpdate, onClose }: Props) {
  const [page, setPage] = useState<SeoPage>(initialPage);
  const [activeTab, setActiveTab] = useState("overview");

  // Meta state
  const [metaTitle, setMetaTitle] = useState(page.meta_title || "");
  const [metaDesc, setMetaDesc] = useState(page.meta_desc || "");
  const [metaKw, setMetaKw] = useState(page.meta_keywords || "");

  // HTML state
  const [htmlCode, setHtmlCode] = useState(page.html_output || "");
  const [htmlSubTab, setHtmlSubTab] = useState<"preview" | "code">("preview");

  // JSON-LD state
  const [jsonLd, setJsonLd] = useState(page.json_ld || "");
  const [jsonValid, setJsonValid] = useState<boolean | null>(null);

  // URL state
  const [publishedUrl, setPublishedUrl] = useState(page.published_url || "");
  const [sitemapAdded, setSitemapAdded] = useState(page.sitemap_added || false);

  // Cluster siblings for Links tab
  const [siblings, setSiblings] = useState<{ id: string; keyword: string; url_slug: string; linked: boolean }[]>([]);
  const [internalLinksSet, setInternalLinksSet] = useState(false);

  useEffect(() => {
    setPage(initialPage);
    setMetaTitle(initialPage.meta_title || "");
    setMetaDesc(initialPage.meta_desc || "");
    setMetaKw(initialPage.meta_keywords || "");
    setHtmlCode(initialPage.html_output || "");
    setJsonLd(initialPage.json_ld || "");
    setPublishedUrl(initialPage.published_url || "");
    setSitemapAdded(initialPage.sitemap_added || false);
  }, [initialPage]);

  // Validate JSON-LD on change
  useEffect(() => {
    if (!jsonLd.trim()) { setJsonValid(null); return; }
    try { JSON.parse(jsonLd); setJsonValid(true); } catch { setJsonValid(false); }
  }, [jsonLd]);

  // Load siblings for Links tab
  useEffect(() => {
    if (!page.cluster_info) return;
    (async () => {
      const { data } = await supabase
        .from("cluster_pages")
        .select("id, keyword, url_slug, internal_links_set")
        .eq("cluster_id", page.cluster_info!.cluster_id)
        .neq("seo_page_id", page.id);
      if (data) {
        setSiblings(data.map((d) => ({ id: d.id, keyword: d.keyword, url_slug: d.url_slug, linked: false })));
      }
      // Check if current page has links set
      const { data: cp } = await supabase
        .from("cluster_pages")
        .select("internal_links_set")
        .eq("seo_page_id", page.id)
        .maybeSingle();
      setInternalLinksSet(cp?.internal_links_set || false);
    })();
  }, [page.cluster_info, page.id]);

  const updatePage = useCallback(async (fields: Partial<SeoPage>) => {
    const { error } = await supabase.from("seo_pages").update(fields as any).eq("id", page.id);
    if (error) { toast.error("Fehler: " + error.message); return; }
    const updated = { ...page, ...fields } as SeoPage;
    setPage(updated);
    onUpdate(updated);
  }, [page, onUpdate]);

  /* ── Status ── */
  const handleStatus = async (s: string) => {
    await updatePage({ status: s, status_changed_at: new Date().toISOString() });
    toast.success(`Status: ${STATUS_LABELS[s]}`);
  };

  /* ── Meta save ── */
  const saveMeta = async () => {
    await updatePage({ meta_title: metaTitle, meta_desc: metaDesc, meta_keywords: metaKw, status_changed_at: new Date().toISOString() });
    toast.success("Meta gespeichert");
  };

  /* ── HTML save ── */
  const saveHtml = async () => {
    // Save version first
    const { data: lastVersion } = await supabase
      .from("page_versions")
      .select("version_number")
      .eq("seo_page_id", page.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (lastVersion?.version_number || 0) + 1;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("page_versions").insert({
      seo_page_id: page.id,
      user_id: user?.id,
      html_output: htmlCode,
      meta_title: metaTitle,
      meta_desc: metaDesc,
      version_number: nextVersion,
    });
    await updatePage({ html_output: htmlCode });
    toast.success(`HTML gespeichert (Version ${nextVersion})`);
  };

  /* ── JSON-LD save ── */
  const saveJsonLd = async () => {
    if (jsonValid === false) { toast.error("JSON ist ungültig"); return; }
    await updatePage({ json_ld: jsonLd });
    toast.success("Schema-Markup gespeichert");
  };

  /* ── URL save ── */
  const saveUrl = async () => {
    await updatePage({ published_url: publishedUrl, sitemap_added: sitemapAdded });
    toast.success("URL gespeichert");
  };

  /* ── Set as Pillar ── */
  const setAsPillar = async () => {
    if (!page.cluster_info) return;
    const { error } = await supabase.from("clusters").update({ pillar_page_id: page.id }).eq("id", page.cluster_info.cluster_id);
    if (error) { toast.error(error.message); return; }
    toast.success("Als Pillar-Seite gesetzt");
  };

  /* ── Links set ── */
  const markLinksSet = async () => {
    await supabase.from("cluster_pages").update({ internal_links_set: true }).eq("seo_page_id", page.id);
    setInternalLinksSet(true);
    toast.success("Interne Links als gesetzt markiert");
  };

  /* ── Export ── */
  const exportHtml = () => {
    const html = page.html_output;
    if (!html) return;
    const slug = page.keyword.toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${slug}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── QA Checks ── */
  const qaChecks = useMemo(() => {
    const html = page.html_output || "";
    const checks = [
      { label: "HTML vollständig", ok: html.includes("</html>"), points: 25, warn: false },
      { label: "Meta-Title (10–60 Z.)", ok: metaTitle.length >= 10 && metaTitle.length <= 60, points: 20, warn: metaTitle.length > 60 },
      { label: "Meta-Description (50–155 Z.)", ok: metaDesc.length >= 50 && metaDesc.length <= 155, points: 15, warn: metaDesc.length > 155 },
      { label: "JSON-LD Schema", ok: !!page.json_ld && jsonValid !== false, points: 20, warn: false },
      { label: "FAQ-Sektion", ok: /faq/i.test(html), points: 10, warn: false },
      { label: "Autor-Box", ok: /auto(r|hor)/i.test(html), points: 10, warn: false },
      { label: "Interne Links gesetzt", ok: internalLinksSet, points: 0, warn: false },
    ];
    const score = checks.reduce((s, c) => s + (c.ok ? c.points : 0), 0);
    return { checks, score };
  }, [page.html_output, metaTitle, metaDesc, page.json_ld, jsonValid, internalLinksSet]);

  const saveQaScore = async () => {
    await updatePage({ qa_score: qaChecks.score });
    toast.success(`QA-Score ${qaChecks.score}% gespeichert`);
  };

  /* ── Image slots from HTML ── */
  const imageSlots = useMemo(() => {
    const html = page.html_output || "";
    const regex = /data-slot="([^"]+)"[^>]*data-label="([^"]*)"/g;
    const slots: { slot: string; label: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html))) slots.push({ slot: m[1], label: m[2] });
    return slots;
  }, [page.html_output]);

  /* ── Score ring SVG ── */
  const ScoreRing = ({ score }: { score: number }) => {
    const r = 36, c = 2 * Math.PI * r, offset = c - (score / 100) * c;
    return (
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className={scoreRingColor(score)} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor(score)}`}>{score}%</span>
      </div>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
        <TabsTrigger value="overview">Übersicht</TabsTrigger>
        <TabsTrigger value="meta">Meta</TabsTrigger>
        <TabsTrigger value="html">HTML</TabsTrigger>
        <TabsTrigger value="jsonld">JSON-LD</TabsTrigger>
        <TabsTrigger value="images">Bilder</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="qa">QA</TabsTrigger>
      </TabsList>

      {/* ═══ TAB 1: Übersicht ═══ */}
      <TabsContent value="overview" className="space-y-5 mt-4">
        <h2 className="text-xl font-bold">{page.keyword}</h2>
        <div className="flex flex-wrap gap-2 items-center">
          {page.firm_name && <Badge variant="outline">{page.firm_name}</Badge>}
          {page.cluster_info && (
            <div className="flex items-center gap-1">
              <Link to="/cluster/$id" params={{ id: page.cluster_info.cluster_id }} className="text-sm text-primary hover:underline">
                {page.cluster_info.cluster_name}
              </Link>
              {page.cluster_info.pillar_tier && TIER_CONFIG[page.cluster_info.pillar_tier] && (
                <Badge className={`text-[10px] px-1 py-0 ${TIER_CONFIG[page.cluster_info.pillar_tier].className}`}>
                  {TIER_CONFIG[page.cluster_info.pillar_tier].label}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Status workflow */}
        <div>
          <p className="text-xs text-muted-foreground uppercase mb-2">Status-Workflow</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FLOW.map((s) => (
              <Button key={s} size="sm" variant={page.status === s ? "default" : "outline"} className={page.status === s ? STATUS_COLORS[s] : ""} onClick={() => handleStatus(s)}>
                {STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Tokens", value: "–", icon: Zap },
            { label: "Dauer", value: "–", icon: Timer },
            { label: "Erstellt", value: formatDT(page.created_at), icon: Calendar },
            { label: "Geändert", value: formatDT(page.updated_at), icon: Clock },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <c.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="font-medium text-sm">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Published URL */}
        <div className="space-y-2">
          <Label>Live URL</Label>
          <div className="flex gap-2">
            <Input value={publishedUrl} onChange={(e) => setPublishedUrl(e.target.value)} placeholder="https://example.com/seite" />
            <Button size="sm" onClick={saveUrl}><Save className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={sitemapAdded} onCheckedChange={(v) => setSitemapAdded(!!v)} id="sitemap" />
            <Label htmlFor="sitemap" className="text-sm">In Sitemap</Label>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link to="/">
              <RefreshCw className="h-4 w-4 mr-1" /> Neu generieren
            </Link>
          </Button>
          {page.cluster_info && (
            <Button variant="outline" onClick={setAsPillar}>Als Pillar setzen</Button>
          )}
        </div>
      </TabsContent>

      {/* ═══ TAB 2: Meta ═══ */}
      <TabsContent value="meta" className="space-y-5 mt-4">
        <div className="space-y-2">
          <Label>Meta-Title</Label>
          <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
          <p className={`text-xs ${metaTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>{metaTitle.length}/60</p>
          {/* SERP Preview */}
          <div className="border border-border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground mb-1">Google SERP Preview</p>
            <p className="text-[#1a0dab] text-base truncate">{metaTitle || "Kein Titel"}</p>
            <p className="text-[#006621] text-sm truncate">{publishedUrl || "https://example.com/seite"}</p>
            <p className="text-sm text-[#545454] line-clamp-2">{metaDesc || "Keine Beschreibung"}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Meta-Description</Label>
          <Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} />
          <p className={`text-xs ${metaDesc.length > 155 ? "text-destructive" : "text-muted-foreground"}`}>{metaDesc.length}/155</p>
        </div>
        <div className="space-y-2">
          <Label>Meta-Keywords (kommasepariert)</Label>
          <Input value={metaKw} onChange={(e) => setMetaKw(e.target.value)} />
        </div>
        <Button onClick={saveMeta}><Save className="h-4 w-4 mr-1" /> Speichern</Button>
      </TabsContent>

      {/* ═══ TAB 3: HTML ═══ */}
      <TabsContent value="html" className="space-y-4 mt-4">
        <div className="flex gap-2">
          <Button size="sm" variant={htmlSubTab === "preview" ? "default" : "outline"} onClick={() => setHtmlSubTab("preview")}>Vorschau</Button>
          <Button size="sm" variant={htmlSubTab === "code" ? "default" : "outline"} onClick={() => setHtmlSubTab("code")}>Code</Button>
        </div>

        {htmlSubTab === "preview" ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <iframe srcDoc={page.html_output || ""} className="w-full h-[400px]" sandbox="allow-same-origin" title="Preview" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="inline h-4 w-4 mr-1" />
              Direkte HTML-Bearbeitung überschreibt generierte Inhalte. Version wird gespeichert.
            </div>
            <Textarea value={htmlCode} onChange={(e) => setHtmlCode(e.target.value)} className="font-mono text-xs min-h-[400px]" />
            <div className="flex gap-2">
              <Button onClick={saveHtml}><Save className="h-4 w-4 mr-1" /> HTML speichern</Button>
              <Button variant="outline" onClick={exportHtml}><Download className="h-4 w-4 mr-1" /> HTML exportieren</Button>
            </div>
          </div>
        )}
      </TabsContent>

      {/* ═══ TAB 4: JSON-LD ═══ */}
      <TabsContent value="jsonld" className="space-y-4 mt-4">
        <div className="flex items-center gap-2">
          <Label>JSON-LD Schema</Label>
          {jsonValid === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {jsonValid === false && <XCircle className="h-4 w-4 text-destructive" />}
        </div>
        <Textarea value={jsonLd} onChange={(e) => setJsonLd(e.target.value)} className="font-mono text-xs min-h-[300px]" />
        <div className="flex gap-2 items-center">
          <Button onClick={saveJsonLd} disabled={jsonValid === false}><Save className="h-4 w-4 mr-1" /> JSON-LD speichern</Button>
          <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
            Im Rich Results Test prüfen <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </TabsContent>

      {/* ═══ TAB 5: Bilder ═══ */}
      <TabsContent value="images" className="space-y-4 mt-4">
        {imageSlots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Diese Seite hat keine Bild-Platzhalter.</p>
            <p className="text-sm mt-1">Seite neu generieren um Bilder einzufügen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {imageSlots.map((s) => (
              <Card key={s.slot}>
                <CardContent className="pt-4 pb-3">
                  <p className="font-medium text-sm">{s.label || s.slot}</p>
                  <p className="text-xs text-muted-foreground">Slot: {s.slot}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ═══ TAB 6: Links ═══ */}
      <TabsContent value="links" className="space-y-4 mt-4">
        {page.cluster_info ? (
          <>
            <p className="text-sm text-muted-foreground">Cluster-Geschwister für interne Verlinkung:</p>
            {siblings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Geschwister-Seiten gefunden.</p>
            ) : (
              <div className="space-y-2">
                {siblings.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={s.linked} disabled />
                    <span>{s.keyword}</span>
                    <span className="text-xs text-muted-foreground">/{s.url_slug}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button onClick={markLinksSet} disabled={internalLinksSet} variant={internalLinksSet ? "secondary" : "default"}>
                {internalLinksSet ? "✅ Links gesetzt" : "Links als gesetzt markieren"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Diese Seite gehört keinem Cluster an.</p>
        )}
      </TabsContent>

      {/* ═══ TAB 7: QA ═══ */}
      <TabsContent value="qa" className="space-y-5 mt-4">
        <div className="flex items-start gap-6">
          <ScoreRing score={qaChecks.score} />
          <div className="space-y-2 flex-1">
            {qaChecks.checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : c.warn ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <span>{c.label}</span>
                {c.points > 0 && <span className="text-xs text-muted-foreground">({c.points} Pkt.)</span>}
                {!c.ok && c.label === "Interne Links gesetzt" && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setActiveTab("links")}>→ Links-Tab</Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <Button onClick={saveQaScore}><Save className="h-4 w-4 mr-1" /> QA-Score speichern</Button>
      </TabsContent>
    </Tabs>
  );
}
