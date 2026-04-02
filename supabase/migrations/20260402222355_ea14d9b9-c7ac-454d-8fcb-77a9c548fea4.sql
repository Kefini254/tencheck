
-- 1. Fix profiles: restrict SELECT to own profile or public fields only
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view public fields of others"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
-- Note: We'll use a view approach instead. Let me use column-level restrictions via policy.
-- Actually RLS can't restrict columns, so we keep the broad SELECT but we'll create a safe view.
-- Better approach: restrict to own + admin only for full data, others see via app logic.

-- Actually, let's just restrict it properly:
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public fields of others" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to see basic info of others they have relationships with (threads, tenancies)
CREATE POLICY "Users can view profiles of thread participants"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.thread_participants tp1
      JOIN public.thread_participants tp2 ON tp1.thread_id = tp2.thread_id
      WHERE tp1.user_id = auth.uid() AND tp2.user_id = profiles.user_id
    )
  );

CREATE POLICY "Landlords can view tenant profiles via tenancy"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancy_records tr
      WHERE tr.landlord_id = auth.uid() AND tr.tenant_id = profiles.user_id
    )
  );

CREATE POLICY "Tenants can view landlord profiles via tenancy"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenancy_records tr
      WHERE tr.tenant_id = auth.uid() AND tr.landlord_id = profiles.user_id
    )
  );

-- 2. Fix message-attachments storage policies
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Thread participants can read attachments" ON storage.objects;

CREATE POLICY "Thread participants can view attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.message_attachments ma
      JOIN public.messages m ON m.id = ma.message_id
      JOIN public.thread_participants tp ON tp.thread_id = m.thread_id
      WHERE ma.file_path = name AND tp.user_id = auth.uid()
    )
  );

-- 3. Remove user_service_credits UPDATE policy (credits should only be managed server-side)
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_service_credits;

-- 4. Remove hardcoded admin email from handle_new_user
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

