import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Smartphone,
  Save,
  Loader2,
  Trash2,
  ArrowLeft,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/editor/$pageId")({
  component: EditorPage,
  head: () => ({
    meta: [{ title: "Seiten-Editor – SEO-OS v3.1" }],
  }),
});

interface Block {
  id: string;
  type: string;
  label: string;
  html: string;
  index: number;
}

interface PageRow {
  id: string;
  keyword: string;
  html_output: string | null;
  page_type: string | null;
  design_philosophy: string | null;
  firm_id: string | null;
}

interface FirmRow {
  name: string;
  branche: string | null;
}

const COLOR_VAR_RE = {
  primary: /--c-primary\s*:\s*[^;}]+/g,
  bg: /--c-bg\s*:\s*[^;}]+/g,
  accent: /--c-accent\s*:\s*[^;}]+/g,
};

function SortableBlockItem({
  block,
  isActive,
  onClick,
}: {
  block: Block;
  isActive: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-2.5 rounded-lg mx-2 my-0.5 cursor-pointer transition-colors text-sm",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-secondary text-foreground",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Sektion verschieben"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="truncate">{block.label}</div>
        <div className="text-[10px] font-mono text-muted-foreground truncate">
          {block.type}
        </div>
      </div>
    </div>
  );
}

function injectColorVars(html: string, colors: { primary: string; bg: string; accent: string }) {
  // Replace existing --c-* tokens or inject a style block in <head>
  let out = html;
  let touched = false;
  if (COLOR_VAR_RE.primary.test(out)) {
    out = out.replace(/--c-primary\s*:\s*[^;}]+/g, `--c-primary: ${colors.primary}`);
    touched = true;
  }
  if (COLOR_VAR_RE.bg.test(out)) {
    out = out.replace(/--c-bg\s*:\s*[^;}]+/g, `--c-bg: ${colors.bg}`);
    touched = true;
  }
  if (COLOR_VAR_RE.accent.test(out)) {
    out = out.replace(/--c-accent\s*:\s*[^;}]+/g, `--c-accent: ${colors.accent}`);
    touched = true;
  }
  if (touched) return out;
  const styleBlock = `<style id="editor-color-overrides">:root{--c-primary:${colors.primary};--c-bg:${colors.bg};--c-accent:${colors.accent};}</style>`;
  if (/<\/head>/i.test(out)) return out.replace(/<\/head>/i, styleBlock + "</head>");
  return styleBlock + out;
}

function parseHtmlToBlocks(html: string): Block[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Versuch 1: data-section Attribute
  const sections = doc.querySelectorAll("[data-section]");
  if (sections.length > 0) {
    return Array.from(sections).map((el, i) => ({
      id: el.getAttribute("data-section-id") || `sec_${i}`,
      type: el.getAttribute("data-section") || "unknown",
      label: el.getAttribute("data-section-label") || `Sektion ${i + 1}`,
      html: el.outerHTML,
      index: i,
    }));
  }

  // Fallback: <section> Tags ohne Attribute
  const fallbackSections = doc.querySelectorAll("section");
  if (fallbackSections.length > 0) {
    return Array.from(fallbackSections).map((el, i) => {
      const heading = el.querySelector("h1,h2,h3");
      return {
        id: `sec_${i}`,
        type: "section",
        label:
          heading?.textContent?.trim().slice(0, 40) || `Sektion ${i + 1}`,
        html: el.outerHTML,
        index: i,
      };
    });
  }

  // Letzter Fallback: gesamtes <body> als ein Block
  return [
    {
      id: "sec_body",
      type: "body",
      label: "Gesamte Seite",
      html: doc.body.innerHTML,
      index: 0,
    },
  ];
}

function extractColorsFromHtml(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const styleEls = doc.querySelectorAll("style");
  const styleText = Array.from(styleEls)
    .map((el) => el.textContent || "")
    .join("\n");

  const extract = (varName: string): string | null => {
    const re = new RegExp(
      varName.replace(/[-]/g, "\\-") + "\\s*:\\s*(#[0-9a-fA-F]{3,8})",
    );
    const match = styleText.match(re);
    return match?.[1] || null;
  };

  return {
    primary: extract("--c-primary") || "#1d4ed8",
    secondary: extract("--c-bg") || "#ffffff",
    accent: extract("--c-accent") || "#dc2626",
  };
}

