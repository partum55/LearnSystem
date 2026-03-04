-- Course archive snapshots: immutable content-only snapshots for archived courses.

CREATE TABLE IF NOT EXISTS course_archive_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uk_archive_course_version UNIQUE (course_id, version)
);

CREATE INDEX IF NOT EXISTS idx_archive_course_id ON course_archive_snapshots(course_id);
CREATE INDEX IF NOT EXISTS idx_archive_created_at ON course_archive_snapshots(created_at);

COMMENT ON TABLE course_archive_snapshots IS 'Immutable course material snapshots captured when course is archived.';
