-- QR-based attendance check-in tokens
CREATE TABLE attendance_qr_tokens (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    token         VARCHAR(64) NOT NULL UNIQUE,
    expires_at    TIMESTAMP   NOT NULL,
    created_by    UUID        NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_qr_token_assignment ON attendance_qr_tokens(assignment_id);
CREATE INDEX idx_qr_token_token ON attendance_qr_tokens(token);

-- Per-course toggle for QR attendance
ALTER TABLE courses ADD COLUMN qr_attendance_enabled BOOLEAN NOT NULL DEFAULT FALSE;
