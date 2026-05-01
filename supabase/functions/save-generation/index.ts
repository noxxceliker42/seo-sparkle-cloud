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

    // Resolve userId from JWT if available, fallback to body.userId
    let resolvedUserId: string | null = body.userId || null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace("Bearer ", "")
        );
        if (user?.id) resolvedUserId = user.id;
      } catch (_) { /* keep body fallback */ }
    }

    // ── ACTION: create_job ──────────────────────────────────
    if (action === "create_job") {
      const { jobId, userId, keyword, status, triggeredBy } = body;

      if (!resolvedUserId || !keyword) {
        return jsonResponse({ error: "userId and keyword are required" }, 400);
      }

      const insertData: Record<string, unknown> = {
        user_id: resolvedUserId,
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
      const {
        userId, firmId, mainKeyword, clusterType, branche,
        designPhilosophy, designPhilosophyCustom,
        primaryColor, secondaryColor, accentColor,
        targetAudience, themeContext, differentiation,
        scope, city, region, bundesland, brancheLabel,
      } = body;

      if (!resolvedUserId || !mainKeyword) {
        return jsonResponse({ error: "userId and mainKeyword are required" }, 400);
      }

      const { data: cluster, error } = await supabase
        .from("clusters")
        .insert({
          user_id: resolvedUserId,
          firm_id: firmId || null,
          name: mainKeyword,
          main_keyword: mainKeyword,
          cluster_type: clusterType || "brand_pillar",
          branche: branche || null,
          design_philosophy: designPhilosophy || null,
          design_philosophy_custom: designPhilosophyCustom || null,
          primary_color: primaryColor || null,
          secondary_color: secondaryColor || null,
          accent_color: accentColor || null,
          target_audience: targetAudience || null,
          theme_context: themeContext || null,
          differentiation: differentiation || null,
          sprache: "de",
          status: "planning",
          plan_generated: false,
          scope: scope || "default",
          city: city || null,
          region: region || null,
          bundesland: bundesland || null,
          branche_label: brancheLabel || null,
        })
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
      const { clusterId, clusterName, pages } = body;

      if (!clusterId || !Array.isArray(pages) || pages.length === 0) {
        return jsonResponse({ error: "clusterId and pages[] are required" }, 400);
      }

      const rows = pages.map((p: Record<string, unknown>) => ({
        cluster_id: clusterId,
        user_id: p.user_id || null,
        keyword: p.keyword,
        url_slug: p.url_slug,
        page_type: p.page_type || "supporting_info",
        pillar_tier: p.pillar_tier ?? 2,
        priority: p.priority ?? 99,
        ai_description: p.ai_description || null,
        score_pillar_support: p.score_pillar_support ?? 0,
        score_conversion: p.score_conversion ?? 0,
        score_gap: p.score_gap ?? 0,
        score_trend: p.score_trend ?? 0,
        score_volume: p.score_volume ?? 0,
        score_difficulty: p.score_difficulty ?? 0,
        score_total: p.score_total ?? 0,
        has_sub_cluster_potential: p.has_sub_cluster_potential ?? false,
        status: "planned",
      }));

      const { error: insertErr } = await supabase
        .from("cluster_pages")
        .insert(rows);

      if (insertErr) {
        console.error("save_cluster_plan insert error:", insertErr);
        return jsonResponse({ error: "Failed to insert cluster pages", detail: insertErr.message }, 500);
      }

      const updateData: Record<string, unknown> = {
        plan_generated: true,
        status: "active",
      };
      if (clusterName) updateData.name = clusterName;

      const { error: updateErr } = await supabase
        .from("clusters")
        .update(updateData)
        .eq("id", clusterId);

      if (updateErr) {
        console.error("save_cluster_plan update error:", updateErr);
        return jsonResponse({ error: "Failed to update cluster", detail: updateErr.message }, 500);
      }

      return jsonResponse({ success: true, pageCount: pages.length });
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
          plan_generated: false,
        })
        .eq("id", clusterId);

      if (error) {
        console.error("set_cluster_error error:", error);
        return jsonResponse({ error: "Failed to update cluster", detail: error.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    // ── ACTION: save_component ──────────────────────────────
    if (action === "save_component") {
      const componentJobId = body.componentId || body.jobId;
      if (!componentJobId) {
        return jsonResponse({ error: "componentId (job_id) is required" }, 400);
      }

      const { error: jobErr } = await supabase
        .from("component_jobs")
        .update({
          status: "completed",
          html_output: body.htmlOutput ?? null,
          css_output: body.cssOutput ?? null,
          js_output: body.jsOutput ?? null,
          qa_score: body.qaScore ?? null,
          warnings: body.warnings ?? [],
          tokens_used: body.tokensUsed ?? 0,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", componentJobId);

      if (jobErr) {
        console.error("save_component update error:", jobErr);
        return jsonResponse({ error: "Failed to update component_job", detail: jobErr.message }, 500);
      }

      // Optional: also persist into components table
      if (body.firmId && body.componentType) {
        const { error: compErr } = await supabase.from("components").upsert({
          firm_id: body.firmId,
          brand_kit_id: body.brandKitId || null,
          component_type: body.componentType,
          variant: body.variant || "standard",
          name: body.name || "Unbenannt",
          description: body.description || null,
          html_output: body.htmlOutput ?? null,
          css_output: body.cssOutput ?? null,
          js_output: body.jsOutput ?? null,
          config: body.config || {},
          updated_at: new Date().toISOString(),
        });
        if (compErr) console.error("components upsert error:", compErr);
      }

      return jsonResponse({ success: true, jobId: componentJobId });
    }

    // ── ACTION: component_error ─────────────────────────────
    if (action === "component_error") {
      const componentJobId = body.jobId || body.componentId;
      if (!componentJobId) {
        return jsonResponse({ error: "jobId is required" }, 400);
      }

      const { error: errUpdate } = await supabase
        .from("component_jobs")
        .update({
          status: "error",
          error_message: body.error || body.errorMessage || "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", componentJobId);

      if (errUpdate) {
        console.error("component_error update error:", errUpdate);
        return jsonResponse({ error: "Failed to update component_job", detail: errUpdate.message }, 500);
      }

      return jsonResponse({ success: true, jobId: componentJobId });
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
      firmId,
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

    if (!keyword || !resolvedUserId) {
      return jsonResponse({ error: "keyword and userId are required" }, 400);
    }

    // 1. Upsert seo_pages
    let finalPageId = pageId || null;

    const pageData: Record<string, unknown> = {
      keyword,
      user_id: resolvedUserId,
      firm_id: firmId || null,
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
