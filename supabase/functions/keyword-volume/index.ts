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
    const { keywords } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: "Keywords-Array ist erforderlich." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (keywords.length > 100) {
      return new Response(
        JSON.stringify({ error: "Maximal 100 Keywords pro Anfrage." }),
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

    const response = await fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{
        keywords: keywords.map((k: string) => k.trim()).filter(Boolean),
        location_code: 1003854,
        language_code: "de",
      }]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DataForSEO keyword-volume error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `DataForSEO Fehler: ${response.status}`, details: errorText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const task = data?.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      return new Response(
        JSON.stringify({ error: task?.status_message || "Suchvolumen-Abfrage fehlgeschlagen", raw: task }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { volume: number; difficulty: number; cpc: number; competition: number }> = {};
    const items = task.result || [];

    for (const item of items) {
      if (item.keyword) {
        results[item.keyword] = {
          volume: item.search_volume || 0,
          difficulty: item.keyword_info?.keyword_difficulty || item.competition_index || 0,
          cpc: item.cpc || 0,
          competition: item.competition || 0,
        };
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("keyword-volume error:", err);
    return new Response(
      JSON.stringify({ error: `Interner Fehler: ${(err as Error).message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
