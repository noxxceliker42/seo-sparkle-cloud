
ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS body_content text,
  ADD COLUMN IF NOT EXISTS css_block text,
  ADD COLUMN IF NOT EXISTS meta_keywords text,
  ADD COLUMN IF NOT EXISTS prompt_used text,
  ADD COLUMN IF NOT EXISTS stop_reason text;

ALTER TABLE seo_pages
  ADD COLUMN IF NOT EXISTS body_content text,
  ADD COLUMN IF NOT EXISTS css_block text,
  ADD COLUMN IF NOT EXISTS meta_keywords text,
  ADD COLUMN IF NOT EXISTS contao_mode boolean DEFAULT false;
