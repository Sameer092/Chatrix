-- ============================================
-- FIX: Infinite recursion in RLS policies
--
-- The original conversation_members and group_members SELECT policies
-- referenced their OWN table inside an EXISTS subquery. Postgres evaluates
-- that subquery under the same policy, causing:
--   "infinite recursion detected in policy for relation ..."
-- This broke sending/reading direct messages and group messages entirely.
--
-- Fix: move membership checks into SECURITY DEFINER helper functions, which
-- run as the table owner and bypass RLS (so they don't re-trigger the policy).
-- Then rewrite every policy that referenced those tables to call the helpers.
--
-- Run AFTER 001-004. Safe to re-run.
-- ============================================

-- ---------- Helper functions ----------
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(g_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = g_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(g_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = g_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(g_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups WHERE id = g_id AND created_by = auth.uid()
  );
$$;

-- ============================================
-- CONVERSATION MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Users can view their conversation memberships" ON public.conversation_members;
CREATE POLICY "Users can view their conversation memberships"
  ON public.conversation_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id));

-- ============================================
-- CONVERSATIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view conversations they are in" ON public.conversations;
CREATE POLICY "Users can view conversations they are in"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_member(id));

-- ============================================
-- MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND public.is_conversation_member(conversation_id));

-- ============================================
-- MESSAGE READS
-- ============================================
DROP POLICY IF EXISTS "Users can view message reads" ON public.message_reads;
CREATE POLICY "Users can view message reads"
  ON public.message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reads.message_id
        AND public.is_conversation_member(m.conversation_id)
    )
  );

-- ============================================
-- GROUPS
-- ============================================
DROP POLICY IF EXISTS "Group members can view groups" ON public.groups;
CREATE POLICY "Group members can view groups"
  ON public.groups FOR SELECT
  USING (public.is_group_member(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
CREATE POLICY "Group admins can update groups"
  ON public.groups FOR UPDATE
  USING (public.is_group_admin(id) OR created_by = auth.uid());

-- ============================================
-- GROUP MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Group members can view memberships" ON public.group_members;
CREATE POLICY "Group members can view memberships"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_group_member(group_id));

DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
CREATE POLICY "Group admins can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_group_admin(group_id)
    OR public.is_group_creator(group_id)
  );

DROP POLICY IF EXISTS "Group admins or member themselves can remove" ON public.group_members;
CREATE POLICY "Group admins or member themselves can remove"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid() OR public.is_group_admin(group_id));

-- ============================================
-- GROUP MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Group members can view group messages" ON public.group_messages;
CREATE POLICY "Group members can view group messages"
  ON public.group_messages FOR SELECT
  USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS "Group members can send messages" ON public.group_messages;
CREATE POLICY "Group members can send messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND public.is_group_member(group_id));

-- ============================================
-- STORAGE: allow any attachment type in the messages bucket
-- The original allowlist rejected documents (application/octet-stream) and
-- some audio formats, so file/voice attachments failed to upload.
-- ============================================
UPDATE storage.buckets SET allowed_mime_types = NULL WHERE id = 'messages';

SELECT 'Chatrix RLS recursion fix applied' AS message;
