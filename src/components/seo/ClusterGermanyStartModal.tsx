import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { BRANCHEN_GROUPS, BUNDESLAENDER } from "@/lib/clusterGermanyConstants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFirm: {
    id: string;
    name: string;
    city?: string | null;
    branche?: string | null;
  } | null;
}

const DEPTHS = [
  { value: "kompakt", label: "Kompakt (10–15 Seiten)" },
  { value: "standard", label: "Standard (20–30 Seiten)" },
  { value: "vollstaendig", label: "Vollständig (35–50 Seiten)" },
];

const LOADING_MESSAGES = [
  { after: 0, text: "Claude analysiert Keywords…" },
  { after: 10000, text: "Cluster-Plan wird aufgebaut…" },
  { after: 20000, text: "Keywords werden zugewiesen…" },
  { after: 30000, text: "Fast fertig…" },
];

export function ClusterGermanyStartModal({ open, onOpenChange, activeFirm }: Props) {
  const navigate = useNavigate();
  const [mainKeyword, setMainKeyword] = useState("");
  const [branche, setBranche] = useState("");
  const [city, setCity] = useState("");
  const [bundesland, setBundesland] = useState("");
  const [clusterDepth, setClusterDepth] = useState("standard");
  const [customTerms, setCustomTerms] = useState("");
  const [customFehler, setCustomFehler] = useState("");
  const [customDeep, setCustomDeep] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (open) {
      setMainKeyword("");
      setBranche("");
      setCity("");
      setBundesland("");
      setClusterDepth("standard");
      setCustomTerms("");
      setCustomFehler("");
      setCustomDeep("");
      setError(null);
    }
  }, [open]);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    msgTimers.current.forEach(clearTimeout);
    msgTimers.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const brancheLabel = (() => {
    for (const g of BRANCHEN_GROUPS) {
      const found = g.items.find((i) => i.value === branche);
      if (found) return found.label;
    }
    return branche;
  })();

  const canSubmit = mainKeyword.trim() && branche && city.trim() && (branche !== "custom" || customTerms.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    setLoadingMsg(LOADING_MESSAGES[0].text);
    LOADING_MESSAGES.slice(1).forEach((m) => {
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

      const payload: Record<string, unknown> = {
        mainKeyword: mainKeyword.trim(),
        branche,
        brancheLabel,
        city: city.trim(),
        region: city.trim(),
        bundesland: bundesland || undefined,
        clusterDepth,
        clusterType: "brand_pillar",
        scope: "germany",
        firm: activeFirm?.name || "",
        firmId: activeFirm?.id || null,
        userId: session.user.id,
      };

      if (branche === "custom") {
        payload.customBrancheTerms = customTerms.trim();
        payload.customFehlercodeHint = customFehler.trim();
        payload.customDeepHint = customDeep.trim();
      }

      const { error: fnError } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          webhookType: "cluster-germany-plan",
          payload,
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
          .select("id, status, plan_generated, scope")
          .eq("user_id", userId)
          .eq("scope", "germany")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!clusters || clusters.length === 0) return;
        const latest = clusters[0];

        if (latest.plan_generated === true && latest.status === "active") {
          cleanup();
          setLoading(false);
          onOpenChange(false);
          navigate({ to: "/cluster-germany/$id", params: { id: latest.id } });
        } else if (latest.status === "error") {
          cleanup();
          setLoading(false);
          setError("Cluster-Generierung fehlgeschlagen. Bitte erneut versuchen.");
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuen Cluster Germany starten</DialogTitle>
          <DialogDescription>
            Erstelle einen branchenübergreifenden Cluster für eine deutsche Stadt/Region.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Keyword */}
          <div className="space-y-2">
            <Label htmlFor="cg-keyword">Haupt-Keyword *</Label>
            <Input
              id="cg-keyword"
              placeholder='z.B. "Zahnarzt Implantate München"'
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Branche */}
          <div className="space-y-2">
            <Label>Branche *</Label>
            <Select value={branche} onValueChange={setBranche} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Branche auswählen…" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {BRANCHEN_GROUPS.map((g) => (
                  <SelectGroup key={g.label}>
                    <SelectLabel>{g.label}</SelectLabel>
                    {g.items.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stadt */}
          <div className="space-y-2">
            <Label htmlFor="cg-city">Stadt / Region *</Label>
            <Input
              id="cg-city"
              placeholder='z.B. "München", "Hamburg", "Köln"'
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Bundesland */}
          <div className="space-y-2">
            <Label>Bundesland (optional)</Label>
            <Select value={bundesland} onValueChange={setBundesland} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Bundesland wählen…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Kein Bundesland —</SelectItem>
                {BUNDESLAENDER.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Depth */}
          <div className="space-y-2">
            <Label>Cluster-Tiefe</Label>
            <RadioGroup value={clusterDepth} onValueChange={setClusterDepth} disabled={loading}>
              {DEPTHS.map((d) => (
                <div key={d.value} className="flex items-center gap-2">
                  <RadioGroupItem value={d.value} id={`cg-depth-${d.value}`} />
                  <Label htmlFor={`cg-depth-${d.value}`} className="font-normal cursor-pointer">{d.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom branche fields */}
          {branche === "custom" && (
            <div className="space-y-3 border-t pt-3">
              <div className="space-y-2">
                <Label>Branchenbegriffe *</Label>
                <Input
                  placeholder="Kommasepariert: Begriff1, Begriff2, …"
                  value={customTerms}
                  onChange={(e) => setCustomTerms(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Typische Probleme / Fehlercodes</Label>
                <Textarea
                  placeholder="z.B. Häufige Reklamationen, Garantiefälle"
                  value={customFehler}
                  onChange={(e) => setCustomFehler(e.target.value)}
                  rows={2}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Unterthemen / Deep Pages</Label>
                <Textarea
                  placeholder="z.B. Produktvarianten, Modelle, Techniken"
                  value={customDeep}
                  onChange={(e) => setCustomDeep(e.target.value)}
                  rows={2}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Firm info */}
          {activeFirm && (
            <p className="text-xs text-muted-foreground">
              Firma: <span className="font-medium text-foreground">{activeFirm.name}</span>
            </p>
          )}

          {/* Error */}
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

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {loadingMsg}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || loading} className="flex-1">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiere…</>
              ) : (
                "🚀 Plan generieren"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
