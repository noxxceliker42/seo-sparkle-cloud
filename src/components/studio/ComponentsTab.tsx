import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LayoutTemplate,
  Columns,
  Link2,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  Copy,
  Smartphone,
  Monitor,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import {
  renderComponentHtml,
  buildComponentPreview,
  COMPONENT_TYPE_META,
} from "@/lib/componentRenderer";

interface BrandKitLite {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  logo_alt: string | null;
}

interface CompRow {
  id: string;
  firm_id: string | null;
  brand_kit_id: string | null;
  component_type: string;
  variant: string;
  name: string;
  description: string | null;
  html_output: string | null;
  css_output: string | null;
  js_output: string | null;
  config: Record<string, any>;
  embed_id: string;
  embed_type: string;
  is_global: boolean | null;
}

const TYPE_ICONS: Record<string, any> = {
  header: LayoutTemplate,
  footer: Columns,
  link_block: Link2,
  cta_bar: Megaphone,
};

const TYPE_LABELS: Record<string, string> = {
  header: "Header",
  footer: "Footer",
  link_block: "Link Block",
  cta_bar: "CTA Bar",
};

interface Props {
  firmId: string | null;
  brandKits: BrandKitLite[];
  activeBrandKit: BrandKitLite | null;
  components: CompRow[];
  onComponentsChange: (next: CompRow[]) => void;
}

