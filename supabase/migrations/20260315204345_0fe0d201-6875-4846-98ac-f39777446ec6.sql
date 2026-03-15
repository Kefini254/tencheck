
-- Enable realtime on profiles for admin dashboard live counters
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create a trigger to send in-app notification when user is suspended
CREATE OR REPLACE FUNCTION public.notify_user_on_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- On suspension
  IF NEW.is_suspended = true AND (OLD.is_suspended = false OR OLD.is_suspended IS NULL) THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.user_id,
      'Account Suspended',
      'Your account has been suspended by the system admin. Please contact support for more information.',
      'account_action',
      'profile',
      NEW.id
    );
  END IF;

  -- On deletion
  IF NEW.deletion_status = 'deleted' AND OLD.deletion_status != 'deleted' THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.user_id,
      'Account Deleted',
      'Your account has been permanently deleted by the system admin due to policy violations.',
      'account_action',
      'profile',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_user_suspension_or_deletion
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_on_suspension();
