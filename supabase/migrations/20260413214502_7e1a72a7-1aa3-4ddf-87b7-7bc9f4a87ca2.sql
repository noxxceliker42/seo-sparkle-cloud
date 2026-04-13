
-- Create table for auto-saved keyword analyses
CREATE TABLE public.seo_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'standard',
  intent TEXT,
  intent_detail TEXT,
  page_type TEXT,
  page_type_why TEXT,
  paa JSONB,
  lsi JSONB,
  secondary_keywords JSONB,
  content_gaps JSONB,
  cluster JSONB,
  schema_recommendation JSONB,
  information_gain_suggestions JSONB,
  discover_angle TEXT,
  volume INTEGER,
  difficulty INTEGER,
  cpc NUMERIC(10,2),
  serp_data JSONB,
  firm_name TEXT,
  city TEXT,
  raw_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view own analyses
CREATE POLICY "Users can view own analyses"
  ON public.seo_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all analyses
CREATE POLICY "Admins can view all analyses"
  ON public.seo_analyses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert own analyses
CREATE POLICY "Users can insert own analyses"
  ON public.seo_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own analyses
CREATE POLICY "Users can delete own analyses"
  ON public.seo_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can delete any analysis
CREATE POLICY "Admins can delete any analysis"
  ON public.seo_analyses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookup
CREATE INDEX idx_seo_analyses_user_keyword ON public.seo_analyses (user_id, keyword);
CREATE INDEX idx_seo_analyses_created ON public.seo_analyses (created_at DESC);
