import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Einstellungen – SEO-OS v3.1" }],
  }),
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API-Konfiguration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            API-Keys (Kie.AI, DataForSEO) werden serverseitig über die Backend-Konfiguration verwaltet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
