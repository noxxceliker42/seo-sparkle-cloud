import { Outlet, Link, createRootRoute, HeadContent, Scripts, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth, type AppRole } from "@/hooks/useAuth";
import { AnalysisProvider, useAnalysis } from "@/context/AnalysisContext";
import { Toaster } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, Users } from "lucide-react";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Seite nicht gefunden</h2>
        <p className="mt-2 text-sm text-muted-foreground">Die gesuchte Seite existiert nicht.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SEO-OS v3.1" },
      { name: "description", content: "SEO-OS: Dein Betriebssystem für SEO-Analyse und Seitengenerierung." },
      { property: "og:title", content: "SEO-OS v3.1" },
      { name: "twitter:title", content: "SEO-OS v3.1" },
      { property: "og:description", content: "SEO-OS: Dein Betriebssystem für SEO-Analyse und Seitengenerierung." },
      { name: "twitter:description", content: "SEO-OS: Dein Betriebssystem für SEO-Analyse und Seitengenerierung." },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <AuthGate />
      </AnalysisProvider>
      <Toaster />
    </AuthProvider>
  );
}

// Public routes that don't need auth
const PUBLIC_ROUTES = ["/login", "/reset-password"];

function AuthGate() {
  const { isAuthenticated, loading, role, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();

  // Show nothing while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-destructive">SEO-OS</h1>
          <p className="text-sm text-muted-foreground">Wird geladen…</p>
        </div>
      </div>
    );
  }

  // Check current path for public routes
  const isPublicRoute = PUBLIC_ROUTES.some((r) => window.location.pathname.startsWith(r));

  if (!isAuthenticated && !isPublicRoute) {
    // Redirect to login
    navigate({ to: "/login" });
    return null;
  }

  // Public routes render without shell
  if (isPublicRoute) {
    return <Outlet />;
  }

  // Role-based access check
  const path = window.location.pathname;
  const minRoleForPath = getMinRole(path);
  if (minRoleForPath && !hasMinRoleCheck(role, minRoleForPath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-destructive mb-2">Kein Zugriff</h1>
          <p className="text-muted-foreground mb-6">Du hast nicht die erforderliche Berechtigung für diese Seite.</p>
          <Link to="/dashboard" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const initials = (profile?.full_name || profile?.email || "U").slice(0, 2).toUpperCase();
  const roleColor = role === "admin" ? "bg-destructive" : role === "editor" ? "bg-blue-600" : "bg-muted-foreground";
  const roleBadgeColor = role === "admin" ? "bg-destructive text-destructive-foreground" : role === "editor" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="mr-3" />
              <span className="text-sm font-semibold text-foreground">SEO-OS v3.1</span>
              <AnalysisStatusBadge />
            </div>
            <div className="flex items-center gap-2">
              <Badge className={roleBadgeColor + " text-xs capitalize"}>{role}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`h-8 w-8 rounded-full ${roleColor} flex items-center justify-center text-white text-xs font-bold cursor-pointer`}>
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate({ to: "/profil" })}>
                    <User className="h-4 w-4 mr-2" /> Mein Profil
                  </DropdownMenuItem>
                  {hasRole("admin") && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/benutzer" })}>
                      <Users className="h-4 w-4 mr-2" /> Benutzer verwalten
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function getMinRole(path: string): AppRole | null {
  if (path.startsWith("/benutzer")) return "admin";
  if (path === "/" || path.startsWith("/firmen")) return "editor";
  // dashboard, cluster, settings, profil → viewer
  return "viewer";
}

const ROLE_HIERARCHY: Record<AppRole, number> = { viewer: 0, editor: 1, admin: 2 };

function hasMinRoleCheck(userRole: AppRole | null, minRole: AppRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

function AnalysisStatusBadge() {
  const { isRunning, keyword, result } = useAnalysis();

  if (isRunning) {
    return (
      <span className="ml-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Analyse läuft
      </span>
    );
  }

  if (result && keyword) {
    return (
      <span className="ml-3 text-[11px] font-bold text-green-600">
        ✓ „{keyword}" analysiert
      </span>
    );
  }

  return null;
}
