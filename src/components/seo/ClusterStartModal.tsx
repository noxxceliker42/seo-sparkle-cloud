import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";

interface ClusterStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFirm: {
    id: string;
    name: string;
    city?: string | null;
    service_area?: string | null;
  } | null;
}

const CLUSTER_TYPES = [
  { value: "brand_pillar", label: "Marke + Service" },
  { value: "generic_local", label: "Gerät/Service lokal" },
  { value: "device_cluster", label: "Gerätetyp-fokussiert" },
  { value: "local_cluster", label: "Ortsteil-fokussiert" },
];

const CLUSTER_DEPTHS = [
  { value: "kompakt", label: "Kompakt (15–20 Seiten)" },
  { value: "standard", label: "Standard (25–35 Seiten)" },
  { value: "vollstaendig", label: "Vollständig (40–50 Seiten)" },
];

const LOADING_MESSAGES = [
  { after: 0, text: "Claude analysiert Keywords…" },
  { after: 10000, text: "Cluster-Plan wird aufgebaut…" },
  { after: 20000, text: "Keywords werden zugewiesen…" },
  { after: 30000, text: "Fast fertig…" },
];

export function ClusterStartModal({ open, onOpenChange, activeFirm }: ClusterStartModalProps) {
  const navigate = useNavigate();
  const [mainKeyword, setMainKeyword] = useState("");
  const [clusterType, setClusterType] = useState("brand_pillar");
  const [clusterDepth, setClusterDepth] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startTime = useRef(0);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    msgTimers.current.forEach(clearTimeout);
    msgTimers.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleSubmit = async () => {
    if (!mainKeyword.trim()) return;
    setLoading(true);
    setError(null);
    startTime.current = Date.now();

    // Start loading message rotation
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

      const { data, error: fnError } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          webhookPath: "seo-cluster-plan",
          payload: {
            mainKeyword: mainKeyword.trim(),
            firm: activeFirm?.name || "",
            city: activeFirm?.city || "",
            branche: (activeFirm as any)?.branche || "",
            clusterType,
            clusterDepth,
            userId: session.user.id,
            firmId: activeFirm?.id || null,
          },
        },
      });

      if (fnError) {
        setError(fnError.message || "Fehler beim Starten");
        setLoading(false);
        cleanup();
        return;
      }

      // Start polling for cluster completion
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
          onOpenChange(false);
          navigate({ to: "/cluster/$id", params: { id: latest.id } });
        } else if (latest.status === "error") {
          cleanup();
          setLoading(false);
          setError("Cluster-Generierung fehlgeschlagen. Bitte erneut versuchen.");
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Unbekannter Fehler");
      setLoading(false);
      cleanup();
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Cluster starten</DialogTitle>
          <DialogDescription>
            Erstelle einen thematischen Cluster mit automatischer Keyword-Analyse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Keyword */}
          <div className="space-y-2">
            <Label htmlFor="cluster-keyword">Haupt-Keyword *</Label>
            <Input
              id="cluster-keyword"
              placeholder="z.B. Miele Reparatur Berlin"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Cluster Type */}
          <div className="space-y-2">
            <Label>Cluster-Typ</Label>
            <Select value={clusterType} onValueChange={setClusterType} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLUSTER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cluster Depth */}
          <div className="space-y-2">
            <Label>Cluster-Tiefe</Label>
            <RadioGroup value={clusterDepth} onValueChange={setClusterDepth} disabled={loading}>
              {CLUSTER_DEPTHS.map((d) => (
                <div key={d.value} className="flex items-center gap-2">
                  <RadioGroupItem value={d.value} id={`depth-${d.value}`} />
                  <Label htmlFor={`depth-${d.value}`} className="font-normal cursor-pointer">
                    {d.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Firm info */}
          {activeFirm && (
            <p className="text-xs text-muted-foreground">
              Firma: <span className="font-medium text-foreground">{activeFirm.name}</span>
              {activeFirm.city && ` · ${activeFirm.city}`}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                <Button variant="ghost" size="sm" className="mt-1 h-7 gap-1 px-2" onClick={handleRetry}>
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
          <Button
            onClick={handleSubmit}
            disabled={!mainKeyword.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiere…
              </>
            ) : (
              "Cluster-Plan generieren"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
