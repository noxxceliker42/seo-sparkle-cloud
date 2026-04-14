
CREATE TABLE IF NOT EXISTS public.process_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  process_type text NOT NULL,
  step_index integer NOT NULL,
  step_name text NOT NULL,
  status text NOT NULL,
  message text,
  detail jsonb,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_logs_session ON public.process_logs(session_id, step_index);
CREATE INDEX idx_logs_user_date ON public.process_logs(user_id, created_at DESC);

ALTER TABLE public.process_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own logs"
  ON public.process_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_process_log_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.process_type NOT IN ('neue_seite', 'analyse', 'cluster', 'bildgenerierung', 'nanobana') THEN
    RAISE EXCEPTION 'Invalid process_type: %', NEW.process_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_process_log_type_trigger
  BEFORE INSERT OR UPDATE ON public.process_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_process_log_type();

CREATE OR REPLACE FUNCTION public.validate_process_log_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('running', 'success', 'warning', 'error', 'skipped') THEN
    RAISE EXCEPTION 'Invalid process_log status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_process_log_status_trigger
  BEFORE INSERT OR UPDATE ON public.process_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_process_log_status();
