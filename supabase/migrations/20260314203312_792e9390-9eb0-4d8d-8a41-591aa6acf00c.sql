
-- 1. Landlord verification table
CREATE TABLE IF NOT EXISTS public.landlord_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  document_url text NOT NULL,
  document_type text NOT NULL DEFAULT 'property_ownership',
  verification_status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landlord_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can insert own verification" ON public.landlord_verification
  FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can view own verification" ON public.landlord_verification
  FOR SELECT TO authenticated USING (landlord_id = auth.uid());

CREATE POLICY "Admins can manage verification" ON public.landlord_verification
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Account deletion fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_status text NOT NULL DEFAULT 'active';

-- 3. Admin can delete users (mark as deleted)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Alert on landlord verification submission
CREATE OR REPLACE FUNCTION public.alert_on_landlord_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
  VALUES ('landlord_verification', 'Landlord submitted verification document: ' || NEW.document_type, NEW.landlord_id, 'landlord_verification', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_landlord_verification ON public.landlord_verification;
CREATE TRIGGER trg_alert_landlord_verification
  AFTER INSERT ON public.landlord_verification
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_landlord_verification();

-- 5. Ensure handle_new_user saves actual role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'tenant');
  IF _role NOT IN ('tenant', 'landlord', 'service_worker') THEN
    _role := 'tenant';
  END IF;
  
  INSERT INTO public.profiles (user_id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    _role
  );
  
  IF NEW.email = 'com08522@uoeld.ac.ke' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
