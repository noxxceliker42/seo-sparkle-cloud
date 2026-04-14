
-- Clusters table
CREATE TABLE public.clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pillar_keyword TEXT NOT NULL,
  pillar_page_id UUID REFERENCES public.seo_pages(id) ON DELETE SET NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger instead of CHECK for status
CREATE OR REPLACE FUNCTION public.validate_cluster_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'active', 'completed') THEN
    RAISE EXCEPTION 'Invalid cluster status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cluster_status
BEFORE INSERT OR UPDATE ON public.clusters
FOR EACH ROW EXECUTE FUNCTION public.validate_cluster_status();

-- Updated_at trigger
CREATE TRIGGER update_clusters_updated_at
BEFORE UPDATE ON public.clusters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clusters" ON public.clusters FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all clusters" ON public.clusters FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own clusters" ON public.clusters FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clusters" ON public.clusters FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all clusters" ON public.clusters FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own clusters" ON public.clusters FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete all clusters" ON public.clusters FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_clusters_user ON public.clusters (user_id);
CREATE INDEX idx_clusters_firm ON public.clusters (firm_id);

-- Cluster pages table
CREATE TABLE public.cluster_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  page_type TEXT NOT NULL,
  intent TEXT,
  priority TEXT NOT NULL DEFAULT 'recommended',
  reason TEXT,
  content_angle TEXT,
  differentiator TEXT,
  internal_link_anchor TEXT,
  estimated_volume INTEGER,
  estimated_difficulty INTEGER,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  seo_page_id UUID REFERENCES public.seo_pages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation triggers for cluster_pages
CREATE OR REPLACE FUNCTION public.validate_cluster_page_type()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.page_type NOT IN ('pillar', 'supporting_info', 'supporting_commercial', 'transactional_local', 'deep_page') THEN
    RAISE EXCEPTION 'Invalid page_type: %', NEW.page_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cluster_page_type
BEFORE INSERT OR UPDATE ON public.cluster_pages
FOR EACH ROW EXECUTE FUNCTION public.validate_cluster_page_type();

CREATE OR REPLACE FUNCTION public.validate_cluster_page_priority()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.priority NOT IN ('must_have', 'recommended', 'optional') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cluster_page_priority
BEFORE INSERT OR UPDATE ON public.cluster_pages
FOR EACH ROW EXECUTE FUNCTION public.validate_cluster_page_priority();

CREATE OR REPLACE FUNCTION public.validate_cluster_page_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('suggested', 'approved', 'rejected', 'generating', 'generated', 'published') THEN
    RAISE EXCEPTION 'Invalid cluster page status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cluster_page_status
BEFORE INSERT OR UPDATE ON public.cluster_pages
FOR EACH ROW EXECUTE FUNCTION public.validate_cluster_page_status();

CREATE TRIGGER update_cluster_pages_updated_at
BEFORE UPDATE ON public.cluster_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: cluster_pages access follows cluster ownership
ALTER TABLE public.cluster_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cluster pages" ON public.cluster_pages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clusters WHERE id = cluster_id AND user_id = auth.uid()));
CREATE POLICY "Admins can view all cluster pages" ON public.cluster_pages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own cluster pages" ON public.cluster_pages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clusters WHERE id = cluster_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own cluster pages" ON public.cluster_pages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clusters WHERE id = cluster_id AND user_id = auth.uid()));
CREATE POLICY "Admins can update all cluster pages" ON public.cluster_pages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own cluster pages" ON public.cluster_pages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clusters WHERE id = cluster_id AND user_id = auth.uid()));
CREATE POLICY "Admins can delete all cluster pages" ON public.cluster_pages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_cluster_pages_cluster ON public.cluster_pages (cluster_id);
CREATE INDEX idx_cluster_pages_status ON public.cluster_pages (status);
CREATE INDEX idx_cluster_pages_seo_page ON public.cluster_pages (seo_page_id);
