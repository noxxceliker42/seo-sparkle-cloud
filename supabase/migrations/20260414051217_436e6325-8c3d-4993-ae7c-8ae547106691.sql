
CREATE TABLE public.analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mode TEXT NOT NULL DEFAULT 'standard',
  result_json JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_analysis_job_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'running', 'completed', 'error') THEN
    RAISE EXCEPTION 'Invalid analysis_job status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_analysis_job_status
BEFORE INSERT OR UPDATE ON public.analysis_jobs
FOR EACH ROW EXECUTE FUNCTION public.validate_analysis_job_status();

CREATE OR REPLACE FUNCTION public.validate_analysis_job_mode()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mode NOT IN ('standard', 'kieai', 'dataforseo', 'parallel') THEN
    RAISE EXCEPTION 'Invalid analysis_job mode: %', NEW.mode;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_analysis_job_mode
BEFORE INSERT OR UPDATE ON public.analysis_jobs
FOR EACH ROW EXECUTE FUNCTION public.validate_analysis_job_mode();

CREATE TRIGGER update_analysis_jobs_updated_at
BEFORE UPDATE ON public.analysis_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.analysis_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all jobs" ON public.analysis_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own jobs" ON public.analysis_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.analysis_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.analysis_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_analysis_jobs_user_status ON public.analysis_jobs (user_id, status);
