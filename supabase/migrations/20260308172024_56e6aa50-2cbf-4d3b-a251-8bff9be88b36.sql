
-- Fix overly permissive policies
DROP POLICY "Users can create worker profiles" ON public.service_workers;
DROP POLICY "Landlords can view all workers" ON public.service_workers;

-- More restrictive: only authenticated users can insert with their own user_id
CREATE POLICY "Authenticated users can create worker profiles" ON public.service_workers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