-- 5. Add caller identity checks to SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.calculate_credit_passport(_tenant_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _verified INTEGER;
  _late INTEGER;
  _missed INTEGER;
  _service_completed INTEGER;
  _score INTEGER;
  _sources INTEGER;
  _confidence TEXT;
BEGIN
  -- Access check: only own record or admin
  IF auth.uid() IS NULL OR (auth.uid() != _tenant_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO _verified
  FROM public.rent_transactions
  WHERE tenant_id = _tenant_id AND verification_status = 'confirmed';

  SELECT
    COALESCE(SUM(CASE WHEN payment_status = 'late' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'missed' THEN 1 ELSE 0 END), 0)
  INTO _late, _missed
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  SELECT COUNT(*) INTO _service_completed
  FROM public.service_requests
  WHERE requester_id = _tenant_id AND status = 'completed';

  SELECT COUNT(DISTINCT landlord_id) INTO _sources
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  _score := 50 + (_verified * 2) - (_late * 5) - (_missed * 15) + (_service_completed * 1);
  _score := GREATEST(0, LEAST(100, _score));

  IF _sources > 5 THEN _confidence := 'high';
  ELSIF _sources >= 3 THEN _confidence := 'medium';
  ELSE _confidence := 'low';
  END IF;

  INSERT INTO public.tenant_credit_passport (tenant_id, credit_score, confidence_level, total_verified_rent_payments, late_payments_count, missed_payments_count, total_service_requests_completed, updated_at)
  VALUES (_tenant_id, _score, _confidence, _verified, _late, _missed, _service_completed, now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    credit_score = EXCLUDED.credit_score,
    confidence_level = EXCLUDED.confidence_level,
    total_verified_rent_payments = EXCLUDED.total_verified_rent_payments,
    late_payments_count = EXCLUDED.late_payments_count,
    missed_payments_count = EXCLUDED.missed_payments_count,
    total_service_requests_completed = EXCLUDED.total_service_requests_completed,
    updated_at = now();

  RETURN _score;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_tenant_risk(_tenant_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _late INTEGER;
  _missed INTEGER;
  _verified INTEGER;
  _disputes INTEGER;
  _score INTEGER;
  _category TEXT;
BEGIN
  -- Access check: only own record or admin
  IF auth.uid() IS NULL OR (auth.uid() != _tenant_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN payment_status = 'late' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'missed' THEN 1 ELSE 0 END), 0)
  INTO _late, _missed
  FROM public.rental_records WHERE tenant_id = _tenant_id;

  SELECT COUNT(*) INTO _verified
  FROM public.rent_transactions WHERE tenant_id = _tenant_id AND verification_status = 'confirmed';

  SELECT COUNT(*) INTO _disputes
  FROM public.disputes WHERE tenant_id = _tenant_id;

  _score := ROUND((_late * 0.4) + (_missed * 0.5) - (_verified * 0.3) + (_disputes * 0.5))::integer;
  _score := GREATEST(0, LEAST(100, _score));

  IF _score <= 30 THEN _category := 'low';
  ELSIF _score <= 60 THEN _category := 'medium';
  ELSE _category := 'high';
  END IF;

  INSERT INTO public.tenant_risk (tenant_id, risk_score, risk_category, late_payments_count, missed_payments_count, verified_payments_count, disputes_count, updated_at)
  VALUES (_tenant_id, _score, _category, _late, _missed, _verified, _disputes, now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    risk_category = EXCLUDED.risk_category,
    late_payments_count = EXCLUDED.late_payments_count,
    missed_payments_count = EXCLUDED.missed_payments_count,
    verified_payments_count = EXCLUDED.verified_payments_count,
    disputes_count = EXCLUDED.disputes_count,
    updated_at = now();

  RETURN _score;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_tenant_score(_tenant_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _late INTEGER;
  _missed INTEGER;
  _verified INTEGER;
  _score INTEGER;
  _sources INTEGER;
  _confidence TEXT;
BEGIN
  -- Access check: only own record, admin, or service role (edge functions)
  IF auth.uid() IS NOT NULL AND auth.uid() != _tenant_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN payment_status = 'late' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'missed' THEN 1 ELSE 0 END), 0)
  INTO _late, _missed
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  SELECT COUNT(*) INTO _verified
  FROM public.payment_evidence
  WHERE tenant_id = _tenant_id AND verification_status = 'verified';

  SELECT COUNT(DISTINCT landlord_id) INTO _sources
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  _score := 100 - (_late * 5) - (_missed * 15) + (_verified * 2);
  _score := GREATEST(0, LEAST(100, _score));

  IF _sources >= 4 THEN _confidence := 'high';
  ELSIF _sources >= 2 THEN _confidence := 'medium';
  ELSE _confidence := 'low';
  END IF;

  INSERT INTO public.tenant_scores (tenant_id, score, total_payments, late_payments, missed_payments, verified_sms_payments, data_sources_count, confidence_level, last_updated)
  VALUES (_tenant_id, _score,
    (SELECT COUNT(*) FROM public.rental_records WHERE tenant_id = _tenant_id),
    _late, _missed, _verified, _sources, _confidence, now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    score = EXCLUDED.score,
    total_payments = EXCLUDED.total_payments,
    late_payments = EXCLUDED.late_payments,
    missed_payments = EXCLUDED.missed_payments,
    verified_sms_payments = EXCLUDED.verified_sms_payments,
    data_sources_count = EXCLUDED.data_sources_count,
    confidence_level = EXCLUDED.confidence_level,
    last_updated = now();

  RETURN _score;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_or_create_tenant(_name text, _phone text, _national_id text, _user_id uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _existing_id uuid;
BEGIN
  -- Access check: can only create tenant record for yourself or as admin
  IF auth.uid() IS NULL OR (auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: cannot create tenant record for another user';
  END IF;

  SELECT id INTO _existing_id FROM public.tenants 
  WHERE phone = _phone AND _phone IS NOT NULL AND _phone != ''
  LIMIT 1;
  
  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;
  
  SELECT id INTO _existing_id FROM public.tenants 
  WHERE national_id = _national_id AND _national_id IS NOT NULL AND _national_id != ''
  LIMIT 1;
  
  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;
  
  INSERT INTO public.tenants (name, phone, national_id, user_id)
  VALUES (_name, _phone, _national_id, _user_id)
  RETURNING id INTO _existing_id;
  
  RETURN _existing_id;
END;
$function$;
