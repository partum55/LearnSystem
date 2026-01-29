-- Add lessons/learning units and learning paths/program tracks

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    content_meta JSONB DEFAULT '{}'::jsonb,
    is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lesson_module_position ON lessons(module_id, position);
CREATE INDEX idx_lesson_published ON lessons(is_published);

CREATE TABLE IF NOT EXISTS lesson_content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    block_type VARCHAR(30) NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN',
    position INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lesson_block_lesson_position ON lesson_content_blocks(lesson_id, position);
CREATE INDEX idx_lesson_block_type ON lesson_content_blocks(block_type);

CREATE TABLE IF NOT EXISTS lesson_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    objective_text TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lesson_objective_lesson_position ON lesson_objectives(lesson_id, position);

CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_program_code ON programs(code);
CREATE INDEX idx_program_owner ON programs(owner_id);
CREATE INDEX idx_program_status ON programs(status);

CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_path_program ON learning_paths(program_id);

CREATE TABLE IF NOT EXISTS path_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    step_type VARCHAR(20) NOT NULL,
    course_id UUID,
    module_id UUID,
    title_override VARCHAR(255),
    description TEXT,
    requirements_text TEXT,
    requirements_format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN',
    completion_criteria JSONB DEFAULT '{}'::jsonb,
    position INTEGER NOT NULL DEFAULT 0,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    is_ai_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    ai_recommendation_meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_path_step_target CHECK (
        (course_id IS NOT NULL AND module_id IS NULL)
        OR (course_id IS NULL AND module_id IS NOT NULL)
    )
);

CREATE INDEX idx_path_step_learning_path_position ON path_steps(learning_path_id, position);
CREATE INDEX idx_path_step_course ON path_steps(course_id);
CREATE INDEX idx_path_step_module ON path_steps(module_id);

COMMENT ON TABLE lessons IS 'Lesson/learning units under modules with LaTeX-capable content blocks.';
COMMENT ON TABLE lesson_content_blocks IS 'Orderable lesson blocks with LaTeX-capable content.';
COMMENT ON COLUMN lesson_content_blocks.content IS 'LaTeX-safe content stored losslessly.';
COMMENT ON TABLE lesson_objectives IS 'Lesson objectives with LaTeX-capable text.';
COMMENT ON TABLE programs IS 'Programs/degree tracks grouping learning paths.';
COMMENT ON TABLE learning_paths IS 'Learning paths that compose existing courses/modules.';
COMMENT ON TABLE path_steps IS 'Steps referencing courses or modules with LaTeX-capable requirements.';
