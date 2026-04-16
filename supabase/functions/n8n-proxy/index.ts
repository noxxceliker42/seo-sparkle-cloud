import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nicht eingeloggt" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const n8nKey = Deno.env.get("N8N_AUTH_KEY");
    const { webhookPath, webhookType, payload, ...legacyBody } = body;

    // Pick base URL based on webhookType
    let n8nBaseUrl: string | undefined;
    if (webhookType === "cluster-plan") {
      n8nBaseUrl = Deno.env.get("N8N_CLUSTER_PLAN_URL");
      if (!n8nBaseUrl) {
        return new Response(JSON.stringify({ error: "N8N_CLUSTER_PLAN_URL nicht konfiguriert" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      n8nBaseUrl = Deno.env.get("N8N_WEBHOOK_URL");
      if (!n8nBaseUrl) {
        return new Response(JSON.stringify({ error: "N8N_WEBHOOK_URL nicht konfiguriert" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build target URL: base + optional webhookPath
    let targetUrl = n8nBaseUrl;
    if (webhookPath) {
      targetUrl = n8nBaseUrl.replace(/\/+$/, "") + "/" + webhookPath;
    }

    // Use payload if provided (new format), otherwise use legacy body
    const forwardBody = payload
      ? { ...payload, userId: user.id }
      : { ...legacyBody, userId: user.id };

    const n8nRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(n8nKey ? { "X-SEO-OS-Key": n8nKey } : {}),
      },
      body: JSON.stringify(forwardBody),
    });

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      return new Response(JSON.stringify({ error: `n8n ${n8nRes.status}: ${errText}` }), {
        status: n8nRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await n8nRes.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Proxy-Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
