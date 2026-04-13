import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword, location_code } = await req.json();

    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Keyword ist erforderlich." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const login = Deno.env.get("DATAFORSEO_LOGIN");
    const password = Deno.env.get("DATAFORSEO_PASSWORD");
    if (!login || !password) {
      return new Response(
        JSON.stringify({ error: "DataForSEO Zugangsdaten nicht konfiguriert." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encoded = btoa(`${login}:${password}`);

    const response = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{
        keyword: keyword.trim(),
        location_code: location_code || 1003854,
        language_code: "de",
        device: "desktop",
        depth: 10,
      }]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DataForSEO SERP error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `DataForSEO Fehler: ${response.status}`, details: errorText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const task = data?.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      return new Response(
        JSON.stringify({ error: task?.status_message || "SERP-Abfrage fehlgeschlagen", raw: task }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = task.result?.[0]?.items || [];

    // Extract People Also Ask
    const paa_verified = items
      .filter((item: { type: string }) => item.type === "people_also_ask" || item.type === "people_also_ask_element")
      .flatMap((item: { items?: Array<{ title?: string; url?: string; description?: string }>; title?: string }) => {
        if (item.items && Array.isArray(item.items)) {
          return item.items.map((sub: { title?: string; url?: string; description?: string }) => ({
            question: sub.title || "",
            url: sub.url || "",
            snippet: sub.description || "",
          }));
        }
        return [{ question: item.title || "", url: "", snippet: "" }];
      });

    // Extract top 10 organic results
    const top_urls = items
      .filter((item: { type: string }) => item.type === "organic")
      .slice(0, 10)
      .map((item: { url?: string; title?: string; description?: string; rank_absolute?: number }) => ({
        url: item.url || "",
        title: item.title || "",
        description: item.description || "",
        position: item.rank_absolute || 0,
      }));

    // Extract related searches
    const related = items
      .filter((item: { type: string }) => item.type === "related_searches")
      .flatMap((item: { items?: Array<{ title?: string }> }) => {
        if (item.items && Array.isArray(item.items)) {
          return item.items.map((sub: { title?: string }) => sub.title || "");
        }
        return [];
      });

    return new Response(
      JSON.stringify({
        success: true,
        keyword: keyword.trim(),
        paa_verified: paa_verified,
        top_urls: top_urls,
        related: related,
        total_results: task.result?.[0]?.se_results_count || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("serp-data error:", err);
    return new Response(
      JSON.stringify({ error: `Interner Fehler: ${(err as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
