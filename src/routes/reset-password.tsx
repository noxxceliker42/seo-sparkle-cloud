import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Neues Passwort – SEO-OS v3.1" }] }),
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    if (password.length < 8) { setError("Mind. 8 Zeichen"); return; }
    if (password !== password2) { setError("Passwörter stimmen nicht überein"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    setTimeout(() => navigate({ to: "/login" }), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Neues Passwort setzen</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200">
              Passwort erfolgreich geändert. Du wirst weitergeleitet…
            </div>
          ) : (
            <>
              <div>
                <Label className="text-sm">Neues Passwort (min. 8 Zeichen)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Passwort wiederholen</Label>
                <Input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} className="mt-1" />
              </div>
              {error && <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
              <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={loading} onClick={handleReset}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Passwort speichern"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
