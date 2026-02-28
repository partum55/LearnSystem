-- Add citation/footnote indexing tables for canonical page documents.

CREATE TABLE IF NOT EXISTS page_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES module_pages(id) ON DELETE CASCADE,
    block_id VARCHAR(128),
    author VARCHAR(255),
    title VARCHAR(512),
    year INTEGER,
    url VARCHAR(1000),
    citation_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_citations_page ON page_citations(page_id);
CREATE INDEX IF NOT EXISTS idx_page_citations_type ON page_citations(citation_type);

CREATE TABLE IF NOT EXISTS page_footnotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES module_pages(id) ON DELETE CASCADE,
    footnote_key VARCHAR(128) NOT NULL,
    ordinal INTEGER NOT NULL,
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_page_footnote_key UNIQUE (page_id, footnote_key)
);

CREATE INDEX IF NOT EXISTS idx_page_footnotes_page ON page_footnotes(page_id);
CREATE INDEX IF NOT EXISTS idx_page_footnotes_ordinal ON page_footnotes(page_id, ordinal);

-- Extend question bank metadata for tags/topics/difficulty.
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS topic VARCHAR(255),
    ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON question_bank(topic);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);

-- Versioned question payloads for deterministic quiz attempts.
CREATE TABLE IF NOT EXISTS question_bank_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    prompt_doc_json JSONB NOT NULL,
    payload_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
    answer_key_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_question_version UNIQUE (question_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_question_versions_question ON question_bank_versions(question_id, version_number DESC);

-- Section-based randomization rules for quizzes.
CREATE TABLE IF NOT EXISTS quiz_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_sections_quiz_position ON quiz_sections(quiz_id, position);

CREATE TABLE IF NOT EXISTS quiz_section_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES quiz_sections(id) ON DELETE CASCADE,
    question_type VARCHAR(30),
    difficulty VARCHAR(20),
    tag VARCHAR(120),
    quota INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quiz_section_rule_selector CHECK (
        question_type IS NOT NULL OR difficulty IS NOT NULL OR tag IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_quiz_section_rules_section ON quiz_section_rules(section_id);

-- Freeze selected question versions at attempt start.
CREATE TABLE IF NOT EXISTS quiz_attempt_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES question_bank(id),
    question_version_id UUID REFERENCES question_bank_versions(id),
    position INTEGER NOT NULL DEFAULT 0,
    prompt_snapshot JSONB NOT NULL,
    payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    answer_key_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    points DECIMAL(6, 2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_attempt_question_position UNIQUE (attempt_id, position)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_questions_attempt ON quiz_attempt_questions(attempt_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_questions_question ON quiz_attempt_questions(question_id);

CREATE TABLE IF NOT EXISTS quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    attempt_question_id UUID NOT NULL REFERENCES quiz_attempt_questions(id) ON DELETE CASCADE,
    response_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_correct BOOLEAN,
    score_awarded DECIMAL(6, 2),
    feedback TEXT,
    graded_at TIMESTAMP,
    CONSTRAINT uk_quiz_response_attempt_question UNIQUE (attempt_question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt ON quiz_responses(attempt_id);

COMMENT ON TABLE question_bank_versions IS 'Immutable question versions used to freeze quiz attempts.';
COMMENT ON TABLE quiz_sections IS 'Quiz sections for quota-based randomized question selection.';
COMMENT ON TABLE quiz_section_rules IS 'Selection rules by tag/difficulty/type for each quiz section.';
COMMENT ON TABLE quiz_attempt_questions IS 'Frozen prompt/version snapshots selected at attempt start.';
COMMENT ON TABLE quiz_responses IS 'Per-question responses and scoring for each attempt.';
