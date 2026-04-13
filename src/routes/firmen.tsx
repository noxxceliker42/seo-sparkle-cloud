import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/firmen")({
  component: FirmenPage,
  head: () => ({
    meta: [
      { title: "Firmen-Verwaltung – SEO-OS v3.1" },
      { name: "description", content: "Mandanten und Stammdaten verwalten." },
    ],
  }),
});

interface Firm {
  id: string;
  name: string;
  street: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_area: string | null;
  user_id: string;
}

const emptyFirm = { name: "", street: "", city: "", zip: "", phone: "", email: "", website: "", service_area: "" };

function FirmenPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyFirm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFirms(); }, []);

  const loadFirms = async () => {
    setLoading(true);
    const { data } = await supabase.from("firms").select("*").order("name");
    setFirms((data as Firm[]) || []);
    setLoading(false);
  };

  const openNew = () => { setEditId(null); setForm(emptyFirm); setDialogOpen(true); };

  const openEdit = (firm: Firm) => {
    setEditId(firm.id);
    setForm({
      name: firm.name,
      street: firm.street || "",
      city: firm.city || "",
      zip: firm.zip || "",
      phone: firm.phone || "",
      email: firm.email || "",
      website: firm.website || "",
      service_area: firm.service_area || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || "anonymous";

    if (editId) {
      await supabase.from("firms").update({
        name: form.name, street: form.street || null, city: form.city || null,
        zip: form.zip || null, phone: form.phone || null, email: form.email || null,
        website: form.website || null, service_area: form.service_area || null,
      }).eq("id", editId);
    } else {
      await supabase.from("firms").insert({
        name: form.name, street: form.street || null, city: form.city || null,
        zip: form.zip || null, phone: form.phone || null, email: form.email || null,
        website: form.website || null, service_area: form.service_area || null,
        user_id: userId,
      });
    }
    setSaving(false);
    setDialogOpen(false);
    loadFirms();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Firma wirklich löschen?")) return;
    await supabase.from("firms").delete().eq("id", id);
    setFirms((f) => f.filter((x) => x.id !== id));
  };

  const setField = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Firmen-Verwaltung</h1>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Neue Firma</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Firmen…</div>
      ) : firms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Noch keine Firmen angelegt.</p>
            <Button onClick={openNew} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Erste Firma anlegen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stadt</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firms.map((firm) => (
                <TableRow key={firm.id}>
                  <TableCell className="font-medium">{firm.name}</TableCell>
                  <TableCell>{firm.city || "–"}</TableCell>
                  <TableCell>{firm.phone || "–"}</TableCell>
                  <TableCell className="text-sm">{firm.website || "–"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(firm)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(firm.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Firma bearbeiten" : "Neue Firma"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-4">
            {[
              { key: "name", label: "Firmenname *", required: true },
              { key: "street", label: "Straße + Nr." },
              { key: "zip", label: "PLZ" },
              { key: "city", label: "Stadt" },
              { key: "phone", label: "Telefon" },
              { key: "email", label: "E-Mail" },
              { key: "website", label: "Website" },
              { key: "service_area", label: "Servicegebiet" },
            ].map((f) => (
              <div key={f.key}>
                <Label className="text-sm">{f.label}</Label>
                <Input
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="mt-1"
                />
              </div>
            ))}
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full mt-2">
              {saving ? "Speichern…" : editId ? "Aktualisieren" : "Anlegen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
