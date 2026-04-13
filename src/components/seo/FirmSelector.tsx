import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Firm {
  id: string;
  name: string;
  city: string | null;
  street: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_area: string | null;
}

interface FirmSelectorProps {
  selectedFirmId: string | null;
  onFirmChange: (firm: Firm | null) => void;
}

const emptyForm = { name: "", city: "", street: "", zip: "", phone: "", email: "", website: "", service_area: "" };

export function FirmSelector({ selectedFirmId, onFirmChange }: FirmSelectorProps) {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const loadFirms = useCallback(async () => {
    const { data } = await supabase.from("firms").select("*").order("name");
    if (data) {
      setFirms(data);
      if (!selectedFirmId && data.length > 0) {
        onFirmChange(data[0]);
      }
    }
  }, [selectedFirmId, onFirmChange]);

  useEffect(() => {
    loadFirms();
  }, [loadFirms]);

  const validate = () => {
    const e: { name?: string; phone?: string } = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Firmenname muss mind. 2 Zeichen haben.";
    if (!form.phone.trim()) e.phone = "Telefon ist ein Pflichtfeld.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        setApiError("Nicht angemeldet. Bitte zuerst einloggen.");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.from("firms").insert({
        user_id: userId,
        name: form.name.trim(),
        city: form.city || null,
        street: form.street || null,
        zip: form.zip || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        service_area: form.service_area || null,
      }).select().single();

      if (error) {
        console.error("Supabase insert error:", error);
        setApiError(error.message || "Fehler beim Speichern.");
        setSaving(false);
        return;
      }

      if (data) {
        setFirms((prev) => [...prev, data]);
        onFirmChange(data);
        toast.success(`Mandant "${data.name}" wurde angelegt`);
        setDialogOpen(false);
        setForm(emptyForm);
        setErrors({});
        setApiError(null);
      }
    } catch (err: unknown) {
      console.error(err);
      setApiError("Unerwarteter Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.name.trim().length >= 2 && form.phone.trim().length > 0;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedFirmId || ""}
        onValueChange={(val) => {
          const firm = firms.find((f) => f.id === val) || null;
          onFirmChange(firm);
        }}
      >
        <SelectTrigger className="h-9 w-[220px] text-sm">
          <SelectValue placeholder="Mandant wählen…" />
        </SelectTrigger>
        <SelectContent>
          {firms.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}{f.city ? ` — ${f.city}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setErrors({}); setApiError(null); }
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Neuer Mandant
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Mandanten anlegen</DialogTitle>
            <DialogDescription>Erfasse die Stammdaten des neuen Mandanten.</DialogDescription>
          </DialogHeader>

          {apiError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {apiError}
            </div>
          )}

          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Firmenname *</Label>
              <Input
                value={form.name}
                onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="z.B. Kurt Reparaturdienst"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Stadt</Label>
                <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Berlin" />
              </div>
              <div>
                <Label className="text-xs">PLZ</Label>
                <Input value={form.zip} onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))} placeholder="10115" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Straße</Label>
              <Input value={form.street} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Telefon *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => { setForm((p) => ({ ...p, phone: e.target.value })); setErrors((p) => ({ ...p, phone: undefined })); }}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label className="text-xs">E-Mail</Label>
                <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Website</Label>
              <Input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Einzugsgebiet</Label>
              <Input value={form.service_area} onChange={(e) => setForm((p) => ({ ...p, service_area: e.target.value }))} placeholder="Berlin & Umland" />
            </div>
            <Button onClick={handleSave} disabled={!isValid || saving} className="mt-2 min-h-[44px]">
              {saving ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</span>
              ) : "Mandant anlegen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
