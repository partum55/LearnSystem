-- Move the actively used learning domain into the learning schema and
-- remove unused public notifications.

BEGIN;

DROP TABLE IF EXISTS public.notifications CASCADE;

ALTER TYPE assessment.assignment_type SET SCHEMA learning;
ALTER TYPE assessment.assignment_status SET SCHEMA learning;
ALTER TYPE assessment.attempt_score_policy SET SCHEMA learning;
ALTER TYPE assessment.peer_review_status SET SCHEMA learning;
ALTER TYPE assessment.submission_status SET SCHEMA learning;
ALTER TYPE grading.grade_status SET SCHEMA learning;

ALTER TABLE assessment.assignments SET SCHEMA learning;
ALTER TABLE assessment.quizzes SET SCHEMA learning;
ALTER TABLE assessment.question_bank SET SCHEMA learning;
ALTER TABLE assessment.question_bank_versions SET SCHEMA learning;
ALTER TABLE assessment.quiz_sections SET SCHEMA learning;
ALTER TABLE assessment.quiz_section_rules SET SCHEMA learning;
ALTER TABLE assessment.quiz_questions SET SCHEMA learning;
ALTER TABLE assessment.quiz_attempts SET SCHEMA learning;
ALTER TABLE assessment.quiz_attempt_questions SET SCHEMA learning;
ALTER TABLE assessment.quiz_responses SET SCHEMA learning;
ALTER TABLE assessment.submissions SET SCHEMA learning;
ALTER TABLE assessment.submission_files SET SCHEMA learning;
ALTER TABLE assessment.submission_comments SET SCHEMA learning;
ALTER TABLE assessment.submission_documents SET SCHEMA learning;
ALTER TABLE assessment.submission_versions SET SCHEMA learning;
ALTER TABLE assessment.assignment_template_documents SET SCHEMA learning;
ALTER TABLE assessment.seminar_attendance SET SCHEMA learning;
ALTER TABLE assessment.attendance_qr_tokens SET SCHEMA learning;

ALTER TABLE grading.gradebook_categories SET SCHEMA learning;
ALTER TABLE grading.gradebook_entries SET SCHEMA learning;
ALTER TABLE grading.grade_histories SET SCHEMA learning;
ALTER TABLE grading.course_grade_summaries SET SCHEMA learning;
ALTER TABLE grading.submission_grade_audit SET SCHEMA learning;

ALTER TABLE operations.sis_import_runs SET SCHEMA learning;
ALTER TABLE operations.sis_audit_logs SET SCHEMA learning;
ALTER TABLE operations.course_archive_snapshots SET SCHEMA learning;

DROP SCHEMA IF EXISTS assessment CASCADE;
DROP SCHEMA IF EXISTS grading CASCADE;
DROP SCHEMA IF EXISTS operations CASCADE;

COMMIT;
