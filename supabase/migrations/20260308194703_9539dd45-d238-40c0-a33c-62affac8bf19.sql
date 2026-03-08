
-- 1. Tenant Risk table
CREATE TABLE public.tenant_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  risk_score integer NOT NULL DEFAULT 50,
  risk_category text NOT NULL DEFAULT 'medium',
  late_payments_count integer NOT NULL DEFAULT 0,
  missed_payments_count integer NOT NULL DEFAULT 0,
  verified_payments_count integer NOT NULL DEFAULT 0,
  disputes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_risk ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX tenant_risk_tenant_id_idx ON public.tenant_risk(tenant_id);

CREATE POLICY "Tenants can view own risk" ON public.tenant_risk FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Authenticated can view risk" ON public.tenant_risk FOR SELECT USING (true);
CREATE POLICY "System can upsert risk" ON public.tenant_risk FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "System can update risk" ON public.tenant_risk FOR UPDATE USING (auth.uid() = tenant_id);

-- 2. Property Demand table
CREATE TABLE public.property_demand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_county text NOT NULL,
  location_city text NOT NULL,
  total_searches integer NOT NULL DEFAULT 0,
  average_rent integer NOT NULL DEFAULT 0,
  vacancy_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_demand ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX property_demand_location_idx ON public.property_demand(location_county, location_city);

CREATE POLICY "Anyone can view demand" ON public.property_demand FOR SELECT USING (true);
CREATE POLICY "Admins can manage demand" ON public.property_demand FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Trust Network table
CREATE TABLE public.trust_network (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  relation_type text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trust_network ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust edges" ON public.trust_network FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Authenticated can view trust" ON public.trust_network FOR SELECT USING (true);
CREATE POLICY "Users can insert trust edges" ON public.trust_network FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update own trust edges" ON public.trust_network FOR UPDATE USING (auth.uid() = from_user_id);

-- 4. Extend disputes table with landlord_id, property_id, dispute_type, resolution_status
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS landlord_id uuid;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS property_id uuid;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS dispute_type text NOT NULL DEFAULT 'payment';
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolution_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 5. Risk score calculation function
CREATE OR REPLACE FUNCTION public.calculate_tenant_risk(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _late INTEGER;
  _missed INTEGER;
  _verified INTEGER;
  _disputes INTEGER;
  _score INTEGER;
  _category TEXT;
BEGIN
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
$$;

-- 6. Property demand calculation function
CREATE OR REPLACE FUNCTION public.refresh_property_demand()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      location as loc,
      COUNT(*) as total,
      ROUND(AVG(rent_amount)) as avg_rent,
      ROUND(SUM(CASE WHEN is_available THEN 1 ELSE 0 END)::numeric / GREATEST(COUNT(*), 1), 2) as vac_rate
    FROM public.properties
    GROUP BY location
  LOOP
    INSERT INTO public.property_demand (location_county, location_city, total_searches, average_rent, vacancy_rate, updated_at)
    VALUES (SPLIT_PART(rec.loc, ',', 2), SPLIT_PART(rec.loc, ',', 1), rec.total, rec.avg_rent, rec.vac_rate, now())
    ON CONFLICT (location_county, location_city) DO UPDATE SET
      total_searches = EXCLUDED.total_searches,
      average_rent = EXCLUDED.average_rent,
      vacancy_rate = EXCLUDED.vacancy_rate,
      updated_at = now();
  END LOOP;
END;
$$;
