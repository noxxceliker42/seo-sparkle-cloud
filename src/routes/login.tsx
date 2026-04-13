import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Anmelden – SEO-OS v3.1" }],
  }),
});

function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate({ to: "/dashboard" });
    return null;
  }

  const [demoEmail, setDemoEmail] = useState("");
  const [demoPw, setDemoPw] = useState("");

  const fillDemo = (email: string, pw: string) => {
    setDemoEmail(email);
    setDemoPw(pw);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center space-y-2 pb-2">
            <h1 className="text-3xl font-bold text-destructive">SEO-OS</h1>
            <p className="text-sm text-muted-foreground">v3.1 — Agentur-System</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="register">Registrieren</TabsTrigger>
              </TabsList>
              <TabsContent value="login"><LoginForm prefillEmail={demoEmail} prefillPassword={demoPw} /></TabsContent>
              <TabsContent value="register"><RegisterForm /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-4 px-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Test-Zugänge</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {[
              { role: "Admin", email: "admin@seo-os.test", pw: "admin12345!", color: "bg-destructive text-destructive-foreground" },
              { role: "Editor", email: "editor@seo-os.test", pw: "editor12345!", color: "bg-primary text-primary-foreground" },
              { role: "Viewer", email: "viewer@seo-os.test", pw: "viewer12345!", color: "bg-muted text-muted-foreground" },
            ].map((d) => (
              <button
                key={d.role}
                type="button"
                className="w-full flex items-center justify-between rounded-md border p-3 text-left hover:bg-accent/50 transition-colors"
                onClick={() => fillDemo(d.email, d.pw)}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.color}`}>{d.role}</span>
                    <span className="text-sm font-medium">{d.email}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Passwort: {d.pw}</p>
                </div>
                <ArrowLeft className="h-3 w-3 rotate-180 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  if (forgotMode) {
    return (
      <div className="space-y-4 pt-4">
        <Button variant="ghost" size="sm" onClick={() => setForgotMode(false)} className="gap-1 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <h3 className="font-semibold">Passwort zurücksetzen</h3>
        {resetSent ? (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200">
            <Mail className="inline h-4 w-4 mr-1" /> Prüfe dein E-Mail-Postfach für den Reset-Link.
          </div>
        ) : (
          <>
            <div>
              <Label className="text-sm">E-Mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="mail@beispiel.de" />
            </div>
            {error && <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
            <Button
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={loading || !email.includes("@")}
              onClick={async () => {
                setLoading(true); setError("");
                const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                setLoading(false);
                if (err) setError(err.message);
                else setResetSent(true);
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset-Link senden"}
            </Button>
          </>
        )}
      </div>
    );
  }

  const handleLogin = async () => {
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="space-y-4 pt-4">
      <div>
        <Label className="text-sm">E-Mail</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="mail@beispiel.de" />
      </div>
      <div>
        <Label className="text-sm">Passwort</Label>
        <div className="relative mt-1">
          <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {error && <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
      <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={loading || !email || !password} onClick={handleLogin}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
      </Button>
      <button type="button" className="text-sm text-muted-foreground hover:text-foreground w-full text-center" onClick={() => setForgotMode(true)}>
        Passwort vergessen?
      </button>
    </div>
  );
}

function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const pwStrength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0;
  const pwMatch = password === password2 && password.length > 0;
  const isValid = fullName.trim().length >= 2 && email.includes("@") && password.length >= 8 && pwMatch;

  const handleRegister = async () => {
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="pt-4 text-center space-y-3">
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200">
          <Mail className="inline h-4 w-4 mr-1" /> Prüfe dein E-Mail-Postfach, um dein Konto zu bestätigen.
        </div>
        <p className="text-xs text-muted-foreground">Nach der Bestätigung erhältst du Editor-Zugang. Admins können Rollen anpassen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div>
        <Label className="text-sm">Vollständiger Name *</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" placeholder="Max Mustermann" />
      </div>
      <div>
        <Label className="text-sm">E-Mail *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="mail@beispiel.de" />
      </div>
      <div>
        <Label className="text-sm">Passwort * (min. 8 Zeichen)</Label>
        <div className="relative mt-1">
          <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="flex gap-1 mt-2">
            {[1, 2, 3].map((l) => (
              <div key={l} className={`h-1 flex-1 rounded ${pwStrength >= l ? (l === 1 ? "bg-destructive" : l === 2 ? "bg-amber-500" : "bg-green-500") : "bg-muted"}`} />
            ))}
          </div>
        )}
      </div>
      <div>
        <Label className="text-sm">Passwort wiederholen *</Label>
        <Input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} className="mt-1" />
        {password2.length > 0 && !pwMatch && <p className="text-xs text-destructive mt-1">Passwörter stimmen nicht überein.</p>}
      </div>
      {error && <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
      <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={loading || !isValid} onClick={handleRegister}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Konto erstellen"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">Nach Registrierung erhältst du Editor-Zugang. Admins können Rollen anpassen.</p>
    </div>
  );
}
