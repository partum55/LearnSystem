-- 20260519100001_ai_schema.sql
-- AI tables. FIXED: All PKs changed from VARCHAR(36) to native UUID.

BEGIN;

CREATE TABLE ai.ai_course_templates (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    description    TEXT,
    category       TEXT        NOT NULL,
    prompt_template TEXT       NOT NULL,
    is_public      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    usage_count    INTEGER     NOT NULL DEFAULT 0,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_course_templates_category ON ai.ai_course_templates(category);
CREATE INDEX idx_ai_course_templates_active   ON ai.ai_course_templates(is_active);
CREATE INDEX idx_ai_course_templates_public   ON ai.ai_course_templates(is_public);

CREATE TABLE ai.template_variables (
    template_id    UUID NOT NULL REFERENCES ai.ai_course_templates(id) ON DELETE CASCADE,
    variable_name  TEXT NOT NULL,
    default_value  TEXT,
    PRIMARY KEY (template_id, variable_name)
);

CREATE TABLE ai.template_options (
    template_id  UUID NOT NULL REFERENCES ai.ai_course_templates(id) ON DELETE CASCADE,
    option_key   TEXT NOT NULL,
    option_value TEXT,
    PRIMARY KEY (template_id, option_key)
);

-- FIXED: id is now UUID (was VARCHAR(36))
CREATE TABLE ai.prompt_templates (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT        NOT NULL UNIQUE,
    description          TEXT,
    system_prompt        TEXT        NOT NULL,
    user_prompt_template TEXT        NOT NULL,
    version              INTEGER     NOT NULL DEFAULT 0,
    active               BOOLEAN     NOT NULL DEFAULT TRUE,
    category             TEXT        NOT NULL DEFAULT 'general',
    preferred_model      TEXT,
    temperature          DECIMAL(3,2) DEFAULT 0.7,
    max_tokens           INTEGER     DEFAULT 4000,
    modified_by          TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_templates_name_active ON ai.prompt_templates(name, active);
CREATE INDEX idx_prompt_templates_category    ON ai.prompt_templates(category);

-- FIXED: id is now UUID (was VARCHAR(36)); user_id is now UUID (was VARCHAR(36))
CREATE TABLE ai.ai_generation_logs (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type         TEXT        NOT NULL,
    prompt_template_name TEXT,
    provider             TEXT        NOT NULL,
    model                TEXT,
    prompt_tokens        INTEGER     NOT NULL DEFAULT 0,
    completion_tokens    INTEGER     NOT NULL DEFAULT 0,
    latency_ms           BIGINT      NOT NULL DEFAULT 0,
    success              BOOLEAN     NOT NULL DEFAULT TRUE,
    error_message        TEXT,
    user_id              UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    course_id            UUID        REFERENCES learning.courses(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_generation_logs_user    ON ai.ai_generation_logs(user_id);
CREATE INDEX idx_ai_generation_logs_created ON ai.ai_generation_logs(created_at);
CREATE INDEX idx_ai_generation_logs_type    ON ai.ai_generation_logs(content_type);

-- FIXED: id is now UUID (was VARCHAR(36)); user_id is now UUID (was VARCHAR(36))
CREATE TABLE ai.ai_user_usage (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    usage_period         TEXT        NOT NULL, -- YYYY-MM format
    prompt_tokens        BIGINT      NOT NULL DEFAULT 0,
    completion_tokens    BIGINT      NOT NULL DEFAULT 0,
    total_tokens         BIGINT      NOT NULL DEFAULT 0,
    request_count        INTEGER     NOT NULL DEFAULT 0,
    failed_request_count INTEGER     NOT NULL DEFAULT 0,
    estimated_cost_usd   DECIMAL(10,6) NOT NULL DEFAULT 0,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_user_usage_user_period UNIQUE (user_id, usage_period)
);

CREATE INDEX idx_ai_user_usage_user_period ON ai.ai_user_usage(user_id, usage_period);
CREATE INDEX idx_ai_user_usage_period      ON ai.ai_user_usage(usage_period);

-- FIXED: id is now UUID (was VARCHAR(36)); user_id is now UUID (was VARCHAR(36))
CREATE TABLE ai.ai_prompt_ab_test (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_name      TEXT        NOT NULL,
    variant_name         TEXT        NOT NULL,
    prompt_template_name TEXT        NOT NULL,
    user_id              UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    success              BOOLEAN     NOT NULL,
    latency_ms           BIGINT,
    total_tokens         INTEGER,
    quality_score        INTEGER,
    user_rating          INTEGER,
    metadata             JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_prompt_ab_test_experiment ON ai.ai_prompt_ab_test(experiment_name);
CREATE INDEX idx_ai_prompt_ab_test_variant    ON ai.ai_prompt_ab_test(variant_name);
CREATE INDEX idx_ai_prompt_ab_test_created    ON ai.ai_prompt_ab_test(created_at);

-- Seed: default prompt templates
INSERT INTO ai.prompt_templates (name, description, system_prompt, user_prompt_template, category, temperature, max_tokens)
VALUES
(
    'course.generation.default',
    'Default course generation prompt',
    'You are an expert educational content creator. Create well-structured, engaging course content that follows pedagogical best practices.',
    'Create a comprehensive course about: {{topic}}

Level: {{level}}
Target audience: {{audience}}
Duration: {{duration}}

Please include:
1. Course title and description
2. Learning objectives
3. {{moduleCount}} learning.modules with detailed content
4. Assessment suggestions',
    'course', 0.7, 8000
),
(
    'quiz.generation.default',
    'Default quiz generation prompt',
    'You are an expert assessment designer. Create educational assessment.quizzes that effectively test understanding.',
    'Create a quiz about: {{topic}}

Module context: {{moduleContext}}
Number of questions: {{questionCount}}
Question types: {{questionTypes}}
Difficulty: {{difficulty}}',
    'assessment', 0.5, 4000
),
(
    'explanation.generation.default',
    'Default explanation generation prompt',
    'You are a patient and clear educator. Explain concepts in a way that is easy to understand.',
    'Explain the following concept: {{concept}}

Level: {{level}}
Context: {{context}}',
    'content', 0.3, 2000
)
ON CONFLICT (name) DO NOTHING;

COMMIT;
