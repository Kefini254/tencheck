-- Fix thread_participants infinite recursion RLS policy
DROP POLICY IF EXISTS "Users can view participants of their threads" ON public.thread_participants;

CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_participants
    WHERE thread_id = _thread_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Users can view participants of their threads"
ON public.thread_participants
FOR SELECT
TO authenticated
USING (public.is_thread_participant(thread_id, auth.uid()));

-- Enable realtime for service_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

-- Trigger to notify requester when worker accepts/completes job
CREATE OR REPLACE FUNCTION public.notify_on_job_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status = 'accepted' AND NEW.worker_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.requester_id,
      'Job Accepted!',
      'A service worker has accepted your ' || NEW.service_category || ' request at ' || NEW.location,
      'service_request',
      'service_request',
      NEW.id
    );
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.requester_id,
      'Job Completed',
      'Your ' || NEW.service_category || ' request has been marked as completed',
      'service_request',
      'service_request',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_status_change ON public.service_requests;
CREATE TRIGGER on_job_status_change
  AFTER UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_job_accepted();

-- Create message notification trigger
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();