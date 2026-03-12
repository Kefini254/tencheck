
-- Add is_suspended to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Create admin_alerts table
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  related_user_id uuid,
  related_entity_id uuid,
  related_entity_type text,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view alerts" ON public.admin_alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update alerts" ON public.admin_alerts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create moderation_log table
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view moderation log" ON public.moderation_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert moderation log" ON public.moderation_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin policies on existing tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update any profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can update any profile" ON public.profiles
      FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete properties' AND tablename = 'properties') THEN
    CREATE POLICY "Admins can delete properties" ON public.properties
      FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all service requests' AND tablename = 'service_requests') THEN
    CREATE POLICY "Admins can view all service requests" ON public.service_requests
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all complaints' AND tablename = 'worker_complaints') THEN
    CREATE POLICY "Admins can view all complaints" ON public.worker_complaints
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update complaints' AND tablename = 'worker_complaints') THEN
    CREATE POLICY "Admins can update complaints" ON public.worker_complaints
      FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all rent transactions' AND tablename = 'rent_transactions') THEN
    CREATE POLICY "Admins can view all rent transactions" ON public.rent_transactions
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Alert trigger functions
CREATE OR REPLACE FUNCTION public.alert_on_new_worker()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
  VALUES ('new_worker', 'New service worker registered: ' || NEW.service_category, NEW.user_id, 'service_worker_profile', NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.alert_on_new_dispute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
  VALUES ('new_dispute', 'Dispute filed: ' || LEFT(NEW.dispute_reason, 100), NEW.tenant_id, 'dispute', NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.alert_on_large_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE avg_rent numeric;
BEGIN
  SELECT COALESCE(AVG(rent_amount), 0) INTO avg_rent FROM public.properties;
  IF avg_rent > 0 AND NEW.amount > avg_rent * 3 THEN
    INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
    VALUES ('large_payment', 'Large payment: KES ' || NEW.amount || ' (3x avg: ' || ROUND(avg_rent) || ')', NEW.tenant_id, 'rent_transaction', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_worker_complaint_threshold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c_count integer;
BEGIN
  SELECT COUNT(*) INTO c_count FROM public.worker_complaints WHERE worker_id = NEW.worker_id;
  IF c_count >= 3 THEN
    UPDATE public.service_worker_profiles SET verification_status = 'suspended' WHERE user_id = NEW.worker_id;
    INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type)
    VALUES ('worker_auto_suspended', 'Auto-suspended after ' || c_count || ' complaints', NEW.worker_id, 'service_worker_profile');
  ELSIF c_count >= 1 THEN
    UPDATE public.service_worker_profiles SET visibility_status = 'limited' WHERE user_id = NEW.worker_id AND visibility_status = 'public';
    INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
    VALUES ('worker_complaint', 'Complaint #' || c_count || ' filed against worker', NEW.worker_id, 'worker_complaint', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Updated visibility with rating check
CREATE OR REPLACE FUNCTION public.update_worker_visibility()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.verification_status IN ('pending', 'suspended') THEN
    NEW.visibility_status := 'hidden';
  ELSIF NEW.verification_status = 'verified' AND NEW.rating_score IS NOT NULL AND NEW.rating_score > 0 AND NEW.rating_score < 3.5 THEN
    NEW.visibility_status := 'limited';
  ELSIF NEW.verification_status = 'verified' AND COALESCE(NEW.jobs_completed, 0) < 3 THEN
    NEW.visibility_status := 'limited';
  ELSIF NEW.verification_status = 'verified' AND COALESCE(NEW.jobs_completed, 0) >= 3 THEN
    NEW.visibility_status := 'public';
  END IF;
  RETURN NEW;
END;
$$;

-- Updated handle_new_user with admin auto-role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    'tenant'
  );
  IF NEW.email = 'com08522@uoeld.ac.ke' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Assign admin role if user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'com08522@uoeld.ac.ke'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create/recreate all triggers
DROP TRIGGER IF EXISTS trg_alert_new_worker ON public.service_worker_profiles;
CREATE TRIGGER trg_alert_new_worker AFTER INSERT ON public.service_worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_new_worker();

DROP TRIGGER IF EXISTS trg_alert_new_dispute ON public.disputes;
CREATE TRIGGER trg_alert_new_dispute AFTER INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_new_dispute();

DROP TRIGGER IF EXISTS trg_alert_large_payment ON public.rent_transactions;
CREATE TRIGGER trg_alert_large_payment AFTER INSERT ON public.rent_transactions
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_large_payment();

DROP TRIGGER IF EXISTS trg_worker_complaint_threshold ON public.worker_complaints;
CREATE TRIGGER trg_worker_complaint_threshold AFTER INSERT ON public.worker_complaints
  FOR EACH ROW EXECUTE FUNCTION public.handle_worker_complaint_threshold();

DROP TRIGGER IF EXISTS trg_update_worker_visibility ON public.service_worker_profiles;
CREATE TRIGGER trg_update_worker_visibility BEFORE UPDATE ON public.service_worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_worker_visibility();

DROP TRIGGER IF EXISTS trg_notify_on_job_accepted ON public.service_requests;
CREATE TRIGGER trg_notify_on_job_accepted AFTER UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_job_accepted();

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

DROP TRIGGER IF EXISTS trg_update_worker_rating ON public.worker_reviews;
CREATE TRIGGER trg_update_worker_rating AFTER INSERT ON public.worker_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_worker_rating();

-- Enable realtime for admin_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
