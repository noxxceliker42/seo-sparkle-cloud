import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface DesignProposal {
  name: string;
  mood: string;
  css: string;
  rules: string[];
  animations: string[];
  textures: string;
  googleFonts: string[];
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
    text: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentType: string;
  branche: string;
  firm: string;
  onPick: (proposal: DesignProposal) => void;
}

const LOADING_STEPS = [
  "KI analysiert deinen Stil…",
  "3 Designs werden erstellt…",
  "Farbpaletten werden abgestimmt…",
];

export function DesignConsultDialog({ open, onOpenChange, componentType, branche, firm, onPick }: Props) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [proposals, setProposals] = useState<DesignProposal[]>([]);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Bitte beschreibe deinen Wunsch-Stil");
      return;
    }
    setLoading(true);
    setStepIdx(0);
    setProposals([]);
    const stepInterval = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 2500);

    try {
      const { data, error } = await supabase.functions.invoke("studio-design-consult", {
        body: {
          userDescription: description,
          componentType,
          branche,
          firm,
        },
      });
      if (error) throw error;
      const list: DesignProposal[] = Array.isArray(data?.proposals) ? data.proposals : [];
      if (list.length === 0) {
        toast.error("Keine Vorschläge erhalten — bitte erneut versuchen");
      } else {
        setProposals(list);
      }
    } catch (e: any) {
      toast.error(e.message ?? "KI-Beratung fehlgeschlagen");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProposals([]);
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            KI Design-Beratung
          </DialogTitle>
          <DialogDescription>
            Beschreibe deinen Wunsch-Stil — die KI erstellt 3 unterschiedliche Vorschläge.
          </DialogDescription>
        </DialogHeader>

        {proposals.length === 0 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider">Dein Wunsch-Stil</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="z.B. Modern, vertrauenswürdig wie eine Bank, aber freundlich und mit Wärme. Premium-Anmutung mit dezentem Gold-Akzent."
                disabled={loading}
              />
            </div>

            {loading && (
              <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                {LOADING_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`flex items-center gap-2 text-sm ${
                      i < stepIdx ? "text-emerald-600" : i === stepIdx ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {i === stepIdx
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <span className="w-3.5 text-center">{i < stepIdx ? "✓" : "◌"}</span>}
                    {s}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Abbrechen
              </Button>
              <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generiere…</>
                  : <><Sparkles className="h-4 w-4" /> 3 Vorschläge generieren</>}
              </Button>
            </div>
          </div>
        )}

        {proposals.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {proposals.map((p, i) => (
                <ProposalCard key={i} proposal={p} onPick={() => { onPick(p); onOpenChange(false); }} />
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleReset}>Neu beschreiben</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProposalCard({ proposal, onPick }: { proposal: DesignProposal; onPick: () => void }) {
  const c = proposal.colors ?? ({} as DesignProposal["colors"]);
  const radius = (proposal.css?.match(/--radius:\s*([^;]+)/)?.[1] ?? "8px").trim();

  return (
    <div className="border rounded-lg p-4 bg-card hover:border-primary transition-colors flex flex-col gap-3">
      <h3 className="font-bold text-base">{proposal.name}</h3>

      <div className="flex gap-1.5">
        {[c.primary, c.primaryDark, c.accent, c.background, c.text].filter(Boolean).map((col, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full border border-border"
            style={{ background: col }}
            title={col}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{proposal.mood}</p>

      {proposal.googleFonts?.length > 0 && (
        <div className="text-[11px]">
          <span className="text-muted-foreground">Fonts: </span>
          <span className="font-medium">{proposal.googleFonts.join(", ")}</span>
        </div>
      )}

      <div className="text-[11px] text-muted-foreground">Radius: {radius}</div>

      {proposal.animations?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {proposal.animations.slice(0, 4).map((a, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {a}
            </span>
          ))}
        </div>
      )}

      <Button size="sm" onClick={onPick} className="mt-auto">Wählen →</Button>
    </div>
  );
}
