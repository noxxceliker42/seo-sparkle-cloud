import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDesignTemplates } from "@/hooks/useDesignTemplates";
import type { DesignTemplate } from "@/types/studio";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  firmId: string | null;
  defaults: {
    name: string;
    componentType: string;
    variant: string;
    designPhilosophy: string;
    htmlOutput: string | null;
    cssOutput: string | null;
    jsOutput: string | null;
    qaScore: number;
    designData?: DesignTemplate["design_data"];
  };
  onSaved?: (tpl: DesignTemplate) => void;
}

export function SaveTemplateDialog({ open, onOpenChange, firmId, defaults, onSaved }: Props) {
  const { saveAsTemplate } = useDesignTemplates(firmId);
  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"private" | "global">("private");
  const [setDefault, setSetDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Bitte einen Namen vergeben");
      return;
    }
    setSaving(true);
    try {
      const tpl = await saveAsTemplate({
        name: name.trim(),
        description: description.trim() || null,
        component_type: defaults.componentType,
        variant: defaults.variant,
        category: scope === "global" ? "global" : "custom",
        design_philosophy: defaults.designPhilosophy,
        design_data: defaults.designData ?? {},
        html_output: defaults.htmlOutput,
        css_output: defaults.cssOutput,
        js_output: defaults.jsOutput,
        qa_score: defaults.qaScore,
        is_global: scope === "global",
        is_favorite: setDefault,
      });
      toast.success("Vorlage gespeichert");
      onSaved?.(tpl);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider uppercase">
            Als Design-Vorlage speichern
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional…"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Sichtbarkeit</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "private" | "global")}
              className="flex gap-4 mt-2"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="private" /> Nur für mich
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="global" /> Global
              </label>
            </RadioGroup>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={setDefault}
              onCheckedChange={(v) => setSetDefault(Boolean(v))}
            />
            Als Favorit markieren
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
