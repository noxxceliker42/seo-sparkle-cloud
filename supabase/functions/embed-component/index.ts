import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response("Missing id", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("components")
      .select("html_output")
      .eq("embed_id", id)
      .maybeSingle();

    if (error || !data?.html_output) {
      return new Response("<!-- component not found -->", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(data.html_output, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (e) {
    console.error("embed-component error:", e);
    return new Response("<!-- embed error -->", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
