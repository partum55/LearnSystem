CREATE TABLE workload_snapshots (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    date DATE NOT NULL,
    total_effort INTEGER NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_workload_student_date ON workload_snapshots (student_id, date);

