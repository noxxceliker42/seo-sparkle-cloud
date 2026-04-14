
CREATE TABLE IF NOT EXISTS public.image_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  task_id text,
  status text DEFAULT 'pending',
  image_url text,
  page_id uuid REFERENCES public.seo_pages(id) ON DELETE SET NULL,
  slot text DEFAULT 'hero',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_image_job_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'generating', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid image_job status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_image_job_status_trigger
  BEFORE INSERT OR UPDATE ON public.image_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_image_job_status();

-- RLS policies
CREATE POLICY "Users can view own image jobs"
  ON public.image_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own image jobs"
  ON public.image_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own image jobs"
  ON public.image_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access image jobs"
  ON public.image_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);
