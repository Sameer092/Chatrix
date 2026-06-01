-- ============================================
-- STORAGE POLICY FIXES
--
-- 1) Group avatars are stored under "{groupId}/avatar.ext", but the original
--    policy required the first folder to equal the uploader's user id, so
--    every group-avatar upload (create group + edit group) was rejected.
--    Group images are shared assets, so allow any authenticated user to
--    upload/update them (the path is group-scoped, URLs are only shared with
--    members).
-- 2) Several buckets had no UPDATE policy, so re-uploading to the same path
--    (upsert) failed — e.g. changing your cover photo a second time.
--
-- Run AFTER 001-005. Safe to re-run.
-- ============================================

-- ---------- GROUPS bucket ----------
DROP POLICY IF EXISTS "Users can upload group images" ON storage.objects;
CREATE POLICY "Users can upload group images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'groups' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update group images" ON storage.objects;
CREATE POLICY "Users can update group images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'groups' AND auth.role() = 'authenticated');

-- ---------- COVERS bucket (allow owner to overwrite) ----------
DROP POLICY IF EXISTS "Users can update their cover" ON storage.objects;
CREATE POLICY "Users can update their cover"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------- AVATARS bucket (ensure update policy exists) ----------
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------- POSTS bucket (allow owner to overwrite) ----------
DROP POLICY IF EXISTS "Users can update post images" ON storage.objects;
CREATE POLICY "Users can update post images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------- MESSAGES bucket (allow owner to overwrite) ----------
DROP POLICY IF EXISTS "Users can update message files" ON storage.objects;
CREATE POLICY "Users can update message files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'messages' AND auth.uid()::text = (storage.foldername(name))[1]);

SELECT 'Chatrix storage policy fixes applied' AS message;
