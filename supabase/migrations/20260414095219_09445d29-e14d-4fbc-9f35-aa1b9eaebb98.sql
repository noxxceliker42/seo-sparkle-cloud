
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  keyword text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  page_id uuid,
  html_output text,
  json_ld text,
  meta_title text,
  meta_desc text,
  error_message text,
  tokens_used integer,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation jobs"
  ON public.generation_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation jobs"
  ON public.generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generation jobs"
  ON public.generation_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access generation jobs"
  ON public.generation_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_generation_job_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('running', 'completed', 'error') THEN
    RAISE EXCEPTION 'Invalid generation_job status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_generation_job_status
  BEFORE INSERT OR UPDATE ON public.generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_generation_job_status();
