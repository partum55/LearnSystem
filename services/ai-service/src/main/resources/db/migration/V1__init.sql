-- Migration: V1__init.sql
-- Description: Squashed init migration combining V1 (ai_course_templates, template_variables,
--              template_options), V2 (prompt_templates, ai_generation_logs, default seed data),
--              and V3 (ai_user_usage, ai_prompt_ab_test).

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Table: ai_course_templates
-- Stores reusable AI-driven course generation templates created by users or
-- the platform. usage_count and average_rating are denormalised for fast
-- listing queries and are updated by application logic.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_course_templates (
    id             UUID                     PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255)             NOT NULL,
    description    VARCHAR(1000),
    category       VARCHAR(100)             NOT NULL,
    prompt_template TEXT                   NOT NULL,
    is_public      BOOLEAN                  NOT NULL DEFAULT true,
    is_active      BOOLEAN                  NOT NULL DEFAULT true,
    created_by     UUID,
    usage_count    INTEGER                  NOT NULL DEFAULT 0,
    average_rating DOUBLE PRECISION         NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMP                         DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP                         DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_course_templates_category ON ai_course_templates(category);
CREATE INDEX IF NOT EXISTS idx_ai_course_templates_active   ON ai_course_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_course_templates_public   ON ai_course_templates(is_public);

-- ---------------------------------------------------------------------------
-- Table: template_variables
-- Key-value pairs that parameterise a template prompt at generation time.
-- Composite PK (template_id, variable_name) prevents duplicate variable names
-- within the same template.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS template_variables (
    template_id    UUID         NOT NULL REFERENCES ai_course_templates(id) ON DELETE CASCADE,
    variable_name  VARCHAR(255) NOT NULL,
    default_value  VARCHAR(255),
    PRIMARY KEY (template_id, variable_name)
);

-- ---------------------------------------------------------------------------
-- Table: template_options
-- Arbitrary option flags attached to a template (e.g. output format, tone).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS template_options (
    template_id  UUID         NOT NULL REFERENCES ai_course_templates(id) ON DELETE CASCADE,
    option_key   VARCHAR(255) NOT NULL,
    option_value VARCHAR(255),
    PRIMARY KEY (template_id, option_key)
);

