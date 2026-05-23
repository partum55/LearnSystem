-- Canonical schema consolidation.
--
-- Goals:
--   1. Native enum for every closed domain column (no more TEXT + CHECK).
--   2. Module and Assignment get explicit status enums replacing boolean flags.
--   3. All legacy content tables dropped (replaced by learning_items / lesson_blocks).
--   4. All legacy columns dropped from assessment.assignments.
--   5. assessment.peer_reviews, revision_feedback_*, ai_feedback_entries, vpl_test_cases dropped.
--   6. enrollment_status and users.theme converted to native enums.

BEGIN;

DROP POLICY IF EXISTS assignments_select_member ON assessment.assignments;
DROP POLICY IF EXISTS modules_select_published_or_member ON learning.modules;
DROP POLICY IF EXISTS courses_select_published_or_owned ON learning.courses;
DROP POLICY IF EXISTS resources_select_member ON learning.resources;
DROP POLICY IF EXISTS lessons_select_member ON learning.lessons;
DROP POLICY IF EXISTS lesson_content_blocks_select_member ON learning.lesson_content_blocks;
DROP POLICY IF EXISTS quizzes_select_member ON assessment.quizzes;
DROP POLICY IF EXISTS course_media_member_read ON storage.objects;

-- ============================================================
-- 1. New enum types
-- ============================================================

