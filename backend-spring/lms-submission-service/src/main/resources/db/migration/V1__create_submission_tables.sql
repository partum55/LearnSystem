-- Submission service initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    student_name VARCHAR(255),
    student_email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    text_answer TEXT,
    submission_url VARCHAR(1000),
    programming_language VARCHAR(50),
    grade DECIMAL(6,2),
    feedback TEXT,
    rubric_evaluation JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    days_late INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP,
    graded_at TIMESTAMP,
    grader_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_submissions_assignment_user UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions (submitted_at);

CREATE TABLE IF NOT EXISTS submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    filename VARCHAR(512) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    content_type VARCHAR(255),
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON submission_files (submission_id);

CREATE TABLE IF NOT EXISTS submission_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_comments_submission ON submission_comments (submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_comments_created ON submission_comments (created_at);