-- ---------------------------------------------------------------------------
-- Table: prompt_templates
-- Versioned system + user prompt pairs used by the AI generation pipeline.
-- `name` is a dot-separated logical key (e.g. 'course.generation.default').
-- preferred_model, temperature, and max_tokens allow per-template model tuning
-- without code changes.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS prompt_templates (
    id                   VARCHAR(36)  PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL UNIQUE,
    description          VARCHAR(500),
    system_prompt        TEXT         NOT NULL,
    user_prompt_template TEXT         NOT NULL,
    version              INTEGER      NOT NULL DEFAULT 0,
    active               BOOLEAN      NOT NULL DEFAULT true,
    category             VARCHAR(50)  NOT NULL DEFAULT 'general',
    preferred_model      VARCHAR(100),
    temperature          DOUBLE PRECISION      DEFAULT 0.7,
    max_tokens           INTEGER               DEFAULT 4000,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by          VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_name_active ON prompt_templates(name, active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category    ON prompt_templates(category);

-- ---------------------------------------------------------------------------
-- Table: ai_generation_logs
-- Append-only audit log for every AI generation request. Tokens and latency
-- feed the analytics and cost-tracking dashboards.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id                   VARCHAR(36) PRIMARY KEY,
    content_type         VARCHAR(50) NOT NULL,
    prompt_template_name VARCHAR(100),
    provider             VARCHAR(50) NOT NULL,
    model                VARCHAR(100),
    prompt_tokens        INTEGER               DEFAULT 0,
    completion_tokens    INTEGER               DEFAULT 0,
    latency_ms           BIGINT                DEFAULT 0,
    success              BOOLEAN     NOT NULL  DEFAULT true,
    error_message        TEXT,
    user_id              VARCHAR(36),
    course_id            VARCHAR(36),
    created_at           TIMESTAMP   NOT NULL  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user    ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created ON ai_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_type    ON ai_generation_logs(content_type);

-- ---------------------------------------------------------------------------
-- Seed: default prompt templates
-- ON CONFLICT DO NOTHING makes this idempotent if the migration is ever
-- re-run against an already-populated schema.
-- ---------------------------------------------------------------------------

INSERT INTO prompt_templates (id, name, description, system_prompt, user_prompt_template, category, temperature, max_tokens) VALUES
(
    gen_random_uuid()::text,
    'course.generation.default',
    'Default course generation prompt',
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
    'course',
    0.7,
    8000
),
(
    gen_random_uuid()::text,
    'quiz.generation.default',
    'Default quiz generation prompt',
    'You are an expert assessment designer. Create educational quizzes that effectively test understanding and promote learning. Include clear questions with unambiguous correct answers.',
    'Create a quiz about: {{topic}}

Module context: {{moduleContext}}

Number of questions: {{questionCount}}
Question types: {{questionTypes}}
Difficulty: {{difficulty}}

For each question, provide:
- Question text
- Answer options (for multiple choice)
- Correct answer
- Brief explanation

The generated quiz must be suitable for placement inside the provided module context.',
    'assessment',
    0.5,
    4000
),
(
    gen_random_uuid()::text,
    'explanation.generation.default',
    'Default explanation generation prompt',
    'You are a patient and clear educator. Explain concepts in a way that is easy to understand, using examples and analogies where appropriate.',
    'Explain the following concept: {{concept}}

Level: {{level}}
Context: {{context}}

Please provide:
1. A clear, concise explanation
2. Real-world examples
3. Common misconceptions to avoid',
    'content',
    0.3,
    2000
)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Table: ai_user_usage
-- Monthly token consumption and cost roll-up per user.
-- usage_period is stored as YYYY-MM (e.g. '2026-03') so that GROUP BY and
-- range queries on the period column use the partial index efficiently.
-- UNIQUE(user_id, usage_period) allows upsert logic in the application layer.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_user_usage (
    id                   VARCHAR(36)    PRIMARY KEY,
    user_id              VARCHAR(36)    NOT NULL,
    usage_period         VARCHAR(7)     NOT NULL,
    prompt_tokens        BIGINT                    DEFAULT 0,
    completion_tokens    BIGINT                    DEFAULT 0,
    total_tokens         BIGINT                    DEFAULT 0,
    request_count        INT                       DEFAULT 0,
    failed_request_count INT                       DEFAULT 0,
    estimated_cost_usd   DECIMAL(10, 6)            DEFAULT 0,
    updated_at           TIMESTAMP,
    UNIQUE (user_id, usage_period)
);

COMMENT ON TABLE ai_user_usage IS 'Tracks AI token usage and costs per user per month';

CREATE INDEX IF NOT EXISTS idx_ai_user_usage_user_period ON ai_user_usage(user_id, usage_period);
CREATE INDEX IF NOT EXISTS idx_ai_user_usage_period      ON ai_user_usage(usage_period);

-- ---------------------------------------------------------------------------
-- Table: ai_prompt_ab_test
-- Records individual A/B experiment observations for prompt variant analysis.
-- metadata column holds arbitrary JSON-serialised context supplied by the
-- caller; stored as TEXT to avoid requiring the jsonb extension on every
-- deployment target.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_prompt_ab_test (
    id                   VARCHAR(36)  PRIMARY KEY,
    experiment_name      VARCHAR(100) NOT NULL,
    variant_name         VARCHAR(50)  NOT NULL,
    prompt_template_name VARCHAR(100) NOT NULL,
    user_id              VARCHAR(36),
    success              BOOLEAN      NOT NULL,
    latency_ms           BIGINT,
    total_tokens         INT,
    quality_score        INT,
    user_rating          INT,
    metadata             TEXT,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ai_prompt_ab_test IS 'Stores A/B test results for prompt experiments';

CREATE INDEX IF NOT EXISTS idx_ab_test_experiment ON ai_prompt_ab_test(experiment_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_variant    ON ai_prompt_ab_test(variant_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_created    ON ai_prompt_ab_test(created_at);

COMMIT;
