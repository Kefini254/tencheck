
-- Add new fields to tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false;

-- Add new fields to landlords table
ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS property_count integer NOT NULL DEFAULT 0;

-- Add new fields to tenant_scores table
ALTER TABLE public.tenant_scores
  ADD COLUMN IF NOT EXISTS data_sources_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_level text NOT NULL DEFAULT 'low';

-- Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  rental_record_id uuid REFERENCES public.rental_records(id) ON DELETE CASCADE,
  dispute_reason text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS for disputes
CREATE POLICY "Tenants can create disputes" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants can view own disputes" ON public.disputes
  FOR SELECT TO authenticated USING (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all disputes" ON public.disputes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update calculate_tenant_score function with confidence level
CREATE OR REPLACE FUNCTION public.calculate_tenant_score(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _late INTEGER;
  _missed INTEGER;
  _verified INTEGER;
  _score INTEGER;
  _sources INTEGER;
  _confidence TEXT;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN payment_status = 'late' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'missed' THEN 1 ELSE 0 END), 0)
  INTO _late, _missed
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  SELECT COUNT(*) INTO _verified
  FROM public.payment_evidence
  WHERE tenant_id = _tenant_id AND verification_status = 'verified';

  -- Count distinct landlord sources
  SELECT COUNT(DISTINCT landlord_id) INTO _sources
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  _score := 100 - (_late * 5) - (_missed * 15) + (_verified * 2);
  _score := GREATEST(0, LEAST(100, _score));

  -- Determine confidence level
  IF _sources >= 4 THEN
    _confidence := 'high';
  ELSIF _sources >= 2 THEN
    _confidence := 'medium';
  ELSE
    _confidence := 'low';
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
$$;

-- Duplicate detection function
CREATE OR REPLACE FUNCTION public.find_or_create_tenant(_name text, _phone text, _national_id text, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_id uuid;
BEGIN
  -- Check by phone
  SELECT id INTO _existing_id FROM public.tenants 
  WHERE phone = _phone AND _phone IS NOT NULL AND _phone != ''
  LIMIT 1;
  
  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;
  
  -- Check by national_id
  SELECT id INTO _existing_id FROM public.tenants 
  WHERE national_id = _national_id AND _national_id IS NOT NULL AND _national_id != ''
  LIMIT 1;
  
  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;
  
  -- Create new
  INSERT INTO public.tenants (name, phone, national_id, user_id)
  VALUES (_name, _phone, _national_id, _user_id)
  RETURNING id INTO _existing_id;
  
  RETURN _existing_id;
END;
$$;
