import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2, Loader2, Info } from "lucide-react";
import { DesignTab } from "./DesignTab";
import { toast } from "sonner";

export interface Firm {
  id: string;
  name: string;
  city: string | null;
  street: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_area: string | null;
  oeffnungszeiten?: string | null;
  branche?: string | null;
  sprache?: string | null;
  author?: string | null;
  author_title?: string | null;
  author_experience?: number | null;
  author_certs?: string | null;
  rating?: number | null;
  review_count?: number | null;
  design_philosophy?: string | null;
  design_philosophy_custom?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  target_audience?: string | null;
  theme_context?: string | null;
  differentiation?: string | null;
}

interface FirmSelectorProps {
  selectedFirmId: string | null;
  onFirmChange: (firm: Firm | null) => void;
}

const emptyForm = {
  name: "", city: "", street: "", zip: "", phone: "", email: "", website: "", service_area: "",
  oeffnungszeiten: "", branche: "hausgeraete", sprache: "de",
  author: "", author_title: "", author_experience: "", author_certs: "",
  rating: "", review_count: "",
  target_audience: "privatkunden", design_philosophy: "trust_classic", design_philosophy_custom: "",
  primary_color: "#1d4ed8", secondary_color: "#ffffff", accent_color: "#dc2626",
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
      if (!selectedFirmId && data.length > 0) onFirmChange(data[0]);
    }
  }, [selectedFirmId, onFirmChange]);

  useEffect(() => { loadFirms(); }, [loadFirms]);

  const validate = () => {
    const e: { name?: string; phone?: string } = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Mind. 2 Zeichen.";
    if (!form.phone.trim()) e.phone = "Pflichtfeld.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const setField = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (key === "name" || key === "phone") setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) { setApiError("Nicht angemeldet."); setSaving(false); return; }

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
        oeffnungszeiten: form.oeffnungszeiten || null,
        branche: form.branche || "hausgeraete",
        sprache: form.sprache || "de",
        author: form.author || null,
        author_title: form.author_title || null,
        author_experience: form.author_experience ? parseInt(form.author_experience) : null,
        author_certs: form.author_certs || null,
        rating: form.rating ? parseFloat(form.rating) : null,
        review_count: form.review_count ? parseInt(form.review_count) : null,
        target_audience: form.target_audience || "privatkunden",
        design_philosophy: form.design_philosophy || "trust_classic",
        design_philosophy_custom: form.design_philosophy_custom || null,
        primary_color: form.primary_color || "#1d4ed8",
        secondary_color: form.secondary_color || "#ffffff",
        accent_color: form.accent_color || "#dc2626",
      }).select().single();

      if (error) { setApiError(error.message); setSaving(false); return; }

      if (data) {
        setFirms((prev) => [...prev, data]);
        onFirmChange(data);
        toast.success(`Mandant "${data.name}" angelegt`);
        setDialogOpen(false);
        setForm(emptyForm);
        setErrors({});
        setApiError(null);
      }
    } catch {
      setApiError("Unerwarteter Fehler.");
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
            <Plus className="h-3.5 w-3.5" /> Neuer Mandant
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuen Mandanten anlegen</DialogTitle>
            <DialogDescription>Erfasse die Stammdaten des neuen Mandanten.</DialogDescription>
          </DialogHeader>

          {apiError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {apiError}
            </div>
          )}

          <Tabs defaultValue="stammdaten" className="mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
              <TabsTrigger value="betrieb">Betrieb</TabsTrigger>
              <TabsTrigger value="eeat">E-E-A-T</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
            </TabsList>

            <TabsContent value="stammdaten" className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Firmenname *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="z.B. Kurt Reparaturdienst" className={errors.name ? "border-destructive" : ""} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Stadt</Label>
                  <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Berlin" />
                </div>
                <div>
                  <Label className="text-xs">PLZ</Label>
                  <Input value={form.zip} onChange={(e) => setField("zip", e.target.value)} placeholder="10115" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Straße + Nr.</Label>
                <Input value={form.street} onChange={(e) => setField("street", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Telefon *</Label>
                  <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={errors.phone ? "border-destructive" : ""} />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label className="text-xs">E-Mail</Label>
                  <Input value={form.email} onChange={(e) => setField("email", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input value={form.website} onChange={(e) => setField("website", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Servicegebiet / Einzugsgebiet</Label>
                <Input value={form.service_area} onChange={(e) => setField("service_area", e.target.value)} placeholder="Berlin & Umland" />
              </div>
            </TabsContent>

            <TabsContent value="betrieb" className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Öffnungszeiten</Label>
                <Textarea value={form.oeffnungszeiten} onChange={(e) => setField("oeffnungszeiten", e.target.value)} placeholder="Mo–Fr 8–18 Uhr, Sa 9–14 Uhr, So geschlossen" rows={3} />
              </div>
              <div>
                <Label className="text-xs">Branche *</Label>
                <Select value={form.branche} onValueChange={(v) => setField("branche", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCHEN.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sprache</Label>
                <Select value={form.sprache} onValueChange={(v) => setField("sprache", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPRACHEN.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Bewertung (z.B. 4.8)</Label>
                  <Input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={(e) => setField("rating", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Anzahl Bewertungen (z.B. 127)</Label>
                  <Input type="number" value={form.review_count} onChange={(e) => setField("review_count", e.target.value)} min={0} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="eeat" className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Autor / Inhaber Name</Label>
                <Input value={form.author} onChange={(e) => setField("author", e.target.value)} placeholder="z.B. Michael Müller" />
              </div>
              <div>
                <Label className="text-xs">Berufsbezeichnung</Label>
                <Input value={form.author_title} onChange={(e) => setField("author_title", e.target.value)} placeholder="z.B. Geprüfter Hausgerätetechniker" />
              </div>
              <div>
                <Label className="text-xs">Erfahrung in Jahren</Label>
                <Input type="number" value={form.author_experience} onChange={(e) => setField("author_experience", e.target.value)} min={0} placeholder="z.B. 15" />
              </div>
              <div>
                <Label className="text-xs">Zertifikate / Qualifikationen</Label>
                <Textarea value={form.author_certs} onChange={(e) => setField("author_certs", e.target.value)} placeholder="z.B. IHK-zertifiziert, Bosch Service Partner, Miele Fachbetrieb" rows={3} />
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Diese Daten werden für E-E-A-T Signale in den generierten Seiten verwendet.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="design" className="mt-3">
              <DesignTab form={form} setField={setField} />
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} disabled={!isValid || saving} className="mt-3 min-h-[44px] w-full">
            {saving ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</span>
            ) : "Mandant anlegen"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
