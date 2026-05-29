-- ============================================================
-- Migration: Course lifecycle uses status only
-- ============================================================
-- Canonical course lifecycle:
--   DRAFT, PUBLISHED, ARCHIVED
--
-- Course visibility is not a product concept. All course access is
-- controlled by course_members, roles, enrollment groups, and future
-- group-level locks.

BEGIN;

DO $$
DECLARE
  invalid_statuses text;
BEGIN
  IF to_regclass('learning.courses') IS NULL THEN
    RAISE NOTICE 'learning.courses does not exist; skipping course lifecycle consolidation';
    RETURN;
  END IF;

  SELECT string_agg(DISTINCT status::text, ', ' ORDER BY status::text)
    INTO invalid_statuses
  FROM learning.courses
  WHERE status IS NOT NULL
    AND status::text NOT IN ('DRAFT', 'PUBLISHED', 'ARCHIVED');

  IF invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION
      'Invalid learning.courses.status values found before lifecycle consolidation: %',
      invalid_statuses;
  END IF;

  UPDATE learning.courses
  SET status = 'DRAFT'
  WHERE status IS NULL;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'learning'
      AND table_name = 'courses'
      AND column_name = 'visibility'
  ) THEN
    UPDATE learning.courses
    SET status = 'DRAFT'
    WHERE visibility::text = 'DRAFT'
      AND status::text <> 'ARCHIVED';
  END IF;
END $$;

DO $$
BEGIN
  CREATE TYPE learning.course_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS courses_select_published_or_owned ON learning.courses;
DROP POLICY IF EXISTS courses_select_member_or_admin ON learning.courses;

ALTER TABLE learning.courses
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE learning.course_status USING status::text::learning.course_status,
  ALTER COLUMN status SET DEFAULT 'DRAFT'::learning.course_status,
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE learning.courses DROP COLUMN IF EXISTS visibility;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'learning'
      AND t.typname = 'course_visibility'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE udt_schema = 'learning'
      AND udt_name = 'course_visibility'
  ) THEN
    DROP TYPE learning.course_visibility;
  END IF;
END $$;

CREATE POLICY "courses_select_member_or_admin"
  ON learning.courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'ADMIN'::public.user_role
        AND u.is_active = TRUE
        AND u.is_deleted = FALSE
    )
    OR EXISTS (
      SELECT 1
      FROM learning.course_members cm
      WHERE cm.course_id = learning.courses.id
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
        AND (
          cm.role_in_course <> 'STUDENT'::learning.course_role
          OR learning.courses.status IN (
            'PUBLISHED'::learning.course_status,
            'ARCHIVED'::learning.course_status
          )
        )
    )
  );

COMMIT;
