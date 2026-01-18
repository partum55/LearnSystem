-- Create prompt_templates table for versioned LLM prompts
CREATE TABLE IF NOT EXISTS prompt_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    preferred_model VARCHAR(100),
    temperature DOUBLE PRECISION DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4000,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(100)
);

-- Create indexes for prompt_templates
CREATE INDEX idx_prompt_templates_name_active ON prompt_templates(name, active);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);

-- Create AI generation log table for audit
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id VARCHAR(36) PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    prompt_template_name VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    latency_ms BIGINT DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    user_id VARCHAR(36),
    course_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for generation logs
CREATE INDEX idx_ai_generation_logs_user ON ai_generation_logs(user_id);
CREATE INDEX idx_ai_generation_logs_created ON ai_generation_logs(created_at);
CREATE INDEX idx_ai_generation_logs_type ON ai_generation_logs(content_type);

-- Insert default prompt templates
INSERT INTO prompt_templates (id, name, description, system_prompt, user_prompt_template, category, temperature, max_tokens)
VALUES
    (gen_random_uuid()::text, 'course.generation.default', 'Default course generation prompt',
     'You are an expert educational content creator. Create well-structured, engaging course content that follows pedagogical best practices. Always provide clear learning objectives, organized modules, and assessments.',
     'Create a comprehensive course about: {{topic}}

Level: {{level}}
Target audience: {{audience}}
Duration: {{duration}}

Please include:
1. Course title and description
2. Learning objectives
3. {{moduleCount}} modules with detailed content
4. Assessment suggestions',
     'course', 0.7, 8000),

    (gen_random_uuid()::text, 'quiz.generation.default', 'Default quiz generation prompt',
     'You are an expert assessment designer. Create educational quizzes that effectively test understanding and promote learning. Include clear questions with unambiguous correct answers.',
     'Create a quiz about: {{topic}}

Number of questions: {{questionCount}}
Question types: {{questionTypes}}
Difficulty: {{difficulty}}

For each question, provide:
- Question text
- Answer options (for multiple choice)
- Correct answer
- Brief explanation',
     'assessment', 0.5, 4000),

    (gen_random_uuid()::text, 'explanation.generation.default', 'Default explanation generation prompt',
     'You are a patient and clear educator. Explain concepts in a way that is easy to understand, using examples and analogies where appropriate.',
     'Explain the following concept: {{concept}}

Level: {{level}}
Context: {{context}}

Please provide:
1. A clear, concise explanation
2. Real-world examples
3. Common misconceptions to avoid',
     'content', 0.3, 2000)
ON CONFLICT (name) DO NOTHING;

