
-- Application links for viral property sharing
CREATE TABLE public.application_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL,
  unique_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.application_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_application_links_token ON public.application_links(unique_token);

CREATE POLICY "Landlords can create links for own properties"
  ON public.application_links FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid()
  ));

CREATE POLICY "Landlords can view own links"
  ON public.application_links FOR SELECT TO authenticated
  USING (landlord_id = auth.uid());

CREATE POLICY "Anyone can view links by token"
  ON public.application_links FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can view all links"
  ON public.application_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Property applications
CREATE TABLE public.property_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  landlord_id uuid NOT NULL,
  application_status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.property_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can create applications"
  ON public.property_applications FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can view own applications"
  ON public.property_applications FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Landlords can view applications for their properties"
  ON public.property_applications FOR SELECT TO authenticated
  USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can update application status"
  ON public.property_applications FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid());

CREATE POLICY "Admins can view all applications"
  ON public.property_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to notify landlord on new application
CREATE OR REPLACE FUNCTION public.notify_on_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
  VALUES (
    NEW.landlord_id,
    'New Tenant Application',
    'A tenant has applied for your property listing.',
    'application',
    'property_application',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_application
  AFTER INSERT ON public.property_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_application();

-- Trigger to create tenancy record on approval
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rent integer;
BEGIN
  IF NEW.application_status = 'approved' AND OLD.application_status = 'pending' THEN
    SELECT rent_amount INTO _rent FROM public.properties WHERE id = NEW.property_id;
    
    INSERT INTO public.tenancy_records (tenant_id, landlord_id, property_id, monthly_rent, tenancy_status, verification_status, lease_start_date)
    VALUES (NEW.tenant_id, NEW.landlord_id, NEW.property_id, COALESCE(_rent, 0), 'active', 'verified', CURRENT_DATE);

    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.tenant_id,
      'Application Approved!',
      'Your property application has been approved. A tenancy record has been created.',
      'application',
      'property_application',
      NEW.id
    );
  ELSIF NEW.application_status = 'rejected' AND OLD.application_status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.tenant_id,
      'Application Update',
      'Your property application was not approved at this time.',
      'application',
      'property_application',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_application_approval
  AFTER UPDATE ON public.property_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_application_approval();

-- Updated_at trigger
CREATE TRIGGER update_property_applications_updated_at
  BEFORE UPDATE ON public.property_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_applications;
