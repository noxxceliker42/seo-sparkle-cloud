
ALTER TABLE public.image_jobs
  ADD COLUMN IF NOT EXISTS mode text DEFAULT 'text-to-image',
  ADD COLUMN IF NOT EXISTS reference_image_url text,
  ADD COLUMN IF NOT EXISTS edit_strength numeric(3,2);

-- Replace the existing status validation trigger to also validate mode
CREATE OR REPLACE FUNCTION public.validate_image_job_mode()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mode IS NOT NULL AND NEW.mode NOT IN ('text-to-image', 'image-to-image', 'image-edit') THEN
    RAISE EXCEPTION 'Invalid image_job mode: %', NEW.mode;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_image_job_mode_trigger
  BEFORE INSERT OR UPDATE ON public.image_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_image_job_mode();
