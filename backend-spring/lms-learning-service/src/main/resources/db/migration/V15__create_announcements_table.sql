-- V15__create_announcements_table.sql
-- Announcements for course communication

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcement_course_order
    ON announcements(course_id, is_pinned, created_at DESC);

CREATE INDEX idx_announcement_course_created
    ON announcements(course_id, created_at DESC);

COMMENT ON TABLE announcements IS 'Course announcements visible to enrolled users';
