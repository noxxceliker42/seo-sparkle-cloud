import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/benutzer")({
  component: BenutzerPage,
  head: () => ({ meta: [{ title: "Benutzerverwaltung – SEO-OS v3.1" }] }),
});

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  firm_id: string | null;
  role: AppRole;
  created_at: string;
}

interface Firm { id: string; name: string; }

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive text-destructive-foreground",
  editor: "bg-blue-600 text-white",
  viewer: "bg-muted text-muted-foreground",
};

function BenutzerPage() {
  const { hasRole, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const isAdmin = hasRole("admin");

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, firmsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("firms").select("id, name").order("name"),
    ]);

    const profiles = (profilesRes.data || []) as Array<{ id: string; email: string; full_name: string | null; firm_id: string | null; created_at: string }>;
    const roles = (rolesRes.data || []) as Array<{ user_id: string; role: string }>;
    const roleMap = new Map<string, AppRole>();
    for (const r of roles) {
      const current = roleMap.get(r.user_id);
      const hierarchy: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };
      if (!current || hierarchy[r.role] > hierarchy[current]) {
        roleMap.set(r.user_id, r.role as AppRole);
      }
    }

    setUsers(profiles.map((p) => ({ ...p, role: roleMap.get(p.id) || "editor" })));
    setFirms((firmsRes.data || []) as Firm[]);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (userId === user?.id) { toast.error("Eigene Rolle kann nicht geändert werden."); return; }
    setSaving(userId);
    // Delete existing roles, insert new
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, role: newRole } : x));
    toast.success("Rolle aktualisiert");
  };

  const handleFirmChange = async (userId: string, firmId: string) => {
    const { error } = await supabase.from("profiles").update({ firm_id: firmId === "none" ? null : firmId }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, firm_id: firmId === "none" ? null : firmId } : x));
    toast.success("Firma zugewiesen");
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive font-semibold text-lg">Kein Zugriff</p>
        <p className="text-muted-foreground mt-2">Diese Seite ist nur für Administratoren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Benutzerverwaltung</h1>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Benutzer…</div>
      ) : users.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">Keine Benutzer.</p></CardContent></Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "–"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    {u.id === user?.id ? (
                      <Badge className={ROLE_COLORS[u.role]}>{u.role}</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as AppRole)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        {saving === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={u.firm_id || "none"} onValueChange={(v) => handleFirmChange(u.id, v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Keine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine</SelectItem>
                        {firms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* SETUP: Ersten User in profiles-Tabelle manuell auf role='admin' setzen.
          Danach kann Admin weitere Rollen über diese UI vergeben. */}
    </div>
  );
}
