-- V2__create_peer_review_tables.sql
-- Peer review tables for enhanced peer review system

-- Create peer_reviews table
CREATE TABLE IF NOT EXISTS peer_reviews (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    reviewer_user_id BIGINT NOT NULL,
    reviewee_user_id BIGINT NOT NULL,
    submission_id BIGINT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    overall_score DECIMAL(6, 2),
    overall_feedback TEXT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create peer_review_rubrics table
CREATE TABLE IF NOT EXISTS peer_review_rubrics (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    criterion_name VARCHAR(255) NOT NULL,
    criterion_description TEXT,
    max_points INTEGER NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create peer_review_ratings table
CREATE TABLE IF NOT EXISTS peer_review_ratings (
    id BIGSERIAL PRIMARY KEY,
    peer_review_id BIGINT NOT NULL REFERENCES peer_reviews(id) ON DELETE CASCADE,
    rubric_id BIGINT NOT NULL REFERENCES peer_review_rubrics(id) ON DELETE CASCADE,
    score DECIMAL(6, 2) NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for peer_reviews
CREATE INDEX IF NOT EXISTS idx_peer_review_assignment ON peer_reviews(assignment_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_reviewer ON peer_reviews(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_reviewee ON peer_reviews(reviewee_user_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_submission ON peer_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_status ON peer_reviews(status);

-- Create indexes for peer_review_rubrics
CREATE INDEX IF NOT EXISTS idx_peer_review_rubric_assignment ON peer_review_rubrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_rubric_position ON peer_review_rubrics(assignment_id, position);

-- Create indexes for peer_review_ratings
CREATE INDEX IF NOT EXISTS idx_peer_review_rating_review ON peer_review_ratings(peer_review_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_rating_rubric ON peer_review_ratings(rubric_id);

-- Add comments for documentation
COMMENT ON TABLE peer_reviews IS 'Peer review assignments with anonymous support';
COMMENT ON TABLE peer_review_rubrics IS 'Rubric criteria for structured peer evaluation';
COMMENT ON TABLE peer_review_ratings IS 'Individual criterion ratings for each peer review';

COMMENT ON COLUMN peer_reviews.status IS 'PENDING, IN_PROGRESS, COMPLETED, OVERDUE';
COMMENT ON COLUMN peer_reviews.is_anonymous IS 'Whether reviewer identity is hidden from reviewee';
