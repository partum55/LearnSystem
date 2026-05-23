-- Migration: Add 'WITHDRAWN' to submissions status check constraint and clean up legacy function.
-- Hardens the database against schema constraints when a student withdraws their submission.

BEGIN;

ALTER TABLE assessment.submissions DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE assessment.submissions ADD CONSTRAINT submissions_status_check CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'LATE', 'GRADED', 'RETURNED', 'PUBLISHED', 'IN_REVIEW', 'WITHDRAWN'
));

-- Drop obsolete legacy auth trigger function
DROP FUNCTION IF EXISTS private.handle_new_auth_user();

COMMIT;
