
-- 1. Create service_worker_profiles table
CREATE TABLE public.service_worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_category text NOT NULL,
  description text,
  years_experience integer DEFAULT 0,
  city text,
  latitude double precision,
  longitude double precision,
  verification_status text NOT NULL DEFAULT 'pending',
  identity_document_url text,
  phone_verified boolean DEFAULT false,
  landlord_endorsements_count integer DEFAULT 0,
  rating_score numeric DEFAULT 0,
  jobs_completed integer DEFAULT 0,
  visibility_status text NOT NULL DEFAULT 'hidden',
  availability_status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.service_worker_profiles ENABLE ROW LEVEL SECURITY;

-- Workers can view and edit their own profile
CREATE POLICY "Workers can view own profile" ON public.service_worker_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Workers can insert own profile" ON public.service_worker_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers can update own profile" ON public.service_worker_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Public can view visible workers (public or limited)
CREATE POLICY "Public can view visible workers" ON public.service_worker_profiles
  FOR SELECT USING (visibility_status IN ('public', 'limited'));

-- Admins can manage all
CREATE POLICY "Admins can manage worker profiles" ON public.service_worker_profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 2. Add columns to service_requests
ALTER TABLE public.service_requests 
  ADD COLUMN IF NOT EXISTS worker_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS review text;

-- Allow workers to update service_requests (accept, complete)
CREATE POLICY "Workers can update assigned requests" ON public.service_requests
  FOR UPDATE TO authenticated USING (worker_id = auth.uid());

-- Workers can view requests matching them
CREATE POLICY "Workers can view assigned requests" ON public.service_requests
  FOR SELECT TO authenticated USING (worker_id = auth.uid());

-- 3. Create worker_reviews table
CREATE TABLE public.worker_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.worker_reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can create reviews" ON public.worker_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- 4. Function to update worker rating automatically
CREATE OR REPLACE FUNCTION public.update_worker_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.service_worker_profiles
  SET rating_score = (
    SELECT COALESCE(AVG(rating), 0)
    FROM public.worker_reviews
    WHERE worker_id = NEW.worker_id
  ),
  updated_at = now()
  WHERE user_id = NEW.worker_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_worker_rating_on_review
  AFTER INSERT ON public.worker_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_worker_rating();

-- 5. Function to update visibility based on verification + jobs
CREATE OR REPLACE FUNCTION public.update_worker_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.verification_status = 'pending' OR NEW.verification_status = 'suspended' THEN
    NEW.visibility_status := 'hidden';
  ELSIF NEW.verification_status = 'verified' AND NEW.jobs_completed < 3 THEN
    NEW.visibility_status := 'limited';
  ELSIF NEW.verification_status = 'verified' AND NEW.jobs_completed >= 3 THEN
    NEW.visibility_status := 'public';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_update_worker_visibility
  BEFORE INSERT OR UPDATE ON public.service_worker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_worker_visibility();

-- 6. Create storage bucket for identity documents
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-documents', 'worker-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Workers can upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'worker-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Workers can view own docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'worker-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all worker docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'worker-documents' AND has_role(auth.uid(), 'admin'));
