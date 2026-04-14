
-- 1. Create firm_style_profiles table
CREATE TABLE IF NOT EXISTS public.firm_style_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
  style_type text DEFAULT 'hybrid' NOT NULL,
  setting text DEFAULT 'modern German apartment, bright natural daylight, clean space',
  mood text DEFAULT 'trustworthy, clean, professional',
  color_palette text DEFAULT 'white, light grey, blue accent',
  forbidden text DEFAULT 'no faces, no logos, no text, no watermarks, no brand names',
  camera_style text DEFAULT 'front view, eye level, soft bokeh background',
  lighting text DEFAULT 'natural daylight from left, soft fill light',
  hero_style text DEFAULT 'photorealistic',
  section_style text DEFAULT 'illustrative',
  created_at timestamptz DEFAULT now(),
  UNIQUE(firm_id)
);

-- Validation trigger for style_type
CREATE OR REPLACE FUNCTION public.validate_firm_style_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.style_type NOT IN ('photorealistic', 'illustrative', 'neutral', 'hybrid') THEN
    RAISE EXCEPTION 'Invalid style_type: %', NEW.style_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_firm_style_type_trigger
BEFORE INSERT OR UPDATE ON public.firm_style_profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_firm_style_type();

-- RLS for firm_style_profiles
ALTER TABLE public.firm_style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own firm style profiles"
ON public.firm_style_profiles FOR SELECT TO authenticated
USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all firm style profiles"
ON public.firm_style_profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own firm style profiles"
ON public.firm_style_profiles FOR INSERT TO authenticated
WITH CHECK (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own firm style profiles"
ON public.firm_style_profiles FOR UPDATE TO authenticated
USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all firm style profiles"
ON public.firm_style_profiles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Extend image_jobs table with new columns
ALTER TABLE public.image_jobs
  ADD COLUMN IF NOT EXISTS firm_id uuid REFERENCES public.firms(id),
  ADD COLUMN IF NOT EXISTS slot_label text,
  ADD COLUMN IF NOT EXISTS prompt_positive text,
  ADD COLUMN IF NOT EXISTS prompt_negative text,
  ADD COLUMN IF NOT EXISTS style_type text,
  ADD COLUMN IF NOT EXISTS width integer DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS height integer DEFAULT 675,
  ADD COLUMN IF NOT EXISTS variant_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nano_url text,
  ADD COLUMN IF NOT EXISTS cloudinary_url text,
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text,
  ADD COLUMN IF NOT EXISTS alt_text text,
  ADD COLUMN IF NOT EXISTS is_selected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS html_inserted boolean DEFAULT false;

-- Update image_job status validation to include 'archived'
CREATE OR REPLACE FUNCTION public.validate_image_job_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'generating', 'completed', 'failed', 'archived') THEN
    RAISE EXCEPTION 'Invalid image_job status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

-- Add service_role policy for image_jobs (edge functions need it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'image_jobs' AND policyname = 'Service role full access image_jobs'
  ) THEN
    CREATE POLICY "Service role full access image_jobs"
    ON public.image_jobs FOR ALL TO service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add service_role policy for firm_style_profiles
CREATE POLICY "Service role full access firm_style_profiles"
ON public.firm_style_profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_image_jobs_firm ON public.image_jobs(firm_id);
CREATE INDEX IF NOT EXISTS idx_image_jobs_page ON public.image_jobs(page_id);
CREATE INDEX IF NOT EXISTS idx_image_jobs_status ON public.image_jobs(status);
