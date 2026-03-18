-- Add draft/publish review workflow fields for submissions and grade audit trail.

ALTER TABLE submissions
    ALTER COLUMN status TYPE VARCHAR(32);

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS submission_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS raw_score DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS draft_grade DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS draft_feedback TEXT,
    ADD COLUMN IF NOT EXISTS published_grade DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS published_feedback TEXT,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS published_by UUID,
    ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_resubmitted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Backfill published grade/feedback from historical graded submissions.
UPDATE submissions
SET
    status = CASE
        WHEN UPPER(status) = 'GRADED' THEN 'GRADED_PUBLISHED'
        WHEN UPPER(status) = 'SUBMITTED' THEN 'IN_REVIEW'
        ELSE status
    END,
    published_grade = COALESCE(published_grade, grade),
    published_feedback = COALESCE(published_feedback, feedback),
    published_at = COALESCE(published_at, graded_at)
WHERE UPPER(status) IN ('GRADED', 'SUBMITTED')
   OR published_grade IS NULL
   OR published_feedback IS NULL
   OR published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_status_updated
    ON submissions (assignment_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS submission_grade_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    change_type VARCHAR(32) NOT NULL,
    prev_raw_score DECIMAL(6,2),
    new_raw_score DECIMAL(6,2),
    prev_final_score DECIMAL(6,2),
    new_final_score DECIMAL(6,2),
    prev_feedback TEXT,
    new_feedback TEXT,
    submission_version INTEGER NOT NULL DEFAULT 1,
    entity_version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_submission_grade_audit_submission
    ON submission_grade_audit (submission_id, changed_at DESC);
