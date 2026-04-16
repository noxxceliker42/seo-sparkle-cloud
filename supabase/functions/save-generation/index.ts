import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const action = body.action || "save";

    // Service role client — bypasses RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── ACTION: create_job ──────────────────────────────────
    if (action === "create_job") {
      const { jobId, userId, keyword, status, triggeredBy } = body;

      if (!userId || !keyword) {
        return jsonResponse({ error: "userId and keyword are required" }, 400);
      }

      const insertData: Record<string, unknown> = {
        user_id: userId,
        keyword,
        status: status || "running",
        triggered_by: triggeredBy || "n8n",
        created_at: new Date().toISOString(),
      };
      if (jobId) insertData.id = jobId;

      const { data: job, error } = await supabase
        .from("generation_jobs")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        console.error("create_job error:", error);
        return jsonResponse({ error: "Failed to create job", detail: error.message }, 500);
      }

      return jsonResponse({ success: true, jobId: job.id });
    }

    // ── ACTION: set_error ───────────────────────────────────
    if (action === "set_error") {
      const { jobId, errorMessage } = body;

      if (!jobId) {
        return jsonResponse({ error: "jobId is required" }, 400);
      }

      const { error } = await supabase
        .from("generation_jobs")
        .update({
          status: "error",
          error_message: errorMessage || "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) {
        console.error("set_error error:", error);
        return jsonResponse({ error: "Failed to update job", detail: error.message }, 500);
      }

      return jsonResponse({ success: true, jobId });
    }

    // ── ACTION: create_cluster ──────────────────────────────
    if (action === "create_cluster") {
      const { userId, name, mainKeyword, firmId, clusterType, branche, sprache } = body;

      if (!userId || !name || !mainKeyword) {
        return jsonResponse({ error: "userId, name, and mainKeyword are required" }, 400);
      }

      const insertData: Record<string, unknown> = {
        user_id: userId,
        name,
        main_keyword: mainKeyword,
        firm_id: firmId || null,
        cluster_type: clusterType || "brand_pillar",
        branche: branche || "hausgeraete",
        sprache: sprache || "de",
        status: "active",
        plan_generated: false,
        created_at: new Date().toISOString(),
      };

      const { data: cluster, error } = await supabase
        .from("clusters")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        console.error("create_cluster error:", error);
        return jsonResponse({ error: "Failed to create cluster", detail: error.message }, 500);
      }

      return jsonResponse({ success: true, clusterId: cluster.id });
    }

    // ── ACTION: save_cluster_plan ───────────────────────────
    if (action === "save_cluster_plan") {
      const { clusterId, pages } = body;

      if (!clusterId || !Array.isArray(pages) || pages.length === 0) {
        return jsonResponse({ error: "clusterId and pages[] are required" }, 400);
      }

      const rows = pages.map((p: Record<string, unknown>) => ({
        cluster_id: clusterId,
        user_id: p.userId || p.user_id || null,
        keyword: p.keyword,
        url_slug: p.urlSlug || p.url_slug,
        page_type: p.pageType || p.page_type || "supporting_info",
        ai_description: p.aiDescription || p.ai_description || null,
        search_volume: p.searchVolume ?? p.search_volume ?? null,
        keyword_difficulty: p.keywordDifficulty ?? p.keyword_difficulty ?? null,
        cpc: p.cpc ?? null,
        priority: p.priority ?? 99,
        pillar_tier: p.pillarTier ?? p.pillar_tier ?? 2,
        score_volume: p.scoreVolume ?? p.score_volume ?? 0,
        score_difficulty: p.scoreDifficulty ?? p.score_difficulty ?? 0,
        score_trend: p.scoreTrend ?? p.score_trend ?? 0,
        score_gap: p.scoreGap ?? p.score_gap ?? 0,
        score_conversion: p.scoreConversion ?? p.score_conversion ?? 0,
        score_pillar_support: p.scorePillarSupport ?? p.score_pillar_support ?? 0,
        score_total: p.scoreTotal ?? p.score_total ?? 0,
        trend_direction: p.trendDirection || p.trend_direction || null,
        status: "suggested",
        created_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase
        .from("cluster_pages")
        .insert(rows);

      if (insertErr) {
        console.error("save_cluster_plan insert error:", insertErr);
        return jsonResponse({ error: "Failed to insert cluster pages", detail: insertErr.message }, 500);
      }

      const { error: updateErr } = await supabase
        .from("clusters")
        .update({ plan_generated: true })
        .eq("id", clusterId);

      if (updateErr) {
        console.error("save_cluster_plan update error:", updateErr);
        return jsonResponse({ error: "Failed to update cluster", detail: updateErr.message }, 500);
      }

      return jsonResponse({ success: true, clusterId, pagesInserted: rows.length });
    }

    // ── ACTION: set_cluster_error ───────────────────────────
    if (action === "set_cluster_error") {
      const { clusterId, errorMessage } = body;

      if (!clusterId) {
        return jsonResponse({ error: "clusterId is required" }, 400);
      }

      const { error } = await supabase
        .from("clusters")
        .update({
          status: "error",
        })
        .eq("id", clusterId);

      if (error) {
        console.error("set_cluster_error error:", error);
        return jsonResponse({ error: "Failed to update cluster", detail: error.message }, 500);
      }

      return jsonResponse({ success: true, clusterId });
    }

    // ── ACTION: save (default) ──────────────────────────────
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
      tokensUsedAgent,
      tokensUsedSonnet,
      warnings,
      durationSeconds,
      stopReason,
      triggeredBy,
    } = body;

    if (!keyword || !userId) {
      return jsonResponse({ error: "keyword and userId are required" }, 400);
    }

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
      const { error: updateErr } = await supabase
        .from("seo_pages")
        .update(pageData)
        .eq("id", finalPageId);

      if (updateErr) {
        console.error("seo_pages update error:", updateErr);
        return jsonResponse({ error: "Failed to update seo_pages", detail: updateErr.message }, 500);
      }
    } else {
      const { data: newPage, error: insertErr } = await supabase
        .from("seo_pages")
        .insert(pageData)
        .select("id")
        .single();

      if (insertErr) {
        console.error("seo_pages insert error:", insertErr);
        return jsonResponse({ error: "Failed to insert seo_pages", detail: insertErr.message }, 500);
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
          tokens_used_agent: tokensUsedAgent || 0,
          tokens_used_sonnet: tokensUsedSonnet || 0,
          warnings: warnings || "[]",
          duration_seconds: durationSeconds || null,
          stop_reason: stopReason || null,
          triggered_by: triggeredBy || "n8n",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (jobErr) {
        console.error("generation_jobs update error:", jobErr);
      }
    }

    return jsonResponse({ success: true, pageId: finalPageId });
  } catch (err) {
    console.error("save-generation error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
