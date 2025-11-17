CREATE TABLE deadlines (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL,
    student_group_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_effort INTEGER NOT NULL,
    type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deadline_student_group_due ON deadlines (student_group_id, due_at);
CREATE INDEX idx_deadline_type_due ON deadlines (type, due_at);

