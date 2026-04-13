CREATE TABLE public.seo_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  firm TEXT,
  city TEXT,
  intent TEXT,
  page_type TEXT,
  html_output TEXT,
  json_ld TEXT,
  meta_title TEXT,
  meta_desc TEXT,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  design_preset TEXT DEFAULT 'trust',
  active_sections JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seo_pages" ON public.seo_pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own seo_pages" ON public.seo_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own seo_pages" ON public.seo_pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own seo_pages" ON public.seo_pages FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.firms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  street TEXT,
  city TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  service_area TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own firms" ON public.firms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own firms" ON public.firms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own firms" ON public.firms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own firms" ON public.firms FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();