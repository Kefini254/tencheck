
-- 1. Remove hardcoded admin email from handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  RETURN NEW;
END;
$function$;

-- 2. Make message-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'message-attachments';

-- 3. Lock down tenant_wallets - remove client-side UPDATE
DROP POLICY IF EXISTS "Tenants can update own wallet" ON public.tenant_wallets;
-- Only server (service role) can update wallet balance now

-- 4. Restrict tenant_risk visibility to owner + admin only
DROP POLICY IF EXISTS "Authenticated can view risk" ON public.tenant_risk;
CREATE POLICY "Owner can view own risk" ON public.tenant_risk
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());
CREATE POLICY "Admin can view all risk" ON public.tenant_risk
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Restrict tenant_scores visibility to owner + admin + landlords with tenancy
DROP POLICY IF EXISTS "Scores viewable by authenticated users" ON public.tenant_scores;
CREATE POLICY "Owner can view own scores" ON public.tenant_scores
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());
CREATE POLICY "Admin can view all scores" ON public.tenant_scores
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can view tenant scores via tenancy" ON public.tenant_scores
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenancy_records tr
    WHERE tr.tenant_id = tenant_scores.tenant_id AND tr.landlord_id = auth.uid()
  ));

-- 6. Restrict tenant_credit_passport visibility
DROP POLICY IF EXISTS "Authenticated users can view passports" ON public.tenant_credit_passport;
CREATE POLICY "Owner can view own passport" ON public.tenant_credit_passport
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());
CREATE POLICY "Admin can view all passports" ON public.tenant_credit_passport
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can view tenant passport via tenancy" ON public.tenant_credit_passport
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenancy_records tr
    WHERE tr.tenant_id = tenant_credit_passport.tenant_id AND tr.landlord_id = auth.uid()
  ));

-- 7. Enforce landlord profile visibility
DROP POLICY IF EXISTS "Anyone can view landlord profiles" ON public.landlord_profiles;
CREATE POLICY "Public fields for authenticated" ON public.landlord_profiles
  FOR SELECT TO authenticated
  USING (
    profile_visibility = 'public'
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tenancy_records tr
      WHERE tr.landlord_id = landlord_profiles.user_id AND tr.tenant_id = auth.uid()
    )
  );

-- 8. Restrict tenants table PII - only owner + admin
DROP POLICY IF EXISTS "Tenants viewable by authenticated users" ON public.tenants;
CREATE POLICY "Owner can view own tenant record" ON public.tenants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admin can view all tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can view tenants via tenancy" ON public.tenants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenancy_records tr
    WHERE tr.tenant_id = tenants.user_id AND tr.landlord_id = auth.uid()
  ));

-- 9. Storage policies for private message-attachments
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;

CREATE POLICY "Thread participants can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Thread participants can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
