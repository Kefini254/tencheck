
-- Fix overly permissive RLS policies
-- 1. threads INSERT - restrict to authenticated users creating threads they participate in
DROP POLICY "Users can create threads" ON public.threads;
CREATE POLICY "Users can create threads" ON public.threads FOR INSERT TO authenticated 
  WITH CHECK (tenant_id = auth.uid() OR landlord_id = auth.uid() OR service_worker_id = auth.uid());

-- 2. thread_participants INSERT - only allow adding self or when creating own thread
DROP POLICY "Users can add participants" ON public.thread_participants;
CREATE POLICY "Users can add participants" ON public.thread_participants FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_participants.thread_id AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid() OR t.service_worker_id = auth.uid())));

-- 3. notifications INSERT - only system/trigger creates, allow for own notifications
DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants tp JOIN public.messages m ON m.thread_id = tp.thread_id WHERE m.id = notifications.message_id AND tp.user_id = auth.uid()));
