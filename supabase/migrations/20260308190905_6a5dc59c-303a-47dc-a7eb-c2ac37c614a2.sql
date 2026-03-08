
-- 1. Create rent_transactions table
CREATE TABLE public.rent_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  landlord_id uuid NOT NULL,
  amount integer NOT NULL,
  payment_method text NOT NULL DEFAULT 'mpesa',
  mpesa_transaction_code text,
  payment_date date DEFAULT CURRENT_DATE,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rent_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own transactions" ON public.rent_transactions
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can view their transactions" ON public.rent_transactions
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Authenticated users can insert transactions" ON public.rent_transactions
  FOR INSERT WITH CHECK (auth.uid() = tenant_id OR auth.uid() = landlord_id);

CREATE POLICY "Landlords can update transaction status" ON public.rent_transactions
  FOR UPDATE USING (auth.uid() = landlord_id);

-- 2. Create tenant_wallets table
CREATE TABLE public.tenant_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own wallet" ON public.tenant_wallets
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can insert own wallet" ON public.tenant_wallets
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update own wallet" ON public.tenant_wallets
  FOR UPDATE USING (auth.uid() = tenant_id);

-- 3. Add WiFi Installation to service categories (no schema change needed, just data)
-- 4. Add updated_at trigger for rent_transactions
CREATE TRIGGER update_rent_transactions_updated_at
  BEFORE UPDATE ON public.rent_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_wallets_updated_at
  BEFORE UPDATE ON public.tenant_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
