
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'landlord')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table (for admin roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'tenant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tenants table (for tenant-specific data like national_id)
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  national_id TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants viewable by authenticated users" ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own tenant record" ON public.tenants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tenant record" ON public.tenants FOR UPDATE USING (auth.uid() = user_id);

-- Landlords table
CREATE TABLE public.landlords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords viewable by authenticated users" ON public.landlords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own landlord record" ON public.landlords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own landlord record" ON public.landlords FOR UPDATE USING (auth.uid() = user_id);

-- Properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  rent_amount INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  images TEXT[] DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Properties are viewable by everyone" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Landlords can create properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords can update their own properties" ON public.properties FOR UPDATE USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords can delete their own properties" ON public.properties FOR DELETE USING (auth.uid() = landlord_id);

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inquiries table
CREATE TABLE public.inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own inquiries" ON public.inquiries FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view inquiries for their properties" ON public.inquiries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = inquiries.property_id AND properties.landlord_id = auth.uid())
);
CREATE POLICY "Tenants can create inquiries" ON public.inquiries FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Landlords can update inquiry status" ON public.inquiries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = inquiries.property_id AND properties.landlord_id = auth.uid())
);

-- Rental records table
CREATE TABLE public.rental_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  rent_amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'late', 'missed', 'pending')),
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own rental records" ON public.rental_records FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view their rental records" ON public.rental_records FOR SELECT USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords can create rental records" ON public.rental_records FOR INSERT WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords can update rental records" ON public.rental_records FOR UPDATE USING (auth.uid() = landlord_id);

-- Payment evidence table
CREATE TABLE public.payment_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_code TEXT,
  amount INTEGER,
  receiver_name TEXT,
  payment_date DATE,
  evidence_type TEXT NOT NULL DEFAULT 'sms' CHECK (evidence_type IN ('sms', 'screenshot')),
  raw_text TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own evidence" ON public.payment_evidence FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can submit evidence" ON public.payment_evidence FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view evidence for their tenants" ON public.payment_evidence FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rental_records rr WHERE rr.tenant_id = payment_evidence.tenant_id AND rr.landlord_id = auth.uid())
);
CREATE POLICY "Admins can view all evidence" ON public.payment_evidence FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update evidence" ON public.payment_evidence FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Tenant scores table
CREATE TABLE public.tenant_scores (
  tenant_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 100 CHECK (score >= 0 AND score <= 100),
  total_payments INTEGER NOT NULL DEFAULT 0,
  late_payments INTEGER NOT NULL DEFAULT 0,
  missed_payments INTEGER NOT NULL DEFAULT 0,
  verified_sms_payments INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scores viewable by authenticated users" ON public.tenant_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can upsert scores" ON public.tenant_scores FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "System can update scores" ON public.tenant_scores FOR UPDATE USING (auth.uid() = tenant_id);

-- Score calculation function
CREATE OR REPLACE FUNCTION public.calculate_tenant_score(_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _late INTEGER;
  _missed INTEGER;
  _verified INTEGER;
  _score INTEGER;
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

  _score := 100 - (_late * 5) - (_missed * 15) + (_verified * 2);
  _score := GREATEST(0, LEAST(100, _score));

  INSERT INTO public.tenant_scores (tenant_id, score, total_payments, late_payments, missed_payments, verified_sms_payments, last_updated)
  VALUES (_tenant_id, _score,
    (SELECT COUNT(*) FROM public.rental_records WHERE tenant_id = _tenant_id),
    _late, _missed, _verified, now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    score = EXCLUDED.score,
    total_payments = EXCLUDED.total_payments,
    late_payments = EXCLUDED.late_payments,
    missed_payments = EXCLUDED.missed_payments,
    verified_sms_payments = EXCLUDED.verified_sms_payments,
    last_updated = now();

  RETURN _score;
END;
$$;

-- Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

CREATE POLICY "Anyone can view property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "Authenticated users can upload property images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images');
CREATE POLICY "Users can delete their own property images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes for performance
CREATE INDEX idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX idx_properties_location ON public.properties(location);
CREATE INDEX idx_inquiries_tenant ON public.inquiries(tenant_id);
CREATE INDEX idx_inquiries_property ON public.inquiries(property_id);
CREATE INDEX idx_rental_records_tenant ON public.rental_records(tenant_id);
CREATE INDEX idx_rental_records_landlord ON public.rental_records(landlord_id);
CREATE INDEX idx_payment_evidence_tenant ON public.payment_evidence(tenant_id);
CREATE INDEX idx_tenants_national_id ON public.tenants(national_id);
CREATE INDEX idx_tenants_phone ON public.tenants(phone);
