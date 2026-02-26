-- Manual cleanup script: delete quizzes that are not linked to any assignment.
-- Run this BEFORE deploying the module-bound quiz changes.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/sql/delete_unassigned_quizzes.sql
--
-- To preview first, execute only the SELECT blocks below.

BEGIN;

-- Pre-check: orphan quiz count (quizzes with no assignment.quiz_id reference).
SELECT COUNT(*) AS orphan_quiz_count
FROM quizzes q
LEFT JOIN assignments a ON a.quiz_id = q.id
WHERE a.id IS NULL;

-- Pre-check: sample orphan quiz IDs.
SELECT q.id, q.course_id, q.title, q.created_at
FROM quizzes q
LEFT JOIN assignments a ON a.quiz_id = q.id
WHERE a.id IS NULL
ORDER BY q.created_at DESC
LIMIT 100;

-- Delete dependent attempts for orphan quizzes.
WITH orphan_quizzes AS (
    SELECT q.id
    FROM quizzes q
    LEFT JOIN assignments a ON a.quiz_id = q.id
    WHERE a.id IS NULL
)
DELETE FROM quiz_attempts qa
USING orphan_quizzes oq
WHERE qa.quiz_id = oq.id;

-- Delete dependent quiz-question links for orphan quizzes.
WITH orphan_quizzes AS (
    SELECT q.id
    FROM quizzes q
    LEFT JOIN assignments a ON a.quiz_id = q.id
    WHERE a.id IS NULL
)
DELETE FROM quiz_questions qq
USING orphan_quizzes oq
WHERE qq.quiz_id = oq.id;

-- Delete orphan quiz rows.
WITH orphan_quizzes AS (
    SELECT q.id
    FROM quizzes q
    LEFT JOIN assignments a ON a.quiz_id = q.id
    WHERE a.id IS NULL
)
DELETE FROM quizzes q
USING orphan_quizzes oq
WHERE q.id = oq.id;

-- Post-check: must be zero.
SELECT COUNT(*) AS orphan_quiz_count_after
FROM quizzes q
LEFT JOIN assignments a ON a.quiz_id = q.id
WHERE a.id IS NULL;

COMMIT;