function EditorPage() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();
  const { canEdit, isReadOnly } = useRole();

  const [page, setPage] = useState<PageRow | null>(null);
  const [firm, setFirm] = useState<FirmRow | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [primaryColor, setPrimaryColor] = useState("#1d4ed8");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#dc2626");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setIsDirty(true);
  };

  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const originalHtmlRef = useRef<string>("");

  // Load page + firm
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPage(true);
      const { data: pageData, error: pageErr } = await supabase
        .from("seo_pages")
        .select("id, keyword, html_output, page_type, design_philosophy, firm_id")
        .eq("id", pageId)
        .single();
      if (cancelled) return;
      if (pageErr || !pageData) {
        toast.error("Seite konnte nicht geladen werden");
        setLoadingPage(false);
        return;
      }
      setPage(pageData as PageRow);

      if (pageData.firm_id) {
        const { data: firmData } = await supabase
          .from("firms")
          .select("name, branche, primary_color, secondary_color, accent_color")
          .eq("id", pageData.firm_id)
          .single();
        if (!cancelled && firmData) {
          setFirm({ name: firmData.name, branche: firmData.branche });
          setPrimaryColor(firmData.primary_color || "#1d4ed8");
          setSecondaryColor(firmData.secondary_color || "#ffffff");
          setAccentColor(firmData.accent_color || "#dc2626");
        }
      }
      setLoadingPage(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  // Parse blocks once page is loaded + extract colors directly from HTML
  useEffect(() => {
    if (page?.html_output) {
      originalHtmlRef.current = page.html_output;
      setBlocks(parseHtmlToBlocks(page.html_output));
      const extracted = extractColorsFromHtml(page.html_output);
      setPrimaryColor(extracted.primary);
      setSecondaryColor(extracted.secondary);
      setAccentColor(extracted.accent);
    }
  }, [page]);

  const buildPreviewHtml = useCallback((): string => {
    if (!originalHtmlRef.current) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(originalHtmlRef.current, "text/html");
    const existing = doc.querySelectorAll("[data-section]");
    existing.forEach((el) => el.remove());

    const body = doc.body;
    blocks.forEach((block) => {
      const tmp = parser.parseFromString(block.html, "text/html");
      const el = tmp.querySelector("[data-section]");
      if (el) body.appendChild(el);
    });

    let html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    html = injectColorVars(html, {
      primary: primaryColor,
      bg: secondaryColor,
      accent: accentColor,
    });
    return html;
  }, [blocks, primaryColor, secondaryColor, accentColor]);

  // iframe srcDoc
  const [previewSrc, setPreviewSrc] = useState<string>("");
  useEffect(() => {
    if (blocks.length > 0 || originalHtmlRef.current) {
      setPreviewSrc(buildPreviewHtml());
    }
  }, [blocks, buildPreviewHtml]);

  const updateIframeVar = (varName: string, value: string) => {
    const iframe = previewRef.current;
    if (!iframe?.contentDocument) return;
    iframe.contentDocument.documentElement.style.setProperty(varName, value);
  };

  const handleConfirmDelete = () => {
    if (!activeBlockId) return;
    const removedLabel = blocks.find((b) => b.id === activeBlockId)?.label;
    setBlocks((prev) => prev.filter((b) => b.id !== activeBlockId));
    setActiveBlockId(null);
    setIsDirty(true);
    setDeleteDialogOpen(false);
    toast.success("Sektion entfernt", removedLabel ? { description: removedLabel } : undefined);
  };

  const handleSave = useCallback(async () => {
    if (!canEdit || !page) return;
    setIsSaving(true);
    try {
      const newHtml = buildPreviewHtml();

      const { error: updErr } = await supabase
        .from("seo_pages")
        .update({
          html_output: newHtml,
          updated_at: new Date().toISOString(),
        })
        .eq("id", page.id);
      if (updErr) throw updErr;

      // page_versions.user_id is required by RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("page_versions").insert({
          seo_page_id: page.id,
          html_output: newHtml,
          user_id: user.id,
        });
      }

      setIsDirty(false);
      originalHtmlRef.current = newHtml;
      toast.success("Gespeichert", { description: "Version wurde gesichert." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern", { description: msg });
    } finally {
      setIsSaving(false);
    }
  }, [canEdit, page, buildPreviewHtml]);

  // Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && canEdit) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDirty, canEdit, handleSave]);

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Seite nicht gefunden.</p>
      </div>
    );
  }

  if (!page.html_output) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-muted-foreground">Diese Seite hat noch kein generiertes HTML.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Button>
      </div>
    );
  }

  const activeBlock = blocks.find((b) => b.id === activeBlockId) || null;
  const hasDataSections = blocks.some(
    (b) => b.type !== "section" && b.type !== "body",
  );
  const showLegacyBanner = blocks.length > 0 && !hasDataSections;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* HEADER */}
      <header className="h-[60px] border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 w-[280px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
        </div>
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-medium truncate max-w-md mx-auto">{page.keyword}</div>
          {firm?.name && (
            <div className="text-xs text-muted-foreground truncate">{firm.name}</div>
          )}
        </div>
        <div className="flex items-center gap-2 w-[280px] justify-end">
          {isDirty && <Badge variant="outline" className="text-amber-600 border-amber-300">Ungespeichert</Badge>}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/preview/${pageId}`, "_blank")}
          >
            <ExternalLink className="h-4 w-4" /> Vorschau
          </Button>
          <Button
            size="sm"
            disabled={isSaving || !isDirty || !canEdit}
            onClick={handleSave}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </Button>
        </div>
      </header>

      {isReadOnly && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-700">
          Lesemodus — keine Änderungen möglich
        </div>
      )}

      {/* BODY */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-[240px] border-r border-border overflow-y-auto shrink-0 bg-muted/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Sektionen</span>
            <Badge variant="secondary">{blocks.length}</Badge>
          </div>
          {showLegacyBanner && (
            <div className="mx-2 mt-2 mb-1 p-2 rounded bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
              Ältere Seite — Sektionen ohne Marker. Neu generieren für volle
              Editor-Funktion.
            </div>
          )}
          <div className="py-2">
            {blocks.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-6 text-center">
                Keine data-section Marker gefunden.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block) => (
                    <SortableBlockItem
                      key={block.id}
                      block={block}
                      isActive={activeBlockId === block.id}
                      onClick={() => setActiveBlockId(block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </aside>

        {/* PREVIEW */}
        <section className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          <div className="flex items-center justify-center gap-1 px-3 py-2 border-b border-border bg-background">
            <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors",
                  viewMode === "desktop"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors",
                  viewMode === "mobile"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex justify-center p-4">
            <div
              className={cn(
                "bg-white shadow-lg transition-all",
                viewMode === "desktop" ? "w-full max-w-[1280px]" : "w-[390px]",
              )}
            >
              <iframe
                ref={previewRef}
                srcDoc={previewSrc}
                title="Editor Preview"
                sandbox="allow-same-origin"
                className="w-full h-full border-0"
                style={{ minHeight: "calc(100vh - 140px)" }}
              />
            </div>
          </div>
        </section>

        {/* PROPERTIES */}
        <aside className="w-[280px] border-l border-border overflow-y-auto shrink-0">
          {!activeBlock ? (
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                  Seite
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Keyword</dt>
                    <dd className="font-medium text-right truncate">{page.keyword}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Typ</dt>
                    <dd className="font-medium">{page.page_type || "–"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Firma</dt>
                    <dd className="font-medium text-right truncate">{firm?.name || "–"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Sektionen</dt>
                    <dd className="font-medium">{blocks.length}</dd>
                  </div>
                </dl>
              </div>

              {canEdit && (
                <div>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                    Design
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Primärfarbe", value: primaryColor, set: setPrimaryColor, varName: "--c-primary" },
                      { label: "Hintergrund", value: secondaryColor, set: setSecondaryColor, varName: "--c-bg" },
                      { label: "Akzent", value: accentColor, set: setAccentColor, varName: "--c-accent" },
                    ].map((c) => (
                      <div key={c.varName} className="space-y-1">
                        <label className="text-xs text-muted-foreground">{c.label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={c.value}
                            onChange={(e) => {
                              c.set(e.target.value);
                              setIsDirty(true);
                              updateIframeVar(c.varName, e.target.value);
                            }}
                            className="h-8 w-8 rounded cursor-pointer border p-0.5"
                          />
                          <span className="text-xs font-mono text-muted-foreground">
                            {c.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <div className="font-medium text-sm">{activeBlock.label}</div>
                <div className="text-xs font-mono text-muted-foreground mt-0.5">
                  {activeBlock.type}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive border-destructive/30"
                  disabled={!canEdit}
                  onClick={handleRemoveBlock}
                >
                  <Trash2 className="h-4 w-4" /> Sektion entfernen
                </Button>
              </div>

              <div className="border border-dashed border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  KI-Editor verfügbar in Phase 2
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
