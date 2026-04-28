import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Star, ArrowRight, Loader2 } from "lucide-react";
import { useDesignTemplates } from "@/hooks/useDesignTemplates";
import { supabase } from "@/integrations/supabase/client";
import type { DesignTemplate, ComponentJob } from "@/types/studio";
import { STUDIO_COMPONENT_TYPES, STUDIO_PHILOSOPHIES, getPhilosophyById } from "./designPhilosophies";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  firmId: string | null;
  onPick: (tpl: DesignTemplate) => void;
}

export function TemplatePickerDialog({ open, onOpenChange, firmId, onPick }: Props) {
  const { templates, loading, toggleFavorite } = useDesignTemplates(firmId);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPhilosophy, setFilterPhilosophy] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [recentJobs, setRecentJobs] = useState<ComponentJob[]>([]);

  useEffect(() => {
    if (!open || !firmId) return;
    void (async () => {
      const { data } = await supabase
        .from("component_jobs")
        .select("*")
        .eq("firm_id", firmId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5);
      setRecentJobs((data ?? []) as ComponentJob[]);
    })();
  }, [open, firmId]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (filterType !== "all" && t.component_type !== filterType) return false;
      if (filterPhilosophy !== "all" && t.design_philosophy !== filterPhilosophy) return false;
      if (onlyFavorites && !t.is_favorite) return false;
      return true;
    });
  }, [templates, filterType, filterPhilosophy, onlyFavorites]);

  const globals = filtered.filter((t) => t.is_global);
  const mine = filtered.filter((t) => !t.is_global);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider uppercase">
            Design-Vorlagen
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {STUDIO_COMPONENT_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPhilosophy} onValueChange={setFilterPhilosophy}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Stile</SelectItem>
              {STUDIO_PHILOSOPHIES.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={onlyFavorites ? "default" : "outline"}
            onClick={() => setOnlyFavorites((v) => !v)}
            className="h-8 text-xs gap-1.5"
          >
            <Star className="h-3.5 w-3.5" /> Nur Favoriten
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Lade Vorlagen…
          </div>
        ) : (
          <>
            <Section title="Globale Vorlagen">
              {globals.length === 0
                ? <Empty text="Keine globalen Vorlagen." />
                : <Grid items={globals} onPick={onPick} onToggleFav={toggleFavorite} />}
            </Section>

            <Section title="Meine Vorlagen">
              {mine.length === 0
                ? <Empty text="Du hast noch keine eigenen Vorlagen gespeichert." />
                : <Grid items={mine} onPick={onPick} onToggleFav={toggleFavorite} />}
            </Section>

            <Section title="Kürzlich generiert">
              {recentJobs.length === 0
                ? <Empty text="Keine kürzlichen Generierungen." />
                : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {recentJobs.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => onPick({
                          id: j.id,
                          firm_id: j.firm_id,
                          brand_kit_id: null,
                          created_by: j.user_id,
                          name: j.name ?? `${j.component_type} (Job)`,
                          description: null,
                          component_type: j.component_type,
                          variant: j.variant,
                          category: "custom",
                          thumbnail_url: null,
                          design_philosophy: j.design_philosophy,
                          design_data: {},
                          html_output: j.html_output,
                          css_output: j.css_output,
                          js_output: j.js_output,
                          usage_count: 0,
                          last_used_at: null,
                          qa_score: j.qa_score ?? 0,
                          is_global: false,
                          is_favorite: false,
                          is_active: true,
                          created_at: j.created_at,
                          updated_at: j.completed_at ?? j.created_at,
                        })}
                        className="border border-mc-border bg-mc-panel rounded p-2 text-left hover:border-mc-accent transition"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-mc-accent">
                          {j.component_type}
                        </div>
                        <div className="text-xs font-medium truncate">{j.name ?? "—"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          QA: {j.qa_score ?? "—"}%
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </Section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="font-display text-xs uppercase tracking-[0.2em] text-mc-accent border-b border-mc-border pb-1 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground px-1">{text}</p>;
}

function Grid({
  items, onPick, onToggleFav,
}: {
  items: DesignTemplate[];
  onPick: (t: DesignTemplate) => void;
  onToggleFav: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((t) => {
        const phil = getPhilosophyById(t.design_philosophy);
        return (
          <div key={t.id} className="border border-mc-border bg-mc-panel rounded overflow-hidden flex flex-col">
            <div
              className="h-24 relative flex items-center justify-center"
              style={{
                background: phil
                  ? `linear-gradient(135deg, ${phil.colors[0]}, ${phil.colors[1]})`
                  : "#0d1528",
              }}
            >
              {t.thumbnail_url ? (
                <img src={t.thumbnail_url} alt={t.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex gap-1">
                  {phil?.colors.map((c, i) => (
                    <span key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ background: c }} />
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 flex-1 flex flex-col">
              <div className="text-[10px] uppercase tracking-wider text-mc-accent">
                {t.component_type}
              </div>
              <div className="text-xs font-medium truncate">{t.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                QA: {t.qa_score}% · {t.usage_count}× verwendet
              </div>
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm" variant="outline"
                  className="h-7 px-2"
                  onClick={() => onToggleFav(t.id)}
                >
                  <Star className={`h-3 w-3 ${t.is_favorite ? "fill-mc-accent text-mc-accent" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2 flex-1 gap-1 text-xs"
                  onClick={() => onPick(t)}
                >
                  Verwenden <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
