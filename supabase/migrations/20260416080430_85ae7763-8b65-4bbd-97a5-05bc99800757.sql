ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS oeffnungszeiten text,
  ADD COLUMN IF NOT EXISTS branche text DEFAULT 'hausgeraete',
  ADD COLUMN IF NOT EXISTS sprache text DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS author_title text,
  ADD COLUMN IF NOT EXISTS author_experience integer,
  ADD COLUMN IF NOT EXISTS author_certs text,
  ADD COLUMN IF NOT EXISTS rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS review_count integer;