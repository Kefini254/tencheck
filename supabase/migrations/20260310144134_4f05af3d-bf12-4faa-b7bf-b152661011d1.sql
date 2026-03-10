
-- Threads table for hub-and-spoke messaging
CREATE TABLE public.threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  landlord_id UUID,
  service_worker_id UUID,
  property_id UUID REFERENCES public.properties(id),
  subject TEXT DEFAULT '',
  thread_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Thread participants
CREATE TABLE public.thread_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID,
  related_entity_type TEXT DEFAULT 'general',
  related_entity_id UUID,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Message attachments
CREATE TABLE public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID REFERENCES public.messages(id),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  notification_type TEXT NOT NULL DEFAULT 'new_message',
  related_entity_type TEXT,
  related_entity_id UUID,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tenancy records
CREATE TABLE public.tenancy_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent INTEGER NOT NULL DEFAULT 0,
  tenancy_status TEXT NOT NULL DEFAULT 'pending_verification',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tenancy reviews (two-sided)
CREATE TABLE public.tenancy_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id UUID NOT NULL REFERENCES public.tenancy_records(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'tenant_reviewing_landlord',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Review disputes
CREATE TABLE public.review_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tenancy_reviews(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  dispute_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Worker complaints
CREATE TABLE public.worker_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  complaint_type TEXT NOT NULL DEFAULT 'quality',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service request deposits
CREATE TABLE public.service_request_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  transaction_code TEXT,
  deposit_status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User service credits
CREATE TABLE public.user_service_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  last_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service credit purchases
CREATE TABLE public.service_credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_purchased INTEGER NOT NULL DEFAULT 1,
  payment_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  transaction_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Landlord profiles (extended)
CREATE TABLE public.landlord_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  average_tenant_rating NUMERIC DEFAULT 0,
  verified_properties INTEGER DEFAULT 0,
  tenant_satisfaction_score NUMERIC DEFAULT 0,
  maintenance_responsiveness_score NUMERIC DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  profile_visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancy_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_service_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: threads
CREATE POLICY "Users can view threads they participate in" ON public.threads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = threads.id AND user_id = auth.uid()));
CREATE POLICY "Users can create threads" ON public.threads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own threads" ON public.threads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = threads.id AND user_id = auth.uid()));

-- RLS Policies: thread_participants
CREATE POLICY "Users can view participants of their threads" ON public.thread_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = thread_participants.thread_id AND tp.user_id = auth.uid()));
CREATE POLICY "Users can add participants" ON public.thread_participants FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies: messages
CREATE POLICY "Users can view messages in their threads" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users can send messages to their threads" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));

-- RLS Policies: message_attachments
CREATE POLICY "Users can view attachments in their threads" ON public.message_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.thread_participants tp ON tp.thread_id = m.thread_id WHERE m.id = message_attachments.message_id AND tp.user_id = auth.uid()));
CREATE POLICY "Users can upload attachments" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

-- RLS Policies: notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies: tenancy_records
CREATE POLICY "Tenants can view own tenancies" ON public.tenancy_records FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Landlords can view own tenancies" ON public.tenancy_records FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Landlords can create tenancies" ON public.tenancy_records FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "Parties can update tenancies" ON public.tenancy_records FOR UPDATE TO authenticated USING (tenant_id = auth.uid() OR landlord_id = auth.uid());

-- RLS Policies: tenancy_reviews
CREATE POLICY "Anyone can view reviews" ON public.tenancy_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Participants can create reviews" ON public.tenancy_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());

-- RLS Policies: review_disputes
CREATE POLICY "Users can view own disputes" ON public.review_disputes FOR SELECT TO authenticated USING (reported_by = auth.uid());
CREATE POLICY "Users can create disputes" ON public.review_disputes FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());
CREATE POLICY "Admins can view all disputes" ON public.review_disputes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update disputes" ON public.review_disputes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS Policies: worker_complaints
CREATE POLICY "Requester can view own complaints" ON public.worker_complaints FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "Workers can view complaints about them" ON public.worker_complaints FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "Admins can view all complaints" ON public.worker_complaints FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can file complaints" ON public.worker_complaints FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Admins can update complaints" ON public.worker_complaints FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS Policies: service_request_deposits
CREATE POLICY "Requester can view own deposits" ON public.service_request_deposits FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "Requester can create deposits" ON public.service_request_deposits FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "System can update deposits" ON public.service_request_deposits FOR UPDATE TO authenticated USING (requester_id = auth.uid());

-- RLS Policies: user_service_credits
CREATE POLICY "Users can view own credits" ON public.user_service_credits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own credits" ON public.user_service_credits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own credits" ON public.user_service_credits FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies: service_credit_purchases
CREATE POLICY "Users can view own purchases" ON public.service_credit_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create purchases" ON public.service_credit_purchases FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- RLS Policies: landlord_profiles
CREATE POLICY "Anyone can view landlord profiles" ON public.landlord_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Landlords can insert own profile" ON public.landlord_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Landlords can update own profile" ON public.landlord_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true);

-- Storage RLS for message-attachments
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments');
CREATE POLICY "Anyone can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'message-attachments');

-- Update triggers for updated_at
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON public.threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenancy_records_updated_at BEFORE UPDATE ON public.tenancy_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_landlord_profiles_updated_at BEFORE UPDATE ON public.landlord_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_request_deposits_updated_at BEFORE UPDATE ON public.service_request_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_service_credits_updated_at BEFORE UPDATE ON public.user_service_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-create notification on new message
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create notifications for all thread participants except sender
  INSERT INTO public.notifications (user_id, message_id, title, body, notification_type, related_entity_type, related_entity_id)
  SELECT tp.user_id, NEW.id, 'New Message', LEFT(NEW.content, 100), 'new_message', 'thread', NEW.thread_id
  FROM public.thread_participants tp
  WHERE tp.thread_id = NEW.thread_id AND tp.user_id != NEW.sender_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();
