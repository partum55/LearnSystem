-- 20260519100002_rls_policies.sql
-- Auth sync trigger + RLS policies.
-- Java services connect via service-role key (bypasses RLS).
-- Frontend uses anon/user key (subject to RLS).

BEGIN;

-- ============================================================
-- AUTH SYNC TRIGGER
-- Mirrors auth.users inserts to public.users as profiles.
-- Keep security definer code outside exposed schemas.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, display_name, first_name, last_name,
    role, locale, theme, email_verified
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'STUDENT',
    'UK',
    'light',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = EXCLUDED.email,
    display_name   = COALESCE(public.users.display_name, EXCLUDED.display_name),
    email_verified = EXCLUDED.email_verified,
    updated_at     = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- ============================================================
-- Enable RLS on every application table.
-- Non-public schemas are not exposed through Supabase Data API; RLS stays
-- enabled as defense in depth while grants below keep browser roles out.
-- ============================================================
ALTER TABLE public.users                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.courses                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_members                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.modules                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.topics                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.resources                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.lessons                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.lesson_content_blocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.lesson_objectives               ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.module_pages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.page_documents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.page_published_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.page_citations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.page_footnotes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.editor_media                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.announcements                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.content_progress                ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.lesson_step_progress            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.quizzes                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.question_bank                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.question_bank_versions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.quiz_sections                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.quiz_section_rules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.quiz_questions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.quiz_attempts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.quiz_attempt_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.quiz_responses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assignments                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.vpl_test_cases                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.peer_reviews                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.submissions                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.submission_files                ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.submission_comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assignment_template_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.submission_documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.ai_feedback_entries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.revision_feedback_threads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.revision_feedback_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.seminar_attendance              ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.attendance_qr_tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading.gradebook_categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading.gradebook_entries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading.grade_histories                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading.course_grade_summaries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading.submission_grade_audit          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.user_api_keys                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ai_course_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.template_variables              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.template_options                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.prompt_templates                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ai_generation_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ai_user_usage                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ai_prompt_ab_test               ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.sis_import_runs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.sis_audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.course_archive_snapshots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.audit_logs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.execution_runs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.execution_test_results          ENABLE ROW LEVEL SECURITY;

-- Keep internal domain schemas out of browser roles even if someone later
-- enables them in PostgREST settings by mistake. Only narrowly grant the
-- course membership lookup needed by Storage policies.
REVOKE ALL ON ALL TABLES IN SCHEMA learning, assessment, grading, ai, operations
  FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA learning, assessment, grading, ai, operations
  FROM anon, authenticated;

GRANT USAGE ON SCHEMA learning TO authenticated;
GRANT SELECT ON learning.course_members TO authenticated;

-- ============================================================
-- USERS policies
-- ============================================================
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Limit Data API profile writes to non-authorization columns.
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (display_name, first_name, last_name, bio, avatar_url, locale, theme, preferences)
  ON public.users TO authenticated;

-- Limit notification writes to read-state changes. Services use service-role bypass.
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

-- ============================================================
-- USER_API_KEYS policies
-- ============================================================
CREATE POLICY "user_api_keys_own"
  ON ai.user_api_keys FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- COURSES policies
-- ============================================================
CREATE POLICY "courses_select_published_or_owned"
  ON learning.courses FOR SELECT
  USING (is_published = TRUE OR owner_id = auth.uid());

-- Course creation/update/delete: Java gateway only (service-role bypasses)
-- No frontend write policies for learning.courses.

-- ============================================================
-- COURSE_MEMBERS policies
-- ============================================================
CREATE POLICY "course_members_select_own"
  ON learning.course_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "course_members_select_as_owner"
  ON learning.course_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning.courses c
      WHERE c.id = learning.course_members.course_id AND c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- MODULES policies
-- ============================================================
CREATE POLICY "modules_select_published_or_member"
  ON learning.modules FOR SELECT
  USING (
    is_published = TRUE
    OR EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = learning.modules.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- RESOURCES policies
-- ============================================================
CREATE POLICY "resources_select_member"
  ON learning.resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM learning.modules m
      JOIN learning.course_members cm ON cm.course_id = m.course_id
      WHERE m.id = learning.resources.module_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- LESSONS policies
-- ============================================================
CREATE POLICY "lessons_select_member"
  ON learning.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM learning.modules m
      JOIN learning.course_members cm ON cm.course_id = m.course_id
      WHERE m.id = learning.lessons.module_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- LESSON_CONTENT_BLOCKS policies
-- ============================================================
CREATE POLICY "lesson_content_blocks_select_member"
  ON learning.lesson_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM learning.lessons l
      JOIN learning.modules m ON m.id = l.module_id
      JOIN learning.course_members cm ON cm.course_id = m.course_id
      WHERE l.id = learning.lesson_content_blocks.lesson_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- ASSIGNMENTS policies
-- ============================================================
CREATE POLICY "assignments_select_member"
  ON assessment.assignments FOR SELECT
  USING (
    is_published = TRUE
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.assignments.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- QUIZZES policies
-- ============================================================
CREATE POLICY "quizzes_select_member"
  ON assessment.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.quizzes.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- QUESTION_BANK policies (staff only)
-- ============================================================
CREATE POLICY "question_bank_staff_only"
  ON assessment.question_bank FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.question_bank.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.question_bank.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  );

-- ============================================================
-- SUBMISSIONS policies
-- Students can SELECT their own assessment.submissions only.
-- NO frontend INSERT/UPDATE — all submission writes go through Java.
-- ============================================================
CREATE POLICY "submissions_select_own"
  ON assessment.submissions FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- CONTENT_PROGRESS policies
-- ============================================================
CREATE POLICY "content_progress_own"
  ON learning.content_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- GRADEBOOK_ENTRIES policies
-- Students can read their own grades only.
-- ============================================================
CREATE POLICY "gradebook_entries_select_own"
  ON grading.gradebook_entries FOR SELECT
  USING (student_id = auth.uid());

COMMIT;
