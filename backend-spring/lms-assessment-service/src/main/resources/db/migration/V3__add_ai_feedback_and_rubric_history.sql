-- Add AI feedback, rubric scoring history, and revision feedback threads

CREATE TABLE IF NOT EXISTS ai_feedback_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    raw_feedback TEXT NOT NULL,
    feedback_format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN',
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    model_hash VARCHAR(64),
    model_metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_feedback_assignment ON ai_feedback_entries(assignment_id);
CREATE INDEX idx_ai_feedback_submission ON ai_feedback_entries(submission_id);
CREATE INDEX idx_ai_feedback_created_at ON ai_feedback_entries(created_at);

CREATE TABLE IF NOT EXISTS rubric_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL,
    rubric_version INTEGER NOT NULL DEFAULT 1,
    score_total DECIMAL(6,2),
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    explanation TEXT,
    explanation_format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN',
    graded_by UUID,
    graded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    model_hash VARCHAR(64),
    model_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rubric_history_assignment ON rubric_score_history(assignment_id);
CREATE INDEX idx_rubric_history_submission_version ON rubric_score_history(submission_id, rubric_version);
CREATE INDEX idx_rubric_history_graded_at ON rubric_score_history(graded_at);

CREATE TABLE IF NOT EXISTS revision_feedback_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_revision_thread_assignment ON revision_feedback_threads(assignment_id);
CREATE INDEX idx_revision_thread_submission ON revision_feedback_threads(submission_id);
CREATE INDEX idx_revision_thread_student ON revision_feedback_threads(student_id);

CREATE TABLE IF NOT EXISTS revision_feedback_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES revision_feedback_threads(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    message_format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN',
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    model_hash VARCHAR(64),
    model_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_revision_message_thread ON revision_feedback_messages(thread_id);
CREATE INDEX idx_revision_message_created_at ON revision_feedback_messages(created_at);

COMMENT ON TABLE ai_feedback_entries IS 'Immutable AI feedback entries linked to assignment submissions with LaTeX-capable content.';
COMMENT ON COLUMN ai_feedback_entries.raw_feedback IS 'LaTeX-safe feedback content stored losslessly.';
COMMENT ON TABLE rubric_score_history IS 'Versioned rubric scoring history with LaTeX-capable explanations.';
COMMENT ON TABLE revision_feedback_threads IS 'Feedback threads for student-AI-instructor revision cycles.';
COMMENT ON TABLE revision_feedback_messages IS 'Immutable LaTeX-capable messages for revision threads.';
