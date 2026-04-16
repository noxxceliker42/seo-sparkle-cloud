import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Pencil, Trash2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

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
  oeffnungszeiten: string | null;
  branche: string | null;
  sprache: string | null;
  author: string | null;
  author_title: string | null;
  author_experience: number | null;
  author_certs: string | null;
  rating: number | null;
  review_count: number | null;
}

const emptyFirm = {
  name: "", street: "", city: "", zip: "", phone: "", email: "", website: "", service_area: "",
  oeffnungszeiten: "", branche: "hausgeraete", sprache: "de",
  author: "", author_title: "", author_experience: "", author_certs: "",
  rating: "", review_count: "",
};

const BRANCHEN = [
  { value: "hausgeraete", label: "Haushaltsgeräte Reparatur" },
  { value: "kfz", label: "KFZ / Autowerkstatt" },
  { value: "handwerk", label: "Handwerk / Installation" },
  { value: "immobilien", label: "Immobilien / Makler" },
  { value: "gesundheit", label: "Gesundheit / Medizin" },
  { value: "gastronomie", label: "Gastronomie / Restaurant" },
  { value: "steuer-recht", label: "Steuer / Recht" },
  { value: "it-tech", label: "IT / Technologie" },
  { value: "beauty-wellness", label: "Beauty / Wellness" },
  { value: "bildung", label: "Bildung / Coaching" },
  { value: "ecommerce", label: "E-Commerce / Shop" },
  { value: "bau-sanierung", label: "Bau / Sanierung" },
];

const SPRACHEN = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "Englisch" },
  { value: "tr", label: "Türkisch" },
];

function FirmenPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyFirm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => { loadFirms(); }, []);

  const loadFirms = async () => {
    setLoading(true);
    const { data } = await supabase.from("firms").select("*").order("name");
    setFirms((data as Firm[]) || []);
    setLoading(false);
  };

  const validate = () => {
    const e: { name?: string; phone?: string } = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Mind. 2 Zeichen.";
    if (!form.phone.trim()) e.phone = "Pflichtfeld.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openNew = () => { setEditId(null); setForm(emptyFirm); setErrors({}); setApiError(null); setDialogOpen(true); };

  const openEdit = (firm: Firm) => {
    setEditId(firm.id);
    setErrors({});
    setApiError(null);
    setForm({
      name: firm.name,
      street: firm.street || "",
      city: firm.city || "",
      zip: firm.zip || "",
      phone: firm.phone || "",
      email: firm.email || "",
      website: firm.website || "",
      service_area: firm.service_area || "",
      oeffnungszeiten: firm.oeffnungszeiten || "",
      branche: firm.branche || "hausgeraete",
      sprache: firm.sprache || "de",
      author: firm.author || "",
      author_title: firm.author_title || "",
      author_experience: firm.author_experience?.toString() || "",
      author_certs: firm.author_certs || "",
      rating: firm.rating?.toString() || "",
      review_count: firm.review_count?.toString() || "",
    });
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    street: form.street || null,
    city: form.city || null,
    zip: form.zip || null,
    phone: form.phone || null,
    email: form.email || null,
    website: form.website || null,
    service_area: form.service_area || null,
    oeffnungszeiten: form.oeffnungszeiten || null,
    branche: form.branche || "hausgeraete",
    sprache: form.sprache || "de",
    author: form.author || null,
    author_title: form.author_title || null,
    author_experience: form.author_experience ? parseInt(form.author_experience) : null,
    author_certs: form.author_certs || null,
    rating: form.rating ? parseFloat(form.rating) : null,
    review_count: form.review_count ? parseInt(form.review_count) : null,
  });

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId && !editId) {
        setApiError("Nicht angemeldet.");
        setSaving(false);
        return;
      }

      const payload = buildPayload();

      if (editId) {
        const { error } = await supabase.from("firms").update(payload).eq("id", editId);
        if (error) { setApiError(error.message); setSaving(false); return; }
        toast.success("Firma erfolgreich aktualisiert");
      } else {
        const { error } = await supabase.from("firms").insert({ ...payload, user_id: userId! });
        if (error) { setApiError(error.message); setSaving(false); return; }
        toast.success(`Mandant "${form.name}" angelegt`);
      }

      setSaving(false);
      setDialogOpen(false);
      loadFirms();
    } catch {
      setApiError("Unerwarteter Fehler.");
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Firma wirklich löschen?")) return;
    const { error } = await supabase.from("firms").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setFirms((f) => f.filter((x) => x.id !== id));
    toast.success("Firma gelöscht");
  };

  const setField = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (key === "name" || key === "phone") setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const isValid = form.name.trim().length >= 2 && form.phone.trim().length > 0;

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
                <TableHead>Branche</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firms.map((firm) => (
                <TableRow key={firm.id}>
                  <TableCell className="font-medium">{firm.name}</TableCell>
                  <TableCell>{firm.city || "–"}</TableCell>
                  <TableCell className="text-sm">{BRANCHEN.find(b => b.value === firm.branche)?.label || firm.branche || "–"}</TableCell>
                  <TableCell>{firm.phone || "–"}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Firma bearbeiten" : "Neuen Mandanten anlegen"}</DialogTitle>
          </DialogHeader>

          {apiError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {apiError}
            </div>
          )}

          <Tabs defaultValue="stammdaten" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
              <TabsTrigger value="betrieb">Betrieb</TabsTrigger>
              <TabsTrigger value="eeat">Autor / E-E-A-T</TabsTrigger>
            </TabsList>

            <TabsContent value="stammdaten" className="space-y-3 mt-4">
              <div>
                <Label className="text-sm">Firmenname *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} className={`mt-1 ${errors.name ? "border-destructive" : ""}`} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label className="text-sm">Straße + Nr.</Label>
                <Input value={form.street} onChange={(e) => setField("street", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-sm">PLZ</Label>
                  <Input value={form.zip} onChange={(e) => setField("zip", e.target.value)} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">Stadt</Label>
                  <Input value={form.city} onChange={(e) => setField("city", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Telefon *</Label>
                  <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={`mt-1 ${errors.phone ? "border-destructive" : ""}`} />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label className="text-sm">E-Mail</Label>
                  <Input value={form.email} onChange={(e) => setField("email", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Website</Label>
                <Input value={form.website} onChange={(e) => setField("website", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Servicegebiet / Einzugsgebiet</Label>
                <Input value={form.service_area} onChange={(e) => setField("service_area", e.target.value)} className="mt-1" placeholder="Berlin & Umland" />
              </div>
            </TabsContent>

            <TabsContent value="betrieb" className="space-y-3 mt-4">
              <div>
                <Label className="text-sm">Öffnungszeiten</Label>
                <Textarea
                  value={form.oeffnungszeiten}
                  onChange={(e) => setField("oeffnungszeiten", e.target.value)}
                  placeholder="Mo–Fr 8–18 Uhr, Sa 9–14 Uhr, So geschlossen"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm">Branche *</Label>
                <Select value={form.branche} onValueChange={(v) => setField("branche", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCHEN.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Sprache</Label>
                <Select value={form.sprache} onValueChange={(v) => setField("sprache", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPRACHEN.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Bewertung (z.B. 4.8)</Label>
                  <Input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={(e) => setField("rating", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Anzahl Bewertungen (z.B. 127)</Label>
                  <Input type="number" value={form.review_count} onChange={(e) => setField("review_count", e.target.value)} className="mt-1" min={0} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="eeat" className="space-y-3 mt-4">
              <div>
                <Label className="text-sm">Autor / Inhaber Name</Label>
                <Input value={form.author} onChange={(e) => setField("author", e.target.value)} className="mt-1" placeholder="z.B. Michael Müller" />
              </div>
              <div>
                <Label className="text-sm">Berufsbezeichnung</Label>
                <Input value={form.author_title} onChange={(e) => setField("author_title", e.target.value)} className="mt-1" placeholder="z.B. Geprüfter Hausgerätetechniker" />
              </div>
              <div>
                <Label className="text-sm">Erfahrung in Jahren</Label>
                <Input type="number" value={form.author_experience} onChange={(e) => setField("author_experience", e.target.value)} className="mt-1" min={0} placeholder="z.B. 15" />
              </div>
              <div>
                <Label className="text-sm">Zertifikate / Qualifikationen</Label>
                <Textarea
                  value={form.author_certs}
                  onChange={(e) => setField("author_certs", e.target.value)}
                  placeholder="z.B. IHK-zertifiziert, Bosch Service Partner, Miele Fachbetrieb"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Diese Daten werden für E-E-A-T Signale in den generierten Seiten verwendet.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} disabled={saving || !isValid} className="w-full mt-4 min-h-[44px]">
            {saving ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</span>
            ) : editId ? "Aktualisieren" : "Mandant anlegen"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
