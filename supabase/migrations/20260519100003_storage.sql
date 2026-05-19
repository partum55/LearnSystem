-- 20260519100003_storage.sql
-- Storage buckets and access policies.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',      'avatars',      TRUE,  5242880,   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('course-media', 'course-media', FALSE, 52428800,  NULL),
  ('submissions',  'submissions',  FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars: public read, owner write
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Course media: enrolled member read, course staff write
CREATE POLICY "course_media_member_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "course_media_staff_write"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  )
  WITH CHECK (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  );

-- Submissions: owner only
CREATE POLICY "submissions_owner_only"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMIT;
