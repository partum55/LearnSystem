-- Workload snapshots for deadline/workload engine.

CREATE TABLE IF NOT EXISTS workload_snapshots (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    date DATE NOT NULL,
    total_effort INTEGER NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workload_student_date ON workload_snapshots (student_id, date);
