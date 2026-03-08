
-- Service workers table
CREATE TABLE public.service_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  service_category TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  landlord_endorser_id UUID,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service requests table
CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  service_category TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Worker endorsements table
CREATE TABLE public.worker_endorsements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.service_workers(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  endorsement_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_endorsements ENABLE ROW LEVEL SECURITY;

-- service_workers policies
CREATE POLICY "Anyone can view verified workers" ON public.service_workers FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Landlords can view all workers" ON public.service_workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create worker profiles" ON public.service_workers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workers can update own profile" ON public.service_workers FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- service_requests policies
CREATE POLICY "Authenticated users can create requests" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can view their own requests" ON public.service_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "Anyone can view open requests" ON public.service_requests FOR SELECT USING (status = 'open');

-- worker_endorsements policies
CREATE POLICY "Anyone can view endorsements" ON public.worker_endorsements FOR SELECT USING (true);
CREATE POLICY "Landlords can create endorsements" ON public.worker_endorsements FOR INSERT TO authenticated WITH CHECK (auth.uid() = landlord_id);

-- Enable realtime for service_workers
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_workers;
