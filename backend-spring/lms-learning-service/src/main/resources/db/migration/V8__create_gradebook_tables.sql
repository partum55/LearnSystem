-- Gradebook initial schema migrated from Django models

CREATE TABLE IF NOT EXISTS gradebook_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weight DECIMAL(5,2) NOT NULL DEFAULT 0,
    drop_lowest INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_course_category UNIQUE (course_id, name)
);

CREATE INDEX IF NOT EXISTS idx_gradebook_category_course ON gradebook_categories(course_id);

CREATE TABLE IF NOT EXISTS gradebook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    student_id UUID NOT NULL,
    assignment_id UUID,
    score DECIMAL(6,2),
    max_score DECIMAL(6,2) NOT NULL,
    percentage DECIMAL(5,2),
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED',
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    is_excused BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    submission_id UUID,
    override_score DECIMAL(6,2),
    override_by UUID,
    override_at TIMESTAMP,
    override_reason TEXT,
    graded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_entry_course_student_assignment UNIQUE (course_id, student_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_gradebook_entry_course_student ON gradebook_entries(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_entry_status ON gradebook_entries(status);
CREATE INDEX IF NOT EXISTS idx_gradebook_entry_graded_at ON gradebook_entries(graded_at);
CREATE INDEX IF NOT EXISTS idx_gradebook_entry_created_at ON gradebook_entries(created_at);

CREATE TABLE IF NOT EXISTS grade_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gradebook_entry_id UUID NOT NULL REFERENCES gradebook_entries(id) ON DELETE CASCADE,
    old_score DECIMAL(6,2),
    new_score DECIMAL(6,2),
    changed_by UUID,
    change_reason TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grade_history_entry ON grade_histories(gradebook_entry_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_changed_at ON grade_histories(changed_at);

CREATE TABLE IF NOT EXISTS course_grade_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    student_id UUID NOT NULL,
    total_points_earned DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_points_possible DECIMAL(8,2) NOT NULL DEFAULT 0,
    current_grade DECIMAL(5,2),
    letter_grade VARCHAR(5),
    category_grades JSONB NOT NULL DEFAULT '{}'::jsonb,
    assignments_completed INTEGER NOT NULL DEFAULT 0,
    assignments_total INTEGER NOT NULL DEFAULT 0,
    final_grade DECIMAL(5,2),
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    last_calculated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_summary_course_student UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_grade_summary_course_student ON course_grade_summaries(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_grade_summary_current_grade ON course_grade_summaries(current_grade);
