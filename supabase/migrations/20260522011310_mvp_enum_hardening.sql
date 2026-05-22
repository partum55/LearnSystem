-- MVP enum hardening.
--
-- Keep runtime-required schemas. user-service and learning-service currently
-- validate entities in public, ai, learning, assessment, grading, and
-- operations, so dropping those schemas would break MVP startup.
--
-- What this does:
--   1. Drops only unused operations tables that are outside the MVP runtime.
--   2. Converts columns already represented as Java enums to native Postgres
--      enum types.
--
-- String-backed columns are intentionally left as TEXT + CHECK for now. Moving
-- them to native enum requires matching Java enum/value-object changes, because
-- PostgreSQL will not safely accept arbitrary varchar bind parameters for enum
-- columns from Hibernate.

BEGIN;

-- ============================================================
-- Remove non-MVP, non-entity operations tables.
-- ============================================================
DROP TABLE IF EXISTS operations.execution_test_results;
DROP TABLE IF EXISTS operations.execution_runs;
DROP TABLE IF EXISTS operations.audit_logs;

-- ============================================================
-- Enum type creation helpers.
-- ============================================================
DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM ('ADMIN', 'TEACHER', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.user_locale AS ENUM ('UK', 'EN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE learning.course_visibility AS ENUM ('PUBLIC', 'PRIVATE', 'DRAFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE learning.course_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE learning.learning_item_type AS ENUM ('PDF', 'LINK', 'VIDEO', 'FILE', 'RTE', 'LESSON');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE learning.learning_item_status AS ENUM ('VISIBLE', 'HIDDEN', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE learning.lesson_block_type AS ENUM ('TEXT', 'VIDEO', 'INLINE_QUIZ_QUESTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE assessment.attempt_score_policy AS ENUM ('HIGHEST', 'LATEST', 'FIRST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE assessment.peer_review_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE grading.grade_status AS ENUM (
    'NOT_SUBMITTED',
    'SUBMITTED',
    'DRAFT',
    'PUBLISHED',
    'GRADED',
    'EXCUSED',
    'MISSING',
    'LATE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- public.users
-- ============================================================
DROP TRIGGER IF EXISTS on_public_user_role_claim_changed ON public.users;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_locale_check;

ALTER TABLE public.users
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.user_role USING role::public.user_role,
  ALTER COLUMN role SET DEFAULT 'USER'::public.user_role;

ALTER TABLE public.users
  ALTER COLUMN locale DROP DEFAULT,
  ALTER COLUMN locale TYPE public.user_locale USING locale::public.user_locale,
  ALTER COLUMN locale SET DEFAULT 'UK'::public.user_locale;

CREATE OR REPLACE FUNCTION private.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  metadata_role public.user_role;
BEGIN
  metadata_role := upper(coalesce(NEW.raw_app_meta_data->>'role', 'USER'))::public.user_role;
  IF metadata_role NOT IN ('ADMIN'::public.user_role, 'TEACHER'::public.user_role, 'USER'::public.user_role) THEN
    metadata_role := 'USER'::public.user_role;
  END IF;

  INSERT INTO public.users (
    id, email, display_name, first_name, last_name,
    role, locale, theme, email_verified
  ) VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    metadata_role,
    'UK'::public.user_locale,
    'light',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = lower(EXCLUDED.email),
    display_name   = COALESCE(public.users.display_name, EXCLUDED.display_name),
    first_name     = COALESCE(public.users.first_name, EXCLUDED.first_name),
    last_name      = COALESCE(public.users.last_name, EXCLUDED.last_name),
    email_verified = EXCLUDED.email_verified,
    updated_at     = NOW();

  RETURN NEW;
EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION 'Invalid auth app_metadata.role for user %', NEW.id;
END;
$$;

CREATE TRIGGER on_public_user_role_claim_changed
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_auth_role_claim_from_profile();

-- ============================================================
-- learning.courses
-- ============================================================
ALTER TABLE learning.courses DROP CONSTRAINT IF EXISTS courses_visibility_check;
ALTER TABLE learning.courses DROP CONSTRAINT IF EXISTS courses_status_check;

ALTER TABLE learning.courses
  ALTER COLUMN visibility DROP DEFAULT,
  ALTER COLUMN visibility TYPE learning.course_visibility USING visibility::learning.course_visibility,
  ALTER COLUMN visibility SET DEFAULT 'DRAFT'::learning.course_visibility;

ALTER TABLE learning.courses
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE learning.course_status USING status::learning.course_status,
  ALTER COLUMN status SET DEFAULT 'DRAFT'::learning.course_status;

-- ============================================================
-- learning.learning_items / learning.lesson_blocks
-- ============================================================
ALTER TABLE learning.learning_items DROP CONSTRAINT IF EXISTS learning_items_type_check;
ALTER TABLE learning.learning_items DROP CONSTRAINT IF EXISTS learning_items_status_check;

ALTER TABLE learning.learning_items
  ALTER COLUMN type TYPE learning.learning_item_type USING type::learning.learning_item_type;

ALTER TABLE learning.learning_items
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE learning.learning_item_status USING status::learning.learning_item_status,
  ALTER COLUMN status SET DEFAULT 'HIDDEN'::learning.learning_item_status;

ALTER TABLE learning.lesson_blocks DROP CONSTRAINT IF EXISTS lesson_blocks_type_check;

ALTER TABLE learning.lesson_blocks
  ALTER COLUMN type TYPE learning.lesson_block_type USING type::learning.lesson_block_type;

-- ============================================================
-- assessment
-- ============================================================
ALTER TABLE assessment.quizzes DROP CONSTRAINT IF EXISTS quizzes_attempt_score_policy_check;

ALTER TABLE assessment.quizzes
  ALTER COLUMN attempt_score_policy DROP DEFAULT,
  ALTER COLUMN attempt_score_policy TYPE assessment.attempt_score_policy USING attempt_score_policy::assessment.attempt_score_policy,
  ALTER COLUMN attempt_score_policy SET DEFAULT 'HIGHEST'::assessment.attempt_score_policy;

ALTER TABLE assessment.peer_reviews DROP CONSTRAINT IF EXISTS peer_reviews_status_check;

ALTER TABLE assessment.peer_reviews
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE assessment.peer_review_status USING status::assessment.peer_review_status,
  ALTER COLUMN status SET DEFAULT 'PENDING'::assessment.peer_review_status;

-- ============================================================
-- grading
-- ============================================================
ALTER TABLE grading.gradebook_entries DROP CONSTRAINT IF EXISTS gradebook_entries_status_check;

ALTER TABLE grading.gradebook_entries
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE grading.grade_status USING status::grading.grade_status,
  ALTER COLUMN status SET DEFAULT 'NOT_SUBMITTED'::grading.grade_status;

COMMIT;
