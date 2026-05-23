-- Final canonical learning schema.
--
-- public.users remains in public. The learning schema keeps only the
-- canonical course/content/assignment/submission/grade tables.

BEGIN;

ALTER TYPE learning.learning_item_type ADD VALUE IF NOT EXISTS 'PRESENTATION';

DROP TABLE IF EXISTS ai.ai_course_templates CASCADE;
DROP TABLE IF EXISTS ai.template_variables CASCADE;
DROP TABLE IF EXISTS ai.template_options CASCADE;
DROP TABLE IF EXISTS ai.prompt_templates CASCADE;
DROP TABLE IF EXISTS ai.ai_generation_logs CASCADE;
DROP TABLE IF EXISTS ai.ai_user_usage CASCADE;
DROP TABLE IF EXISTS ai.ai_prompt_ab_test CASCADE;
ALTER TABLE IF EXISTS ai.user_api_keys SET SCHEMA public;
DROP SCHEMA IF EXISTS ai CASCADE;

DROP POLICY IF EXISTS modules_select_published_or_member ON learning.modules;
DROP POLICY IF EXISTS assignments_select_member ON learning.assignments;
DROP POLICY IF EXISTS course_media_member_read ON storage.objects;
DROP POLICY IF EXISTS submissions_select_own ON learning.submissions;
DROP POLICY IF EXISTS gradebook_entries_select_own ON learning.gradebook_entries;

DROP TABLE IF EXISTS learning.submission_grade_audit CASCADE;
DROP TABLE IF EXISTS learning.submission_documents CASCADE;
DROP TABLE IF EXISTS learning.submission_comments CASCADE;
DROP TABLE IF EXISTS learning.submission_files CASCADE;
DROP TABLE IF EXISTS learning.assignment_template_documents CASCADE;

DROP TABLE IF EXISTS learning.attendance_qr_tokens CASCADE;
DROP TABLE IF EXISTS learning.seminar_attendance CASCADE;
DROP TABLE IF EXISTS learning.quiz_responses CASCADE;
DROP TABLE IF EXISTS learning.quiz_attempt_questions CASCADE;
DROP TABLE IF EXISTS learning.quiz_attempts CASCADE;
DROP TABLE IF EXISTS learning.quiz_questions CASCADE;
DROP TABLE IF EXISTS learning.quiz_section_rules CASCADE;
DROP TABLE IF EXISTS learning.quiz_sections CASCADE;
DROP TABLE IF EXISTS learning.question_bank_versions CASCADE;
DROP TABLE IF EXISTS learning.question_bank CASCADE;
DROP TABLE IF EXISTS learning.quizzes CASCADE;
DROP TABLE IF EXISTS learning.vpl_test_cases CASCADE;
DROP TABLE IF EXISTS learning.peer_reviews CASCADE;

DROP TABLE IF EXISTS learning.grade_histories CASCADE;
DROP TABLE IF EXISTS learning.gradebook_categories CASCADE;
DROP TABLE IF EXISTS learning.course_grade_summaries CASCADE;

DROP TABLE IF EXISTS learning.content_progress CASCADE;
DROP TABLE IF EXISTS learning.announcements CASCADE;
DROP TABLE IF EXISTS learning.course_archive_snapshots CASCADE;
DROP TABLE IF EXISTS learning.sis_audit_logs CASCADE;
DROP TABLE IF EXISTS learning.sis_import_runs CASCADE;

ALTER TABLE IF EXISTS learning.submissions RENAME TO assignment_submissions;
ALTER TABLE IF EXISTS learning.gradebook_entries RENAME TO grades;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'learning'::regnamespace AND typname = 'enrollment_status')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'learning'::regnamespace AND typname = 'course_member_status') THEN
    ALTER TYPE learning.enrollment_status RENAME TO course_member_status;
  END IF;
END $$;

ALTER TABLE learning.course_members RENAME COLUMN enrollment_status TO status;
ALTER TABLE learning.course_members
  ALTER COLUMN status SET DEFAULT 'ACTIVE'::learning.course_member_status;

ALTER TABLE learning.assignments
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS quiz_id,
  DROP COLUMN IF EXISTS description_format,
  DROP COLUMN IF EXISTS instructions_format;

ALTER TABLE learning.assignments
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE learning.assignments
SET settings = COALESCE(external_tool_config->'canonicalSettings', external_tool_config, '{}'::jsonb)
WHERE external_tool_config IS NOT NULL;

ALTER TABLE learning.assignments
  DROP COLUMN IF EXISTS external_tool_config;

ALTER TABLE learning.assignment_submissions
  DROP COLUMN IF EXISTS student_name,
  DROP COLUMN IF EXISTS student_email,
  DROP COLUMN IF EXISTS programming_language;

ALTER TABLE learning.grades
  ALTER COLUMN status TYPE learning.grade_status
    USING status::text::learning.grade_status;

DROP TYPE IF EXISTS learning.attempt_score_policy CASCADE;
DROP TYPE IF EXISTS learning.peer_review_status CASCADE;

ALTER TABLE learning.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.learning_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.submission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.grades ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA learning TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA learning TO authenticated;

CREATE POLICY "modules_select_published_or_member"
  ON learning.modules FOR SELECT
  USING (
    status = 'PUBLISHED'::learning.module_status
    OR EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = learning.modules.course_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
    )
  );

CREATE POLICY "assignments_select_member"
  ON learning.assignments FOR SELECT
  USING (
    status = 'PUBLISHED'::learning.assignment_status
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = learning.assignments.course_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
    )
  );

CREATE POLICY "assignment_submissions_select_own"
  ON learning.assignment_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "grades_select_own"
  ON learning.grades FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "course_media_member_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
    )
  );

COMMIT;
