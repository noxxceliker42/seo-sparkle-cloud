-- Create page_images table for the image generation pipeline
CREATE TABLE public.page_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.seo_pages(id) ON DELETE CASCADE,
  slot text NOT NULL,
  slot_label text,
  nano_task_id text,
  nano_status text NOT NULL DEFAULT 'pending',
  nano_prompt text,
  nano_url text,
  cloudinary_url text,
  cloudinary_public_id text,
  alt_text text,
  width integer,
  height integer,
  section_context text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for nano_status
CREATE OR REPLACE FUNCTION public.validate_page_image_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.nano_status NOT IN ('pending', 'generating', 'completed', 'failed', 'uploaded') THEN
    RAISE EXCEPTION 'Invalid nano_status: %', NEW.nano_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_page_image_status_trigger
  BEFORE INSERT OR UPDATE ON public.page_images
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_page_image_status();

-- Updated_at trigger
CREATE TRIGGER update_page_images_updated_at
  BEFORE UPDATE ON public.page_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.page_images ENABLE ROW LEVEL SECURITY;

-- Helper function to check page ownership (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.owns_seo_page(_user_id uuid, _page_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seo_pages
    WHERE id = _page_id AND user_id = _user_id
  )
$$;

-- RLS policies
CREATE POLICY "Users can view own page images"
  ON public.page_images FOR SELECT
  TO authenticated
  USING (public.owns_seo_page(auth.uid(), page_id));

CREATE POLICY "Admins can view all page images"
  ON public.page_images FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own page images"
  ON public.page_images FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_seo_page(auth.uid(), page_id));

CREATE POLICY "Users can update own page images"
  ON public.page_images FOR UPDATE
  TO authenticated
  USING (public.owns_seo_page(auth.uid(), page_id));

CREATE POLICY "Admins can update all page images"
  ON public.page_images FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own page images"
  ON public.page_images FOR DELETE
  TO authenticated
  USING (public.owns_seo_page(auth.uid(), page_id));

CREATE POLICY "Admins can delete all page images"
  ON public.page_images FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));