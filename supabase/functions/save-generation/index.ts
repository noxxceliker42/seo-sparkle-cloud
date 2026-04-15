import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      jobId,
      keyword,
      html,
      bodyContent,
      cssBlock,
      jsonLd,
      metaTitle,
      metaDesc,
      metaKeywords,
      pageId,
      userId,
      firm,
      city,
      intent,
      pageType,
      designPreset,
      activeSections,
      contaoMode,
      tokensUsed,
      durationSeconds,
      stopReason,
    } = body;

    // Validate required fields
    if (!keyword || !userId) {
      return new Response(
        JSON.stringify({ error: "keyword and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client — bypasses RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Upsert seo_pages
    let finalPageId = pageId || null;

    const pageData: Record<string, unknown> = {
      keyword,
      user_id: userId,
      html_output: html || null,
      body_content: bodyContent || null,
      css_block: cssBlock || null,
      json_ld: jsonLd || null,
      meta_title: metaTitle || null,
      meta_desc: metaDesc || null,
      meta_keywords: metaKeywords || null,
      firm: firm || null,
      city: city || null,
      intent: intent || null,
      page_type: pageType || null,
      design_preset: designPreset || "trust",
      active_sections: activeSections || null,
      contao_mode: contaoMode ?? false,
      status: "draft",
      updated_at: new Date().toISOString(),
    };

    if (finalPageId) {
      // Update existing page
      const { error: updateErr } = await supabase
        .from("seo_pages")
        .update(pageData)
        .eq("id", finalPageId);

      if (updateErr) {
        console.error("seo_pages update error:", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to update seo_pages", detail: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Insert new page
      const { data: newPage, error: insertErr } = await supabase
        .from("seo_pages")
        .insert(pageData)
        .select("id")
        .single();

      if (insertErr) {
        console.error("seo_pages insert error:", insertErr);
        return new Response(
          JSON.stringify({ error: "Failed to insert seo_pages", detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      finalPageId = newPage.id;
    }

    // 2. Update generation_jobs if jobId provided
    if (jobId) {
      const { error: jobErr } = await supabase
        .from("generation_jobs")
        .update({
          status: "completed",
          page_id: finalPageId,
          html_output: html || null,
          body_content: bodyContent || null,
          css_block: cssBlock || null,
          json_ld: jsonLd || null,
          meta_title: metaTitle || null,
          meta_desc: metaDesc || null,
          meta_keywords: metaKeywords || null,
          tokens_used: tokensUsed || null,
          duration_seconds: durationSeconds || null,
          stop_reason: stopReason || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (jobErr) {
        console.error("generation_jobs update error:", jobErr);
        // Non-fatal — page was already saved
      }
    }

    return new Response(
      JSON.stringify({ success: true, pageId: finalPageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-generation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
