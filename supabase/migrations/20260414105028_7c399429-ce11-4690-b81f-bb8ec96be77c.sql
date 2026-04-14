
-- Validation trigger function for saved_analyses status
CREATE OR REPLACE FUNCTION public.validate_saved_analysis_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.analysis_status NOT IN ('running', 'completed', 'error') THEN
    RAISE EXCEPTION 'Invalid saved_analysis status: %', NEW.analysis_status;
  END IF;
  RETURN NEW;
END;
$$;

-- Create saved_analyses table
CREATE TABLE IF NOT EXISTS public.saved_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  keyword text NOT NULL,
  mode text DEFAULT 'standard',
  result_kieai jsonb,
  result_serp jsonb,
  result_volume jsonb,
  form_data jsonb,
  qa_state jsonb,
  generated_html text,
  json_ld text,
  meta_title text,
  meta_desc text,
  page_id uuid REFERENCES public.seo_pages(id) ON DELETE SET NULL,
  analysis_status text DEFAULT 'completed',
  name text,
  tags text[],
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Status validation trigger
CREATE TRIGGER validate_saved_analysis_status_trigger
  BEFORE INSERT OR UPDATE ON public.saved_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_saved_analysis_status();

-- Updated_at trigger
CREATE TRIGGER update_saved_analyses_updated_at
  BEFORE UPDATE ON public.saved_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.saved_analyses ENABLE ROW LEVEL SECURITY;

-- SELECT: own + same firm (agency pool)
CREATE POLICY "agentur_pool_select" ON public.saved_analyses
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      firm_id IS NOT NULL
      AND firm_id IN (
        SELECT p.firm_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.firm_id IS NOT NULL
      )
    )
  );

-- Admin select all
CREATE POLICY "admin_select_all" ON public.saved_analyses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT: own only
CREATE POLICY "own_insert" ON public.saved_analyses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: own or admin
CREATE POLICY "own_or_admin_update" ON public.saved_analyses
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- DELETE: own or admin
CREATE POLICY "own_or_admin_delete" ON public.saved_analyses
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Indexes
CREATE INDEX idx_saved_analyses_firm ON public.saved_analyses(firm_id, created_at DESC);
CREATE INDEX idx_saved_analyses_user ON public.saved_analyses(user_id, created_at DESC);
CREATE INDEX idx_saved_analyses_keyword ON public.saved_analyses(keyword);