DO $$ BEGIN
  CREATE TYPE assessment.submission_status AS ENUM (
    'DRAFT', 'SUBMITTED', 'LATE', 'GRADED', 'RETURNED',
    'PUBLISHED', 'IN_REVIEW', 'WITHDRAWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE learning.module_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment.assignment_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE learning.enrollment_status AS ENUM ('ACTIVE', 'DROPPED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_theme AS ENUM ('LIGHT', 'DARK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. Drop legacy assessment tables (have FKs referencing
--    assessment.assignments and assessment.submissions)
-- ============================================================

DROP TABLE IF EXISTS assessment.ai_feedback_entries         CASCADE;
DROP TABLE IF EXISTS assessment.revision_feedback_messages  CASCADE;
DROP TABLE IF EXISTS assessment.revision_feedback_threads   CASCADE;
DROP TABLE IF EXISTS assessment.peer_reviews                CASCADE;
DROP TABLE IF EXISTS assessment.vpl_test_cases              CASCADE;

-- ============================================================
-- 3. assessment.assignments — drop legacy columns, add status
-- ============================================================

-- Drop FK to learning.topics before dropping the column
ALTER TABLE assessment.assignments DROP COLUMN IF EXISTS topic_id;

ALTER TABLE assessment.assignments
  DROP COLUMN IF EXISTS starter_code,
  DROP COLUMN IF EXISTS solution_code,
  DROP COLUMN IF EXISTS programming_language,
  DROP COLUMN IF EXISTS auto_grading_enabled,
  DROP COLUMN IF EXISTS test_cases,
  DROP COLUMN IF EXISTS vpl_config,
  DROP COLUMN IF EXISTS submission_types,
  DROP COLUMN IF EXISTS allowed_file_types,
  DROP COLUMN IF EXISTS max_file_size,
  DROP COLUMN IF EXISTS max_files,
  DROP COLUMN IF EXISTS external_tool_url,
  DROP COLUMN IF EXISTS is_template,
  DROP COLUMN IF EXISTS original_assignment_id,
  DROP COLUMN IF EXISTS peer_review_enabled,
  DROP COLUMN IF EXISTS peer_reviews_required,
  DROP COLUMN IF EXISTS grade_anonymously,
  DROP COLUMN IF EXISTS estimated_duration;

-- Add canonical status column, derive from existing boolean flags
ALTER TABLE assessment.assignments
  ADD COLUMN IF NOT EXISTS status assessment.assignment_status NOT NULL DEFAULT 'DRAFT'::assessment.assignment_status;

UPDATE assessment.assignments
  SET status = 'ARCHIVED'::assessment.assignment_status WHERE is_archived = TRUE;
UPDATE assessment.assignments
  SET status = 'PUBLISHED'::assessment.assignment_status WHERE is_archived = FALSE AND is_published = TRUE;

ALTER TABLE assessment.assignments
  DROP COLUMN IF EXISTS is_published,
  DROP COLUMN IF EXISTS is_archived;

CREATE INDEX IF NOT EXISTS idx_assignments_status ON assessment.assignments(status);

-- ============================================================
-- 4. Drop learning legacy content tables
--    (replaced by learning.learning_items + learning.lesson_blocks)
-- ============================================================

-- lesson_step_progress references lesson_content_blocks, lessons
DROP TABLE IF EXISTS learning.lesson_step_progress   CASCADE;
DROP TABLE IF EXISTS learning.lesson_objectives      CASCADE;
DROP TABLE IF EXISTS learning.lesson_content_blocks  CASCADE;
DROP TABLE IF EXISTS learning.lessons                CASCADE;

-- module_pages hierarchy
DROP TABLE IF EXISTS learning.page_citations          CASCADE;
DROP TABLE IF EXISTS learning.page_footnotes          CASCADE;
DROP TABLE IF EXISTS learning.page_published_documents CASCADE;
DROP TABLE IF EXISTS learning.page_documents          CASCADE;
DROP TABLE IF EXISTS learning.module_pages            CASCADE;

-- rich text editor support (served legacy module_pages)
DROP TABLE IF EXISTS learning.editor_media            CASCADE;

-- resources (replaced by learning_items)
DROP TABLE IF EXISTS learning.resources               CASCADE;

-- topics (the topic_id FK on assignments was already dropped above)
DROP TABLE IF EXISTS learning.topics                  CASCADE;

-- ============================================================
-- 5. learning.content_progress — update content_type domain
--    MODULE_PAGE and RESOURCE no longer exist; map to LEARNING_ITEM
-- ============================================================

UPDATE learning.content_progress
  SET content_type = 'LEARNING_ITEM'
  WHERE content_type IN ('MODULE_PAGE', 'RESOURCE', 'LESSON');

ALTER TABLE learning.content_progress
  DROP CONSTRAINT IF EXISTS content_progress_content_type_check;

ALTER TABLE learning.content_progress
  ADD CONSTRAINT content_progress_content_type_check
  CHECK (content_type IN ('LEARNING_ITEM', 'ASSIGNMENT', 'QUIZ'));

-- ============================================================
-- 6. learning.modules — replace is_published boolean with status enum
-- ============================================================

ALTER TABLE learning.modules
  ADD COLUMN IF NOT EXISTS status learning.module_status NOT NULL DEFAULT 'DRAFT'::learning.module_status;

UPDATE learning.modules SET status = 'PUBLISHED'::learning.module_status WHERE is_published = TRUE;

ALTER TABLE learning.modules
  DROP COLUMN IF EXISTS is_published,
  DROP COLUMN IF EXISTS publish_date;

CREATE INDEX IF NOT EXISTS idx_modules_status ON learning.modules(status);

-- ============================================================
-- 7. learning.courses — drop redundant is_published boolean
--    (status = 'PUBLISHED' is authoritative)
-- ============================================================

ALTER TABLE learning.courses DROP COLUMN IF EXISTS is_published;

-- ============================================================
-- 8. assessment.submissions — convert status to native enum
--    Normalize any stale values from SubmissionService bug:
--      GRADED_DRAFT      → GRADED
--      GRADED_PUBLISHED  → PUBLISHED
-- ============================================================

UPDATE assessment.submissions
  SET status = CASE status
    WHEN 'GRADED_DRAFT'     THEN 'GRADED'
    WHEN 'GRADED_PUBLISHED' THEN 'PUBLISHED'
    ELSE status
  END
  WHERE status IN ('GRADED_DRAFT', 'GRADED_PUBLISHED');

ALTER TABLE assessment.submissions
  DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE assessment.submissions
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE assessment.submission_status
    USING status::assessment.submission_status,
  ALTER COLUMN status SET DEFAULT 'DRAFT'::assessment.submission_status;

-- ============================================================
-- 9. learning.course_members — enrollment_status to enum
-- ============================================================

ALTER TABLE learning.course_members
  DROP CONSTRAINT IF EXISTS course_members_enrollment_status_check;

UPDATE learning.course_members
  SET enrollment_status = upper(enrollment_status)
  WHERE enrollment_status IN ('active', 'dropped', 'completed');

ALTER TABLE learning.course_members
  ALTER COLUMN enrollment_status DROP DEFAULT,
  ALTER COLUMN enrollment_status TYPE learning.enrollment_status
    USING enrollment_status::learning.enrollment_status,
  ALTER COLUMN enrollment_status SET DEFAULT 'ACTIVE'::learning.enrollment_status;

-- ============================================================
-- 10. public.users — theme to enum
-- ============================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_theme_check;

UPDATE public.users SET theme = upper(theme) WHERE theme IN ('light', 'dark');

ALTER TABLE public.users
  ALTER COLUMN theme DROP DEFAULT,
  ALTER COLUMN theme TYPE public.user_theme USING theme::public.user_theme,
  ALTER COLUMN theme SET DEFAULT 'LIGHT'::public.user_theme;

-- ============================================================
-- 11. assessment.submission_versions — status column to enum
-- ============================================================

ALTER TABLE assessment.submission_versions
  ALTER COLUMN status TYPE assessment.submission_status
    USING CASE status
      WHEN 'GRADED_DRAFT'     THEN 'GRADED'::assessment.submission_status
      WHEN 'GRADED_PUBLISHED' THEN 'PUBLISHED'::assessment.submission_status
      ELSE status::assessment.submission_status
    END;

-- ============================================================
-- 12. Drop submission denormalised name/email columns
--     (userId is the authoritative reference; profile via user-service)
-- ============================================================

ALTER TABLE assessment.submissions
  DROP COLUMN IF EXISTS student_name,
  DROP COLUMN IF EXISTS student_email;

-- programming_language was VPL legacy — now lives in canonicalSettings JSONB
ALTER TABLE assessment.submissions
  DROP COLUMN IF EXISTS programming_language;

-- ============================================================
-- 13. Recreate policies after enum/type conversions
-- ============================================================

CREATE POLICY "courses_select_published_or_owned"
  ON learning.courses FOR SELECT
  USING (status = 'PUBLISHED'::learning.course_status OR owner_id = auth.uid());

CREATE POLICY "modules_select_published_or_member"
  ON learning.modules FOR SELECT
  USING (
    status = 'PUBLISHED'::learning.module_status
    OR EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = learning.modules.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'ACTIVE'::learning.enrollment_status
    )
  );

CREATE POLICY "assignments_select_member"
  ON assessment.assignments FOR SELECT
  USING (
    status = 'PUBLISHED'::assessment.assignment_status
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.assignments.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'ACTIVE'::learning.enrollment_status
    )
  );

CREATE POLICY "course_media_member_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'ACTIVE'::learning.enrollment_status
    )
  );

CREATE POLICY "quizzes_select_member"
  ON assessment.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.quizzes.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'ACTIVE'::learning.enrollment_status
    )
  );

COMMIT;
