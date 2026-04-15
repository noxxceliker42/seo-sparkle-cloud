ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS tokens_used_agent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_used_sonnet integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warnings text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS triggered_by text DEFAULT 'supabase';