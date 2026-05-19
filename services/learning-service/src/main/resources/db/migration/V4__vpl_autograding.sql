-- VPL config per assignment (stores mode, language, limits, scoring config)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS vpl_config JSONB;

-- Structured test cases table (replaces raw testCases JSONB for VPL assignments)
CREATE TABLE IF NOT EXISTS vpl_test_cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    input           TEXT,
    expected_output TEXT,
    check_mode      VARCHAR(20) NOT NULL DEFAULT 'TRIM',
    test_code       TEXT,
    hidden          BOOLEAN NOT NULL DEFAULT false,
    required        BOOLEAN NOT NULL DEFAULT false,
    weight          INT NOT NULL DEFAULT 1,
    position        INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vpl_test_cases_assignment
    ON vpl_test_cases(assignment_id, position);

-- Auto-grade result stored on submission
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS auto_grade_result JSONB;
