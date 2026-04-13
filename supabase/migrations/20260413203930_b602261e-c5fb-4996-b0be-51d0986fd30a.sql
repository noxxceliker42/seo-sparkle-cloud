
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Trigger function: auto-create profile + editor role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'editor');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Profiles timestamp trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 8. RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Update firms RLS: drop old policies, create new ones
DROP POLICY IF EXISTS "Users can view their own firms" ON public.firms;
DROP POLICY IF EXISTS "Users can create their own firms" ON public.firms;
DROP POLICY IF EXISTS "Users can update their own firms" ON public.firms;
DROP POLICY IF EXISTS "Users can delete their own firms" ON public.firms;

CREATE POLICY "Authenticated users can view firms"
  ON public.firms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and editors can insert firms"
  ON public.firms FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Admins and editors can update firms"
  ON public.firms FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'editor') AND auth.uid() = user_id)
  );

CREATE POLICY "Admins and editors can delete firms"
  ON public.firms FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'editor') AND auth.uid() = user_id)
  );

-- 10. Update seo_pages RLS
DROP POLICY IF EXISTS "Users can view their own seo_pages" ON public.seo_pages;
DROP POLICY IF EXISTS "Users can create their own seo_pages" ON public.seo_pages;
DROP POLICY IF EXISTS "Users can update their own seo_pages" ON public.seo_pages;
DROP POLICY IF EXISTS "Users can delete their own seo_pages" ON public.seo_pages;

CREATE POLICY "Admins can view all seo_pages"
  ON public.seo_pages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own seo_pages"
  ON public.seo_pages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and editors can insert seo_pages"
  ON public.seo_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) AND auth.uid() = user_id
  );

CREATE POLICY "Admins and editors can update seo_pages"
  ON public.seo_pages FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'editor') AND auth.uid() = user_id)
  );

CREATE POLICY "Only admins can delete seo_pages"
  ON public.seo_pages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
