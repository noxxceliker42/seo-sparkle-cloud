import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, XCircle, AlertTriangle, Download, ExternalLink,
  RefreshCw, Save, Clock, Calendar, Pencil, Eye, Copy,
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

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("In Zwischenablage kopiert"),
    () => toast.error("Kopieren fehlgeschlagen")
  );
}

/* ────────── Component ────────── */

export default function PageDetailPanel({ page: initialPage, onUpdate, onClose: _onClose }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState<SeoPage>(initialPage);
  const [activeTab, setActiveTab] = useState("overview");

  // Meta state
  const [metaTitle, setMetaTitle] = useState(page.meta_title || "");
  const [metaDesc, setMetaDesc] = useState(page.meta_desc || "");
  const [canonicalUrl, setCanonicalUrl] = useState(page.published_url || "");
  const [robots, setRobots] = useState<"index" | "noindex">("index");

  // URL state
  const [publishedUrl, setPublishedUrl] = useState(page.published_url || "");
  const [sitemapAdded, setSitemapAdded] = useState(page.sitemap_added || false);

  useEffect(() => {
    setPage(initialPage);
    setMetaTitle(initialPage.meta_title || "");
    setMetaDesc(initialPage.meta_desc || "");
    setCanonicalUrl(initialPage.published_url || "");
    setPublishedUrl(initialPage.published_url || "");
    setSitemapAdded(initialPage.sitemap_added || false);
    // Detect robots from HTML
    const html = initialPage.html_output || "";
    const m = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
    setRobots(m && /noindex/i.test(m[1]) ? "noindex" : "index");
  }, [initialPage]);

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
    await updatePage({
      meta_title: metaTitle,
      meta_desc: metaDesc,
      published_url: canonicalUrl,
      status_changed_at: new Date().toISOString(),
    });
    toast.success("Meta gespeichert");
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

  const openInEditor = () => {
    navigate({ to: "/editor/$pageId", params: { pageId: page.id } });
  };

  const openPreview = () => {
    window.open(`/preview/${page.id}`, "_blank", "noopener,noreferrer");
  };

  /* ── JSON-LD blocks extracted from html_output ── */
  const jsonLdBlocks = useMemo(() => {
    const html = page.html_output || "";
    const matches = html.match(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi) || [];
    return matches.map((block, idx) => {
      const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      let pretty = inner;
      let valid = true;
      try {
        pretty = JSON.stringify(JSON.parse(inner), null, 2);
      } catch {
        valid = false;
      }
      return { id: idx, pretty, valid, raw: inner };
    });
  }, [page.html_output]);

  /* ── Image slots from HTML (NanoBanana placeholders) ── */
  const nbImageSlots = useMemo(() => {
    const html = page.html_output || "";
    const tagRegex = /<img\b[^>]*data-nb-slot=[^>]*>/gi;
    const tags = html.match(tagRegex) || [];
    const attr = (tag: string, name: string) => {
      const r = new RegExp(`${name}="([^"]*)"`, "i");
      const m = tag.match(r);
      return m ? m[1] : "";
    };
    return tags.map((tag) => ({
      slot: attr(tag, "data-nb-slot"),
      prompt: attr(tag, "data-nb-prompt"),
      width: attr(tag, "data-nb-width") || "—",
      height: attr(tag, "data-nb-height") || "—",
      ratio: attr(tag, "data-nb-ratio") || "",
      alt: attr(tag, "alt"),
      currentSrc: attr(tag, "src"),
      isPlaceholder: attr(tag, "src") === "BILD_PLATZHALTER",
    }));
  }, [page.html_output]);

  const [nbImageUrls, setNbImageUrls] = useState<Record<string, string>>({});

  const handleInsertNbImage = async (slot: string) => {
    const url = (nbImageUrls[slot] || "").trim();
    if (!url) return;
    const html = page.html_output || "";
    const tagRegex = new RegExp(
      `(<img\\b[^>]*\\bdata-nb-slot="${slot.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"[^>]*>)`,
      "i"
    );
    const updated = html.replace(tagRegex, (tag) => {
      if (/\bsrc="[^"]*"/i.test(tag)) {
        return tag.replace(/\bsrc="[^"]*"/i, `src="${url}"`);
      }
      return tag.replace(/<img\b/i, `<img src="${url}"`);
    });
    if (updated === html) {
      toast.error(`Slot "${slot}" nicht gefunden`);
      return;
    }
    await updatePage({ html_output: updated });
    setNbImageUrls((prev) => ({ ...prev, [slot]: "" }));
    toast.success("Bild erfolgreich eingebaut ✓");
  };

  /* ── Links extracted from HTML ── */
  const linkData = useMemo(() => {
    const html = page.html_output || "";
    const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    const internal: { href: string; text: string }[] = [];
    const external: { href: string; text: string; rel: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html))) {
      const attrs = m[1];
      const text = m[2].replace(/<[^>]+>/g, "").trim().slice(0, 100);
      const hrefMatch = attrs.match(/href="([^"]+)"/i);
      if (!hrefMatch) continue;
      const href = hrefMatch[1];
      if (href.startsWith("/") || href.startsWith("#")) {
        internal.push({ href, text: text || "(kein Text)" });
      } else if (/^https?:\/\//i.test(href)) {
        const relMatch = attrs.match(/rel="([^"]+)"/i);
        external.push({ href, text: text || "(kein Text)", rel: relMatch?.[1] || "" });
      }
    }
    return { internal, external };
  }, [page.html_output]);

  /* ── QA Checks (Tech / Content / LP) ── */
  const qaResult = useMemo(() => {
    const html = page.html_output || "";
    const isLp = (page.page_type || "").toLowerCase().startsWith("lp") ||
                 (page.page_type || "").toLowerCase().includes("landing");

    const tech = [
      { label: "H1 vorhanden", ok: /<h1\b/i.test(html) },
      { label: "Meta-Title (50–60 Zeichen)", ok: metaTitle.length >= 50 && metaTitle.length <= 60 },
      { label: "JSON-LD vorhanden", ok: jsonLdBlocks.length > 0 && jsonLdBlocks.every((b) => b.valid) },
      { label: "data-section Attribute", ok: /data-section=/i.test(html) },
      { label: "Mobile viewport Meta-Tag", ok: /<meta\s+name="viewport"/i.test(html) },
      { label: "Telefon als tel:-Link", ok: /href="tel:/i.test(html) },
    ];
    const content = [
      { label: "Mindest-Wortanzahl (>800)", ok: html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length > 800 },
      { label: "FAQ-Sektion vorhanden", ok: /faq/i.test(html) },
      { label: "Interne Links (min. 1)", ok: linkData.internal.length >= 1 },
    ];
    const lp = isLp ? [
      { label: "Social Proof Widget", ok: /social[-_]?proof|testimonial|bewertung|review/i.test(html) },
      { label: "CTA-Button vorhanden", ok: /<(a|button)[^>]*\b(class|id)="[^"]*\b(cta|btn-primary|primary-btn)\b/i.test(html) || /jetzt\s+(anrufen|buchen|kontakt|termin)/i.test(html) },
      { label: "Formular vorhanden", ok: /<form\b/i.test(html) },
    ] : [];

    const allChecks = [...tech, ...content, ...lp];
    const score = Math.round((allChecks.filter((c) => c.ok).length / allChecks.length) * 100);
    return { tech, content, lp, isLp, score };
  }, [page.html_output, page.page_type, metaTitle, jsonLdBlocks, linkData.internal.length]);

  // Persist QA score automatically when it changes
  useEffect(() => {
    if (qaResult.score !== (page.qa_score || 0)) {
      supabase.from("seo_pages").update({ qa_score: qaResult.score }).eq("id", page.id).then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qaResult.score]);

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

  const CheckRow = ({ label, ok }: { label: string; ok: boolean }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );

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
          {page.page_type && <Badge variant="secondary">{page.page_type}</Badge>}
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
          <Badge className={STATUS_COLORS[page.status || "draft"]}>{STATUS_LABELS[page.status || "draft"]}</Badge>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {page.html_output && (
            <Button onClick={openInEditor} className="gap-2">
              <Pencil className="h-4 w-4" /> Im Editor öffnen
            </Button>
          )}
          {page.html_output && (
            <Button variant="outline" onClick={openPreview} className="gap-2">
              <Eye className="h-4 w-4" /> Vorschau öffnen
            </Button>
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
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Erstellt am", value: formatDT(page.created_at), icon: Calendar },
            { label: "Zuletzt geändert", value: formatDT(page.updated_at), icon: Clock },
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
          <div className="border border-border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground mb-1">Google SERP Preview</p>
            <p className="text-[#1a0dab] text-base truncate">{metaTitle || "Kein Titel"}</p>
            <p className="text-[#006621] text-sm truncate">{canonicalUrl || publishedUrl || "https://example.com/seite"}</p>
            <p className="text-sm text-[#545454] line-clamp-2">{metaDesc || "Keine Beschreibung"}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Meta-Description</Label>
          <Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} />
          <p className={`text-xs ${metaDesc.length > 155 ? "text-destructive" : "text-muted-foreground"}`}>{metaDesc.length}/155</p>
        </div>
        <div className="space-y-2">
          <Label>Canonical URL</Label>
          <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://example.com/seite" />
        </div>
        <div className="space-y-2">
          <Label>Robots</Label>
          <Select value={robots} onValueChange={(v) => setRobots(v as "index" | "noindex")}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="index">index, follow</SelectItem>
              <SelectItem value="noindex">noindex, nofollow</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Hinweis: Wird als Information gespeichert. HTML-Anpassung erfolgt beim nächsten Generieren oder manuell im Editor.
          </p>
        </div>
        <Button onClick={saveMeta}><Save className="h-4 w-4 mr-1" /> Speichern</Button>
      </TabsContent>

      {/* ═══ TAB 3: HTML ═══ */}
      <TabsContent value="html" className="space-y-4 mt-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => copyText(page.html_output || "")} disabled={!page.html_output} className="gap-1">
            <Copy className="h-4 w-4" /> Kopieren
          </Button>
          {page.html_output && (
            <Button size="sm" variant="default" onClick={openInEditor} className="gap-1">
              <Pencil className="h-4 w-4" /> Im Editor öffnen
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={exportHtml} disabled={!page.html_output} className="gap-1">
            <Download className="h-4 w-4" /> HTML exportieren
          </Button>
        </div>
        <pre className="font-mono text-xs bg-secondary/50 border border-border rounded-lg p-3 max-h-[500px] overflow-auto whitespace-pre-wrap break-all">
          {page.html_output || <em className="text-muted-foreground">Kein HTML vorhanden.</em>}
        </pre>
      </TabsContent>

      {/* ═══ TAB 4: JSON-LD ═══ */}
      <TabsContent value="jsonld" className="space-y-4 mt-4">
        {jsonLdBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine JSON-LD Script-Tags im HTML gefunden.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{jsonLdBlocks.length} Schema{jsonLdBlocks.length !== 1 ? "s" : ""}</Badge>
              <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 ml-auto">
                Im Rich Results Test prüfen <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {jsonLdBlocks.map((block) => (
              <div key={block.id} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    {block.valid
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-xs font-medium">Schema #{block.id + 1}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyText(block.pretty)} className="h-7 gap-1">
                    <Copy className="h-3 w-3" /> Kopieren
                  </Button>
                </div>
                <pre className="font-mono text-xs p-3 overflow-auto max-h-[300px] whitespace-pre-wrap">{block.pretty}</pre>
              </div>
            ))}
          </>
        )}
      </TabsContent>

      {/* ═══ TAB 5: Bilder ═══ */}
      <TabsContent value="images" className="space-y-4 mt-4">
        {nbImageSlots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Keine Bild-Platzhalter in dieser Seite.</p>
            <p className="text-sm mt-1">Aktiviere "Bild-Platzhalter einbauen" beim nächsten Generieren.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nbImageSlots.map((s) => (
              <div key={s.slot} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {s.slot} — {s.width}×{s.height}
                    {s.ratio && <span className="text-muted-foreground ml-1">({s.ratio})</span>}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${s.isPlaceholder ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {s.isPlaceholder ? "Platzhalter" : "Bild gesetzt"}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">NanoBanana Prompt:</label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-secondary p-2 rounded font-mono break-all">
                      {s.prompt || <em className="text-muted-foreground">— kein Prompt —</em>}
                    </code>
                    <Button type="button" size="sm" onClick={() => copyText(s.prompt)} disabled={!s.prompt} className="whitespace-nowrap gap-1">
                      <Copy className="h-3 w-3" /> Kopieren
                    </Button>
                  </div>
                </div>

                {s.isPlaceholder && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Bild-URL einsetzen:</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={nbImageUrls[s.slot] || ""}
                        onChange={(e) => setNbImageUrls((prev) => ({ ...prev, [s.slot]: e.target.value }))}
                        className="flex-1 text-xs h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleInsertNbImage(s.slot)}
                        disabled={!(nbImageUrls[s.slot] || "").trim()}
                        className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                      >
                        Einbauen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ═══ TAB 6: Links ═══ */}
      <TabsContent value="links" className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Interne Links</h3>
              <Badge variant="outline">{linkData.internal.length}</Badge>
            </div>
            {linkData.internal.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine internen Links gefunden.</p>
            ) : (
              <ul className="space-y-1.5 max-h-[400px] overflow-auto pr-2">
                {linkData.internal.map((l, i) => (
                  <li key={i} className="border border-border rounded p-2 text-xs">
                    <div className="font-medium truncate">{l.text}</div>
                    <code className="text-muted-foreground break-all">{l.href}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Externe Links</h3>
              <Badge variant="outline">{linkData.external.length}</Badge>
            </div>
            {linkData.external.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine externen Links gefunden.</p>
            ) : (
              <ul className="space-y-1.5 max-h-[400px] overflow-auto pr-2">
                {linkData.external.map((l, i) => (
                  <li key={i} className="border border-border rounded p-2 text-xs">
                    <div className="font-medium truncate flex items-center gap-1">
                      {l.text}
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </div>
                    <code className="text-muted-foreground break-all">{l.href}</code>
                    {l.rel && (
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-[10px]">rel: {l.rel}</Badge>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ═══ TAB 7: QA-Analyse ═══ */}
      <TabsContent value="qa" className="space-y-5 mt-4">
        <div className="flex items-start gap-6">
          <ScoreRing score={qaResult.score} />
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-lg">QA-Analyse</h3>
            <p className="text-sm text-muted-foreground">
              {qaResult.tech.filter((c) => c.ok).length + qaResult.content.filter((c) => c.ok).length + qaResult.lp.filter((c) => c.ok).length} von {qaResult.tech.length + qaResult.content.length + qaResult.lp.length} Checks bestanden
            </p>
            {page.html_output && (
              <Button size="sm" onClick={openInEditor} className="mt-2 gap-2">
                <Pencil className="h-4 w-4" /> Im Editor verbessern
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Technische Checks</h4>
          <div className="space-y-1.5">
            {qaResult.tech.map((c) => <CheckRow key={c.label} {...c} />)}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Content Checks</h4>
          <div className="space-y-1.5">
            {qaResult.content.map((c) => <CheckRow key={c.label} {...c} />)}
          </div>
        </div>

        {qaResult.isLp && qaResult.lp.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Landing-Page Checks</h4>
            <div className="space-y-1.5">
              {qaResult.lp.map((c) => <CheckRow key={c.label} {...c} />)}
            </div>
          </div>
        )}

        {!qaResult.isLp && (
          <p className="text-xs text-muted-foreground italic">
            LP-Checks werden nur für Landing-Page-Typen angezeigt.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
