import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/profil")({
  component: ProfilPage,
  head: () => ({ meta: [{ title: "Mein Profil – SEO-OS v3.1" }] }),
});

function ProfilPage() {
  const { user, profile, role, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => { if (profile?.full_name) setFullName(profile.full_name); }, [profile]);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success("Name aktualisiert");
  };

  const handleChangePw = async () => {
    if (newPw.length < 8) { toast.error("Mind. 8 Zeichen"); return; }
    if (newPw !== newPw2) { toast.error("Passwörter stimmen nicht überein"); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { toast.error(error.message); return; }
    setNewPw(""); setNewPw2("");
    toast.success("Passwort geändert");
  };

  const initials = (fullName || profile?.email || "U").slice(0, 2).toUpperCase();
  const roleColor = role === "admin" ? "bg-destructive" : role === "editor" ? "bg-blue-600" : "bg-muted-foreground";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mein Profil</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className={`h-16 w-16 rounded-full ${roleColor} flex items-center justify-center text-white text-xl font-bold`}>
          {initials}
        </div>
        <div>
          <p className="font-semibold text-foreground">{profile?.full_name || "–"}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Name ändern</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm">Vollständiger Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={handleSaveName} disabled={saving || !fullName.trim()} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Passwort ändern</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm">Neues Passwort (min. 8 Zeichen)</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Passwort wiederholen</Label>
            <Input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} className="mt-1" />
            {newPw2 && newPw !== newPw2 && <p className="text-xs text-destructive mt-1">Stimmt nicht überein.</p>}
          </div>
          <Button onClick={handleChangePw} disabled={pwSaving || newPw.length < 8 || newPw !== newPw2} size="sm">
            {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Passwort ändern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
