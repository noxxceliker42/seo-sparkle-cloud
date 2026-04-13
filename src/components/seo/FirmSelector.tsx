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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2 } from "lucide-react";

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

export function FirmSelector({ selectedFirmId, onFirmChange }: FirmSelectorProps) {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    street: "",
    zip: "",
    phone: "",
    email: "",
    website: "",
    service_area: "",
  });

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

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase.from("firms").insert({
      user_id: user.id,
      name: form.name.trim(),
      city: form.city || null,
      street: form.street || null,
      zip: form.zip || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      service_area: form.service_area || null,
    }).select().single();

    if (!error && data) {
      setFirms((prev) => [...prev, data]);
      onFirmChange(data);
      setDialogOpen(false);
      setForm({ name: "", city: "", street: "", zip: "", phone: "", email: "", website: "", service_area: "" });
    }
    setSaving(false);
  };

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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Neuer Mandant
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Mandanten anlegen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Firmenname *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="z.B. Kurt Reparaturdienst" />
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
                <Label className="text-xs">Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
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
            <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="mt-2 min-h-[44px]">
              {saving ? "Speichern…" : "Mandant anlegen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
