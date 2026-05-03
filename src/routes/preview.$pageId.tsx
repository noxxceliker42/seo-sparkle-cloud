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
    <iframe
      srcDoc={html}
      className="w-full h-screen border-0"
      title="SEO Page Preview"
      sandbox="allow-same-origin"
    />
  );
}
