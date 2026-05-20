-- Canonical learning-service grade/submission model hardening.
-- This keeps existing development data but separates draft/published grades
-- from submission payloads and preserves submission version history.

ALTER TABLE grading.gradebook_entries
    ADD COLUMN IF NOT EXISTS draft_score DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS draft_comment TEXT,
    ADD COLUMN IF NOT EXISTS draft_graded_by UUID REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS draft_graded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_score DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS published_comment TEXT,
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE grading.gradebook_entries
    DROP CONSTRAINT IF EXISTS gradebook_entries_status_check;

ALTER TABLE grading.gradebook_entries
    ADD CONSTRAINT gradebook_entries_status_check
    CHECK (status IN (
        'NOT_SUBMITTED','SUBMITTED','DRAFT','PUBLISHED',
        'GRADED','LATE','EXCUSED','MISSING'
    ));

UPDATE grading.gradebook_entries
SET published_score = COALESCE(published_score, score),
    published_comment = COALESCE(published_comment, notes),
    published_at = COALESCE(published_at, graded_at),
    status = 'PUBLISHED'
WHERE status = 'GRADED'
  AND score IS NOT NULL;

UPDATE grading.gradebook_entries
SET draft_score = COALESCE(draft_score, score),
    draft_comment = COALESCE(draft_comment, notes),
    draft_graded_at = COALESCE(draft_graded_at, graded_at),
    status = 'DRAFT'
WHERE status = 'SUBMITTED'
  AND score IS NOT NULL
  AND published_score IS NULL;

CREATE INDEX IF NOT EXISTS idx_gradebook_entries_published_at
    ON grading.gradebook_entries(published_at);

CREATE TABLE IF NOT EXISTS assessment.submission_versions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID        NOT NULL REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    assignment_id   UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.users(id),
    version_number  INTEGER     NOT NULL,
    status          TEXT        NOT NULL,
    content         JSONB       NOT NULL DEFAULT '{}',
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_versions_submission_version UNIQUE (submission_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_submission_versions_submission
    ON assessment.submission_versions(submission_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_submission_versions_assignment_user
    ON assessment.submission_versions(assignment_id, user_id, version_number DESC);
