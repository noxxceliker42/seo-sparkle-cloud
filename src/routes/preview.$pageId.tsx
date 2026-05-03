import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/preview/$pageId")({
  component: PreviewPage,
});

function PreviewPage() {
  const { pageId } = Route.useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seo_pages")
        .select("html_output, css_block")
        .eq("id", pageId)
        .single();
      if (data?.html_output) {
        const css = data.css_block ? `<style>${data.css_block}</style>` : "";
        setHtml(css + data.html_output);
      }
      setLoading(false);
    })();
  }, [pageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Lade Vorschau…</p>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Keine HTML-Ausgabe gefunden.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <Link
        to="/studio/editor/$pageId"
        params={{ pageId }}
        className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
      >
        ✏️ Im Editor öffnen
      </Link>
      <iframe
        srcDoc={html}
        className="w-full h-full border-0"
        title="SEO Page Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
