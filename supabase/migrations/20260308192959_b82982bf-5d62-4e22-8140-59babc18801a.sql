
-- Create tenant_credit_passport table
CREATE TABLE public.tenant_credit_passport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  credit_score integer NOT NULL DEFAULT 50,
  confidence_level text NOT NULL DEFAULT 'low',
  total_verified_rent_payments integer NOT NULL DEFAULT 0,
  late_payments_count integer NOT NULL DEFAULT 0,
  missed_payments_count integer NOT NULL DEFAULT 0,
  total_service_requests_completed integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_credit_passport ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own passport" ON public.tenant_credit_passport
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Authenticated users can view passports" ON public.tenant_credit_passport
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can upsert passport" ON public.tenant_credit_passport
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "System can update passport" ON public.tenant_credit_passport
  FOR UPDATE USING (auth.uid() = tenant_id);

-- Create financial_requests table
CREATE TABLE public.financial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  requested_amount integer NOT NULL,
  max_allowed_amount integer DEFAULT 0,
  purpose text NOT NULL DEFAULT 'deposit',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own requests" ON public.financial_requests
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can create requests" ON public.financial_requests
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all requests" ON public.financial_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests" ON public.financial_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Create calculate_credit_passport function
CREATE OR REPLACE FUNCTION public.calculate_credit_passport(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _verified INTEGER;
  _late INTEGER;
  _missed INTEGER;
  _service_completed INTEGER;
  _score INTEGER;
  _sources INTEGER;
  _confidence TEXT;
BEGIN
  -- Count verified rent payments
  SELECT COUNT(*) INTO _verified
  FROM public.rent_transactions
  WHERE tenant_id = _tenant_id AND verification_status = 'confirmed';

  -- Count late and missed from rental_records
  SELECT
    COALESCE(SUM(CASE WHEN payment_status = 'late' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'missed' THEN 1 ELSE 0 END), 0)
  INTO _late, _missed
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  -- Count completed service requests
  SELECT COUNT(*) INTO _service_completed
  FROM public.service_requests
  WHERE requester_id = _tenant_id AND status = 'completed';

  -- Count distinct data sources
  SELECT COUNT(DISTINCT landlord_id) INTO _sources
  FROM public.rental_records
  WHERE tenant_id = _tenant_id;

  -- Calculate score
  _score := 50 + (_verified * 2) - (_late * 5) - (_missed * 15) + (_service_completed * 1);
  _score := GREATEST(0, LEAST(100, _score));

  -- Confidence level
  IF _sources > 5 THEN
    _confidence := 'high';
  ELSIF _sources >= 3 THEN
    _confidence := 'medium';
  ELSE
    _confidence := 'low';
  END IF;

  -- Upsert
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
$$;

-- Add realtime for financial_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_requests;
