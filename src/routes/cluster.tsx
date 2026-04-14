import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Network } from "lucide-react";

export const Route = createFileRoute("/cluster")({
  component: ClusterListPage,
  head: () => ({
    meta: [
      { title: "Cluster – SEO-OS v3.1" },
      { name: "description", content: "Alle SEO-Cluster verwalten." },
    ],
  }),
});

interface ClusterRow {
  id: string;
  name: string;
  pillar_keyword: string;
  status: string;
  created_at: string;
  firm_id: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  completed: "Abgeschlossen",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function ClusterListPage() {
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("clusters").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setClusters((data as ClusterRow[]) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Lade Cluster…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cluster</h1>
        <Button asChild className="gap-2">
          <Link to="/cluster/neu">
            <PlusCircle className="h-4 w-4" /> Neuer Cluster
          </Link>
        </Button>
      </div>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-4">
            <Network className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Noch keine Cluster vorhanden.</p>
            <Button asChild>
              <Link to="/cluster/neu">Ersten Cluster erstellen</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster-Name</TableHead>
                <TableHead>Pillar-Keyword</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clusters.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.pillar_keyword}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[c.status] || ""}>
                      {STATUS_LABELS[c.status] || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/cluster/$id" params={{ id: c.id }}>Öffnen</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
