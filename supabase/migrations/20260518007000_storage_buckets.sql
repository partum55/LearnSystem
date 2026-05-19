BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('course-media', 'course-media', false, 52428800, NULL),
  ('submissions', 'submissions', false, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Avatar files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Course members can read course media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1
      FROM public.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "Course staff can manage course media"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1
      FROM public.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER', 'TA')
    )
  )
  WITH CHECK (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1
      FROM public.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER', 'TA')
    )
  );

CREATE POLICY "Users can manage own submission files"
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
