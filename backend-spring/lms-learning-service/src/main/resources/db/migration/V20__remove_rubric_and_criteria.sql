-- Remove rubric/criteria tables and columns
DROP TABLE IF EXISTS peer_review_ratings CASCADE;
DROP TABLE IF EXISTS peer_review_rubrics CASCADE;
DROP TABLE IF EXISTS rubric_score_history CASCADE;

ALTER TABLE assignments DROP COLUMN IF EXISTS rubric;
ALTER TABLE submissions DROP COLUMN IF EXISTS rubric_evaluation;