export function ComponentsTab({
  firmId,
  brandKits,
  activeBrandKit,
  components,
  onComponentsChange,
}: Props) {
  const [filterType, setFilterType] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [kiOpen, setKiOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const filtered = useMemo(
    () => (filterType === "all" ? components : components.filter((c) => c.component_type === filterType)),
    [filterType, components],
  );

  const active = useMemo(
    () => components.find((c) => c.id === activeId) ?? null,
    [activeId, components],
  );

  useEffect(() => {
    if (!active && filtered.length) setActiveId(filtered[0].id);
  }, [filtered, active]);

  const updateActive = (patch: Partial<CompRow>) => {
    if (!active) return;
    onComponentsChange(
      components.map((c) => (c.id === active.id ? { ...c, ...patch } : c)),
    );
  };

  const updateConfig = (patch: Record<string, any>) => {
    if (!active) return;
    updateActive({ config: { ...(active.config || {}), ...patch } });
  };

  /* Delete */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Komponente wirklich löschen?")) return;
    const { error } = await supabase.from("components").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    onComponentsChange(components.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    toast.success("Komponente gelöscht");
  };

  /* Generate / Save */
  const handleGenerate = async () => {
    if (!active) return;
    setGenerating(true);
    const html = renderComponentHtml(
      active.component_type,
      active.variant,
      active.config || {},
      activeBrandKit,
    );
    const { error } = await supabase
      .from("components")
      .update({
        html_output: html,
        config: active.config,
        name: active.name,
        variant: active.variant,
        brand_kit_id: active.brand_kit_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", active.id);
    setGenerating(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen");
      return;
    }
    updateActive({ html_output: html });
    toast.success("Komponente generiert ✓");
  };

  const previewHtml = useMemo(() => {
    if (!active) return "";
    const html = active.html_output ||
      renderComponentHtml(active.component_type, active.variant, active.config || {}, activeBrandKit);
    return buildComponentPreview(html, activeBrandKit);
  }, [active, activeBrandKit]);

  return (
    <div className="grid grid-cols-[320px_1fr] gap-6">
      {/* LEFT — list */}
      <div className="border rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="text-xs h-8 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="footer">Footer</SelectItem>
                <SelectItem value="link_block">Link Block</SelectItem>
                <SelectItem value="cta_bar">CTA Bar</SelectItem>
              </SelectContent>
            </Select>
            <CreateComponentDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              firmId={firmId}
              brandKits={brandKits}
              activeBrandKitId={activeBrandKit?.id ?? null}
              onCreated={(c) => {
                onComponentsChange([...components, c]);
                setActiveId(c.id);
                setCreateOpen(false);
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setKiOpen(true)}
            className="gap-1.5 h-8 text-xs w-full"
          >
            <Sparkles className="h-3.5 w-3.5" /> Mit KI erstellen
          </Button>
          <KiGenerateDialog
            open={kiOpen}
            onOpenChange={setKiOpen}
            firmId={firmId}
            brandKits={brandKits}
            activeBrandKit={activeBrandKit}
            defaultType={filterType !== "all" ? filterType : "header"}
            onCreated={(c) => {
              onComponentsChange([...components, c]);
              setActiveId(c.id);
              setKiOpen(false);
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto max-h-[70vh]">
          {filtered.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground text-center">
              Keine Komponenten vorhanden.
            </p>
          ) : (
            filtered.map((c) => {
              const Icon = TYPE_ICONS[c.component_type] || LayoutTemplate;
              const isOwn = c.firm_id === firmId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left flex items-center gap-2 p-3 border-b hover:bg-muted/50 transition ${
                    activeId === c.id ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground flex gap-1.5">
                      <span>{c.variant}</span>
                      {c.is_global && (
                        <span className="px-1 rounded bg-muted text-[9px]">Vorlage</span>
                      )}
                    </div>
                  </div>
                  {isOwn && !c.is_global && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(c.id);
                      }}
                      className="opacity-50 hover:opacity-100 hover:text-destructive p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT — configurator */}
      <div className="min-w-0">
        {!active ? (
          <div className="border rounded-lg p-12 text-center">
            <Pencil className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Keine Komponente ausgewählt</h3>
            <p className="text-sm text-muted-foreground">
              Wähle links eine Komponente oder erstelle eine neue.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="config" className="w-full">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="min-w-0 flex-1">
                <Input
                  value={active.name}
                  onChange={(e) => updateActive({ name: e.target.value })}
                  className="font-semibold"
                />
              </div>
              <Button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="gap-2"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Generieren
              </Button>
            </div>

            <TabsList>
              <TabsTrigger value="config">Konfiguration</TabsTrigger>
              <TabsTrigger value="preview">Vorschau</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-4">
              <div className="space-y-4">
                {/* Common: variant + brand kit */}
                <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
                  <div>
                    <label className="text-xs text-muted-foreground">Variante</label>
                    <Select
                      value={active.variant}
                      onValueChange={(v) => updateActive({ variant: v })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(COMPONENT_TYPE_META[active.component_type]?.variants || ["standard"]).map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Brand Kit</label>
                    <Select
                      value={active.brand_kit_id ?? ""}
                      onValueChange={(v) => updateActive({ brand_kit_id: v })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kit wählen" /></SelectTrigger>
                      <SelectContent>
                        {brandKits.map((k) => (
                          <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Type-specific form */}
                {active.component_type === "header" && (
                  <HeaderForm config={active.config || {}} onChange={updateConfig} />
                )}
                {active.component_type === "footer" && (
                  <FooterForm config={active.config || {}} onChange={updateConfig} />
                )}
                {active.component_type === "link_block" && (
                  <LinkBlockForm config={active.config || {}} onChange={updateConfig} />
                )}
                {active.component_type === "cta_bar" && (
                  <CtaBarForm config={active.config || {}} onChange={updateConfig} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="flex gap-1 mb-2">
                <Button
                  size="sm"
                  variant={previewMode === "desktop" ? "default" : "outline"}
                  onClick={() => setPreviewMode("desktop")}
                  className="gap-1.5 h-7 text-xs"
                >
                  <Monitor className="h-3 w-3" /> Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === "mobile" ? "default" : "outline"}
                  onClick={() => setPreviewMode("mobile")}
                  className="gap-1.5 h-7 text-xs"
                >
                  <Smartphone className="h-3 w-3" /> Mobile
                </Button>
              </div>
              <div className="border rounded-lg p-4 bg-muted/30 flex justify-center">
                <iframe
                  srcDoc={previewHtml}
                  title="Komponenten-Vorschau"
                  className="bg-white rounded border"
                  style={{
                    width: previewMode === "mobile" ? 390 : "100%",
                    height: 480,
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="code" className="mt-4">
              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="js">JS</TabsTrigger>
                </TabsList>
                {(["html", "css", "js"] as const).map((kind) => {
                  const code =
                    kind === "html"
                      ? active.html_output || "<!-- Klicke 'Generieren' um HTML zu erzeugen -->"
                      : kind === "css"
                        ? active.css_output || "/* Inline in HTML enthalten */"
                        : active.js_output || "// Keine JS-Logik";
                  return (
                    <TabsContent key={kind} value={kind} className="mt-2">
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2 gap-1.5 h-7 text-xs z-10"
                          onClick={() => {
                            void navigator.clipboard.writeText(code);
                            toast.success("Kopiert");
                          }}
                        >
                          <Copy className="h-3 w-3" /> Kopieren
                        </Button>
                        <pre className="bg-muted font-mono text-xs p-4 rounded-lg overflow-x-auto max-h-[60vh]">
                          <code>{code}</code>
                        </pre>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </TabsContent>

            <TabsContent value="embed" className="mt-4">
              <EmbedTab component={active} firmId={firmId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

/* ───── Create dialog ───── */
function CreateComponentDialog({
  open,
  onOpenChange,
  firmId,
  brandKits,
  activeBrandKitId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  firmId: string | null;
  brandKits: BrandKitLite[];
  activeBrandKitId: string | null;
  onCreated: (c: CompRow) => void;
}) {
  const [type, setType] = useState<string>("header");
  const [variant, setVariant] = useState<string>("standard");
  const [kitId, setKitId] = useState<string>(activeBrandKitId || "");
  const [name, setName] = useState<string>("Neue Komponente");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setKitId(activeBrandKitId || brandKits[0]?.id || "");
      setVariant(COMPONENT_TYPE_META[type]?.variants[0] || "standard");
    }
  }, [open, activeBrandKitId, brandKits, type]);

  const handleCreate = async () => {
    if (!firmId) {
      toast.error("Keine Firma zugeordnet");
      return;
    }
    setCreating(true);
    const meta = COMPONENT_TYPE_META[type];
    const { data, error } = await supabase
      .from("components")
      .insert({
        firm_id: firmId,
        brand_kit_id: kitId || null,
        component_type: type,
        variant,
        name,
        config: meta?.defaultConfig || {},
        is_global: false,
      })
      .select()
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error("Erstellen fehlgeschlagen");
      console.error(error);
      return;
    }
    onCreated(data as CompRow);
    toast.success("Komponente angelegt");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" /> Neu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Komponente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Typ</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(COMPONENT_TYPE_META).map((t) => {
                const Icon = TYPE_ICONS[t];
                const sel = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`p-3 border rounded-lg flex items-center gap-2 text-sm transition ${
                      sel ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Variante</label>
            <div className="flex flex-wrap gap-2">
              {(COMPONENT_TYPE_META[type]?.variants || []).map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={`px-3 py-1.5 text-xs border rounded-full transition ${
                    variant === v ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Brand Kit</label>
            <Select value={kitId} onValueChange={setKitId}>
              <SelectTrigger><SelectValue placeholder="Kit wählen" /></SelectTrigger>
              <SelectContent>
                {brandKits.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={() => void handleCreate()} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Type-specific forms ───── */

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ItemList<T extends Record<string, any>>({
  items,
  onChange,
  fields,
  emptyDefault,
  addLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  fields: Array<{ key: keyof T; label: string; type?: "text" | "url" }>;
  emptyDefault: T;
  addLabel: string;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 p-2 border rounded">
          <div className="flex-1 grid grid-cols-2 gap-2">
            {fields.map((f) => (
              <Input
                key={String(f.key)}
                placeholder={f.label}
                value={String(item[f.key] ?? "")}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], [f.key]: e.target.value };
                  onChange(next);
                }}
                className="h-8 text-xs"
              />
            ))}
          </div>
          <div className="flex flex-col">
            <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground p-0.5">
              <ArrowUp className="h-3 w-3" />
            </button>
            <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground p-0.5">
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-destructive p-1"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange([...items, { ...emptyDefault }])}
        className="gap-1.5 h-7 text-xs"
      >
        <Plus className="h-3 w-3" /> {addLabel}
      </Button>
    </div>
  );
}

function HeaderForm({ config, onChange }: { config: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldRow label="Logo URL">
        <Input value={config.logo_url || ""} onChange={(e) => onChange({ logo_url: e.target.value })} />
      </FieldRow>
      <FieldRow label="Logo Alt-Text">
        <Input value={config.logo_alt || ""} onChange={(e) => onChange({ logo_alt: e.target.value })} />
      </FieldRow>

      <div className="flex items-center gap-3 p-2 border rounded">
        <Switch
          checked={!!config.topbar_active}
          onCheckedChange={(v) => onChange({ topbar_active: v })}
        />
        <span className="text-xs">Topbar aktiv</span>
      </div>
      {config.topbar_active && (
        <FieldRow label="Topbar-Text">
          <Input value={config.topbar_text || ""} onChange={(e) => onChange({ topbar_text: e.target.value })} />
        </FieldRow>
      )}

      <FieldRow label="Navigation-Punkte">
        <ItemList
          items={config.nav_items || []}
          onChange={(v) => onChange({ nav_items: v })}
          fields={[
            { key: "label", label: "Label" },
            { key: "url", label: "URL" },
          ]}
          emptyDefault={{ label: "Neu", url: "#" }}
          addLabel="Punkt hinzufügen"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Telefon">
          <Input value={config.phone || ""} onChange={(e) => onChange({ phone: e.target.value })} />
        </FieldRow>
        <div className="flex items-center gap-2 mt-5">
          <Switch checked={!!config.phone_visible} onCheckedChange={(v) => onChange({ phone_visible: v })} />
          <span className="text-xs">Telefon anzeigen</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="CTA-Text">
          <Input value={config.cta_text || ""} onChange={(e) => onChange({ cta_text: e.target.value })} />
        </FieldRow>
        <FieldRow label="CTA-URL">
          <Input value={config.cta_url || ""} onChange={(e) => onChange({ cta_url: e.target.value })} />
        </FieldRow>
      </div>

      <div className="flex items-center gap-3 p-2 border rounded">
        <Switch checked={!!config.sticky} onCheckedChange={(v) => onChange({ sticky: v })} />
        <span className="text-xs">Sticky (am oberen Rand fixieren)</span>
      </div>
    </div>
  );
}

function FooterForm({ config, onChange }: { config: any; onChange: (p: any) => void }) {
  const columns = config.columns || [];
  return (
    <div className="space-y-4">
      <FieldRow label="Spalten (max 4)">
        <div className="space-y-3">
          {columns.map((col: any, i: number) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={col.title || ""}
                  placeholder="Spaltentitel"
                  onChange={(e) => {
                    const next = [...columns];
                    next[i] = { ...col, title: e.target.value };
                    onChange({ columns: next });
                  }}
                  className="h-8 text-xs font-medium"
                />
                <button
                  onClick={() => onChange({ columns: columns.filter((_: any, idx: number) => idx !== i) })}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <ItemList
                items={col.links || []}
                onChange={(links) => {
                  const next = [...columns];
                  next[i] = { ...col, links };
                  onChange({ columns: next });
                }}
                fields={[
                  { key: "label", label: "Label" },
                  { key: "url", label: "URL" },
                ]}
                emptyDefault={{ label: "Link", url: "#" }}
                addLabel="Link hinzufügen"
              />
            </div>
          ))}
          {columns.length < 4 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange({ columns: [...columns, { title: "Neu", links: [] }] })}
              className="gap-1.5 h-7 text-xs"
            >
              <Plus className="h-3 w-3" /> Spalte hinzufügen
            </Button>
          )}
        </div>
      </FieldRow>

      <div className="flex items-center gap-3 p-2 border rounded">
        <Switch checked={!!config.show_nap} onCheckedChange={(v) => onChange({ show_nap: v })} />
        <span className="text-xs">NAP-Block anzeigen</span>
      </div>
      {config.show_nap && (
        <FieldRow label="NAP-Text (Adresse)">
          <Input value={config.nap_text || ""} onChange={(e) => onChange({ nap_text: e.target.value })} />
        </FieldRow>
      )}

      <div className="flex items-center gap-3 p-2 border rounded">
        <Switch checked={!!config.show_social} onCheckedChange={(v) => onChange({ show_social: v })} />
        <span className="text-xs">Social-Links anzeigen</span>
      </div>
      {config.show_social && (
        <div className="grid grid-cols-2 gap-2 p-3 border rounded">
          {["facebook", "instagram", "google", "linkedin", "youtube"].map((k) => (
            <FieldRow key={k} label={k}>
              <Input
                value={config.social_links?.[k] || ""}
                onChange={(e) =>
                  onChange({ social_links: { ...(config.social_links || {}), [k]: e.target.value } })
                }
                className="h-8 text-xs"
              />
            </FieldRow>
          ))}
        </div>
      )}

      <FieldRow label="Rechtliche Links">
        <ItemList
          items={config.legal_links || []}
          onChange={(v) => onChange({ legal_links: v })}
          fields={[
            { key: "label", label: "Label" },
            { key: "url", label: "URL" },
          ]}
          emptyDefault={{ label: "Impressum", url: "/impressum" }}
          addLabel="Link hinzufügen"
        />
      </FieldRow>

      <FieldRow label="Copyright-Text">
        <Input value={config.copyright_text || ""} onChange={(e) => onChange({ copyright_text: e.target.value })} />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 border rounded">
          <Switch checked={!!config.show_logo} onCheckedChange={(v) => onChange({ show_logo: v })} />
          <span className="text-xs">Logo zeigen</span>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded">
          <Switch checked={!!config.dark_mode} onCheckedChange={(v) => onChange({ dark_mode: v })} />
          <span className="text-xs">Dark Mode</span>
        </div>
      </div>
    </div>
  );
}

function LinkBlockForm({ config, onChange }: { config: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldRow label="Titel">
        <Input value={config.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
      </FieldRow>

      <FieldRow label="Links">
        <ItemList
          items={config.links || []}
          onChange={(v) => onChange({ links: v })}
          fields={[
            { key: "label", label: "Label" },
            { key: "url", label: "URL" },
          ]}
          emptyDefault={{ label: "Link", url: "#" }}
          addLabel="Link hinzufügen"
        />
      </FieldRow>

      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="Layout">
          <Select value={config.layout || "grid"} onValueChange={(v) => onChange({ layout: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="cards">Cards</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Max sichtbar">
          <Input
            type="number"
            min={3}
            max={12}
            value={config.max_visible || 6}
            onChange={(e) => onChange({ max_visible: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </FieldRow>
        <FieldRow label="Border-Style">
          <Select value={config.border_style || "box"} onValueChange={(v) => onChange({ border_style: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="line">Linie</SelectItem>
              <SelectItem value="none">Keine</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>

      <div className="flex items-center gap-3 p-2 border rounded">
        <Switch checked={!!config.show_icons} onCheckedChange={(v) => onChange({ show_icons: v })} />
        <span className="text-xs">Icons anzeigen</span>
      </div>
    </div>
  );
}

function CtaBarForm({ config, onChange }: { config: any; onChange: (p: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldRow label="Text">
        <Input value={config.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="CTA-Label">
          <Input value={config.cta_label || ""} onChange={(e) => onChange({ cta_label: e.target.value })} />
        </FieldRow>
        <FieldRow label="CTA-URL">
          <Input value={config.cta_url || ""} onChange={(e) => onChange({ cta_url: e.target.value })} />
        </FieldRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Hintergrund">
          <Select value={config.background || "primary"} onValueChange={(v) => onChange({ background: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="accent">Accent</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        {config.background === "custom" && (
          <FieldRow label="Custom-Farbe">
            <input
              type="color"
              value={config.custom_bg || "#1d4ed8"}
              onChange={(e) => onChange({ custom_bg: e.target.value })}
              className="h-8 w-full rounded border p-0.5"
            />
          </FieldRow>
        )}
      </div>
      <FieldRow label="Position">
        <Select value={config.position || "top"} onValueChange={(v) => onChange({ position: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Oben</SelectItem>
            <SelectItem value="sticky_bottom">Sticky unten</SelectItem>
            <SelectItem value="floating">Floating</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 border rounded">
          <Switch checked={!!config.dismissible} onCheckedChange={(v) => onChange({ dismissible: v })} />
          <span className="text-xs">Schließbar</span>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded">
          <Switch checked={!!config.mobile_only} onCheckedChange={(v) => onChange({ mobile_only: v })} />
          <span className="text-xs">Nur Mobile</span>
        </div>
      </div>
    </div>
  );
}

/* ───── KI Generate Dialog ───── */
function KiGenerateDialog({
  open,
  onOpenChange,
  firmId,
  brandKits,
  activeBrandKit,
  defaultType,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  firmId: string | null;
  brandKits: BrandKitLite[];
  activeBrandKit: BrandKitLite | null;
  defaultType: string;
  onCreated: (c: CompRow) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<string>(defaultType in COMPONENT_TYPE_META ? defaultType : "header");
  const [kitId, setKitId] = useState<string>(activeBrandKit?.id || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setKitId(activeBrandKit?.id || brandKits[0]?.id || "");
      setType(defaultType in COMPONENT_TYPE_META ? defaultType : "header");
      setPrompt("");
    }
  }, [open, activeBrandKit, brandKits, defaultType]);

  const handleGenerate = async () => {
    if (!firmId) {
      toast.error("Keine Firma zugeordnet");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Bitte Beschreibung eingeben");
      return;
    }
    const kit = brandKits.find((k) => k.id === kitId) || activeBrandKit;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-component", {
        body: {
          prompt,
          component_type: type,
          brand_kit: kit
            ? {
                primary_color: kit.primary_color,
                secondary_color: kit.secondary_color,
                accent_color: kit.accent_color,
                logo_url: kit.logo_url,
                logo_alt: kit.logo_alt,
                name: kit.name,
              }
            : {},
          firm_name: kit?.name || "",
        },
      });
      if (error || !data?.html) {
        toast.error("KI-Generierung fehlgeschlagen");
        console.error(error || data);
        return;
      }
      const { data: newComp, error: insErr } = await supabase
        .from("components")
        .insert({
          firm_id: firmId,
          brand_kit_id: kitId || null,
          component_type: type,
          variant: "ki_generated",
          name: `KI: ${prompt.slice(0, 40)}`,
          html_output: data.html,
          embed_type: "both",
          config: {},
          is_global: false,
        })
        .select()
        .single();
      if (insErr || !newComp) {
        toast.error("Speichern fehlgeschlagen");
        console.error(insErr);
        return;
      }
      onCreated(newComp as CompRow);
      toast.success("Komponente erstellt ✓");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Komponente mit KI erstellen
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Beschreibe die Komponente</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="z.B. Ein moderner Header im Ferrari-Stil mit Mega-Menu für 5 Hauptpunkte, Sticky beim Scrollen, Topbar mit Urgency-Text und WhatsApp-Button"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Komponenten-Typ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(COMPONENT_TYPE_META).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Brand Kit</Label>
              <Select value={kitId} onValueChange={setKitId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Kit wählen" /></SelectTrigger>
                <SelectContent>
                  {brandKits.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={() => void handleGenerate()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Embed Tab ───── */
interface SeoPageRow {
  id: string;
  keyword: string;
  status: string | null;
}

function EmbedTab({
  component,
  firmId,
}: {
  component: CompRow;
  firmId: string | null;
}) {
  const [pages, setPages] = useState<SeoPageRow[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState<"header" | "footer" | "before_content">("header");
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!firmId) {
      setLoadingPages(false);
      return;
    }
    void (async () => {
      setLoadingPages(true);
      const { data } = await supabase
        .from("seo_pages")
        .select("id, keyword, status")
        .eq("firm_id", firmId)
        .order("created_at", { ascending: false });
      setPages((data as SeoPageRow[]) || []);
      setLoadingPages(false);
    })();
  }, [firmId]);

  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const html = component.html_output || "";

  const jsEmbed = `<script>
(function(){
  fetch('${projectUrl}/functions/v1/embed-component?id=${component.embed_id}')
    .then(function(r){ return r.text(); })
    .then(function(html){
      var el = document.createElement('div');
      el.innerHTML = html;
      var s = document.currentScript;
      if (s && s.parentNode && el.firstChild) {
        s.parentNode.insertBefore(el.firstChild, s);
      }
    });
})();
</script>`;

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} kopiert ✓`);
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === pages.length) setSelected(new Set());
    else setSelected(new Set(pages.map((p) => p.id)));
  };

  const apply = async () => {
    if (selected.size === 0) {
      toast.error("Keine Seiten ausgewählt");
      return;
    }
    setApplying(true);
    setProgress(0);
    let i = 0;
    let failed = 0;
    for (const pageId of selected) {
      const { error } = await supabase
        .from("page_components")
        .upsert(
          {
            seo_page_id: pageId,
            component_id: component.id,
            position,
            inject_mode: "replace",
          },
          { onConflict: "seo_page_id,position" },
        );
      if (error) {
        console.error(error);
        failed++;
      }
      i++;
      setProgress(Math.round((i / selected.size) * 100));
    }
    setApplying(false);
    if (failed > 0) {
      toast.error(`${failed} Seite(n) fehlgeschlagen`);
    } else {
      toast.success(`Komponente auf ${selected.size} Seiten angewendet ✓`);
      setSelected(new Set());
    }
  };

  const showJsEmbed = component.embed_type !== "copy_paste";

  return (
    <div className="space-y-6">
      {/* Two embed options */}
      <div className={`grid gap-4 ${showJsEmbed ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="border rounded-lg p-4 space-y-3">
          <div>
            <h4 className="font-medium text-sm">HTML kopieren</h4>
            <p className="text-xs text-muted-foreground">
              Direkt in externe HTML-Seite einbauen.
            </p>
          </div>
          <Textarea
            readOnly
            value={html || "<!-- Erst 'Generieren' klicken -->"}
            rows={6}
            className="font-mono text-[11px]"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(html, "HTML")}
            disabled={!html}
            className="gap-1.5 h-7 text-xs"
          >
            <Copy className="h-3 w-3" /> Code kopieren
          </Button>
        </div>

        {showJsEmbed && (
          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <h4 className="font-medium text-sm">JavaScript Embed</h4>
              <p className="text-xs text-muted-foreground">
                Automatische Updates wenn Komponente geändert.
              </p>
            </div>
            <Textarea
              readOnly
              value={jsEmbed}
              rows={6}
              className="font-mono text-[11px]"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(jsEmbed, "Embed-Code")}
              className="gap-1.5 h-7 text-xs"
            >
              <Copy className="h-3 w-3" /> Embed-Code kopieren
            </Button>
          </div>
        )}
      </div>

      {/* Apply to SEO pages */}
      <div className="border rounded-lg p-4 space-y-4">
        <div>
          <h4 className="font-medium text-sm">Auf SEO-Seiten anwenden</h4>
          <p className="text-xs text-muted-foreground">
            Komponente auf eine oder mehrere bestehende Seiten anwenden.
          </p>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Position</Label>
          <RadioGroup
            value={position}
            onValueChange={(v) => setPosition(v as typeof position)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="header" id="pos-header" />
              <Label htmlFor="pos-header" className="text-xs">Header</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="footer" id="pos-footer" />
              <Label htmlFor="pos-footer" className="text-xs">Footer</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="before_content" id="pos-before" />
              <Label htmlFor="pos-before" className="text-xs">Vor Inhalt</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="border rounded max-h-64 overflow-y-auto">
          {loadingPages ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : pages.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground text-center">
              Keine SEO-Seiten vorhanden.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                <Checkbox
                  checked={selected.size === pages.length && pages.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs">Alle ({pages.length})</span>
              </div>
              {pages.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 p-2 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  <span className="text-xs flex-1 truncate">{p.keyword}</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    {p.status || "draft"}
                  </span>
                </label>
              ))}
            </>
          )}
        </div>

        {applying && (
          <div className="space-y-1">
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        <Button
          onClick={() => void apply()}
          disabled={applying || selected.size === 0}
          className="gap-2 w-full"
        >
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Auf ausgewählte Seiten anwenden ({selected.size})
        </Button>
      </div>
    </div>
  );
}
