-- ============================================
-- Relax MIME allowlists on image buckets.
--
-- The avatars/covers/posts/groups buckets only allowed jpeg/png/webp/gif.
-- iPhones commonly produce HEIC, and an invalid content-type (e.g. the old
-- "image/jpg") was rejected with a 400 — which is why "Failed to create post"
-- appeared when attaching a photo. Size limits are preserved; only the type
-- restriction is removed (same approach already used for the messages bucket).
--
-- Run AFTER 001-006. Safe to re-run.
-- ============================================

UPDATE storage.buckets SET allowed_mime_types = NULL
WHERE id IN ('avatars', 'covers', 'posts', 'groups');

SELECT 'Chatrix image bucket MIME allowlists relaxed' AS message;
