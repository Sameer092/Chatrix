-- ============================================
-- SECURITY HARDENING
-- Pins a fixed search_path on every function to resolve the
-- "Function Search Path Mutable" warnings from the Supabase linter.
-- Run this AFTER 001-003. Safe to re-run.
-- ============================================

ALTER FUNCTION public.handle_new_user()                       SET search_path = public, extensions;
ALTER FUNCTION public.update_updated_at()                     SET search_path = public, extensions;
ALTER FUNCTION public.update_post_like_count()                SET search_path = public, extensions;
ALTER FUNCTION public.update_post_comment_count()             SET search_path = public, extensions;
ALTER FUNCTION public.update_conversation_on_message()        SET search_path = public, extensions;
ALTER FUNCTION public.handle_friend_request_accepted()        SET search_path = public, extensions;
ALTER FUNCTION public.get_or_create_conversation(uuid)        SET search_path = public, extensions;
ALTER FUNCTION public.search_users(text, integer, integer)    SET search_path = public, extensions;
ALTER FUNCTION public.get_unread_notification_count()         SET search_path = public, extensions;
ALTER FUNCTION public.mark_all_notifications_read()           SET search_path = public, extensions;

-- ============================================
-- NEW FUNCTION: friend count for a given user (used by Profile screens)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_friend_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT COUNT(*)::INTEGER FROM public.friendships WHERE user_id = target_user_id;
$$;

SELECT 'Chatrix security hardening applied' AS message;
