ALTER TABLE quizzes
    ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS attempt_limit_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS attempt_score_policy VARCHAR(16) NOT NULL DEFAULT 'HIGHEST',
    ADD COLUMN IF NOT EXISTS secure_session_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS secure_require_fullscreen BOOLEAN NOT NULL DEFAULT TRUE;

-- Existing quizzes move to unlimited attempts by default.
UPDATE quizzes
SET attempt_limit_enabled = FALSE,
    attempts_allowed = NULL;

-- Keep legacy timer values, but disable the timer toggle by default.
UPDATE quizzes
SET timer_enabled = FALSE
WHERE timer_enabled IS DISTINCT FROM FALSE;

