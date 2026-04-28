import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DesignTemplate } from "@/types/studio";

function mapRow(row: any): DesignTemplate {
  return {
    ...row,
    design_data: (row.design_data ?? {}) as DesignTemplate["design_data"],
  } as DesignTemplate;
}

export function useDesignTemplates(firmId: string | null | undefined) {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(
    async (componentType?: string) => {
      if (!firmId) {
        setTemplates([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("design_templates")
          .select("*")
          .eq("is_active", true)
          .or(`firm_id.eq.${firmId},is_global.eq.true`);

        if (componentType) query = query.eq("component_type", componentType);

        const { data, error } = await query
          .order("is_favorite", { ascending: false })
          .order("usage_count", { ascending: false });

        if (error) throw error;
        setTemplates((data ?? []).map(mapRow));
      } catch (e: any) {
        setError(e.message ?? "Fehler beim Laden der Templates");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    },
    [firmId]
  );

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const saveAsTemplate = useCallback(
    async (data: Partial<DesignTemplate>) => {
      const { data: user } = await supabase.auth.getUser();
      const payload: any = {
        firm_id: firmId,
        created_by: user.user?.id,
        name: data.name ?? "Unbenanntes Template",
        component_type: data.component_type ?? "section",
        variant: data.variant ?? "standard",
        category: data.category ?? "custom",
        design_philosophy: data.design_philosophy ?? "trust_classic",
        design_data: data.design_data ?? {},
        description: data.description ?? null,
        html_output: data.html_output ?? null,
        css_output: data.css_output ?? null,
        js_output: data.js_output ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        brand_kit_id: data.brand_kit_id ?? null,
        is_global: data.is_global ?? false,
        is_favorite: data.is_favorite ?? false,
        qa_score: data.qa_score ?? 0,
      };
      const { data: row, error } = await supabase
        .from("design_templates")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      const tpl = mapRow(row);
      setTemplates((prev) => [tpl, ...prev]);
      return tpl;
    },
    [firmId]
  );

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from("design_templates").delete().eq("id", id);
    if (error) throw error;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const current = templates.find((t) => t.id === id);
      if (!current) return;
      const next = !current.is_favorite;
      const { error } = await supabase
        .from("design_templates")
        .update({ is_favorite: next })
        .eq("id", id);
      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_favorite: next } : t))
      );
    },
    [templates]
  );

  const incrementUsage = useCallback(
    async (id: string) => {
      const current = templates.find((t) => t.id === id);
      const nextCount = (current?.usage_count ?? 0) + 1;
      const lastUsed = new Date().toISOString();
      const { error } = await supabase
        .from("design_templates")
        .update({ usage_count: nextCount, last_used_at: lastUsed })
        .eq("id", id);
      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, usage_count: nextCount, last_used_at: lastUsed } : t
        )
      );
    },
    [templates]
  );

  const duplicateTemplate = useCallback(
    async (id: string) => {
      const src = templates.find((t) => t.id === id);
      if (!src) throw new Error("Template nicht gefunden");
      return saveAsTemplate({
        ...src,
        name: `${src.name} (Kopie)`,
        is_global: false,
        is_favorite: false,
        usage_count: 0,
        last_used_at: null,
      });
    },
    [templates, saveAsTemplate]
  );

  return {
    templates,
    loading,
    error,
    loadTemplates,
    saveAsTemplate,
    deleteTemplate,
    toggleFavorite,
    incrementUsage,
    duplicateTemplate,
  };
}
