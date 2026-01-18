-- V3: Create AI usage tracking and A/B testing tables

-- AI User Usage Table
CREATE TABLE IF NOT EXISTS ai_user_usage (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    usage_period VARCHAR(7) NOT NULL, -- YYYY-MM format
    prompt_tokens BIGINT DEFAULT 0,
    completion_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    request_count INT DEFAULT 0,
    failed_request_count INT DEFAULT 0,
    estimated_cost_usd DECIMAL(10, 6) DEFAULT 0,
    updated_at TIMESTAMP,
    UNIQUE(user_id, usage_period)
);

CREATE INDEX IF NOT EXISTS idx_ai_user_usage_user_period ON ai_user_usage(user_id, usage_period);
CREATE INDEX IF NOT EXISTS idx_ai_user_usage_period ON ai_user_usage(usage_period);

-- AI Prompt A/B Test Table
CREATE TABLE IF NOT EXISTS ai_prompt_ab_test (
    id VARCHAR(36) PRIMARY KEY,
    experiment_name VARCHAR(100) NOT NULL,
    variant_name VARCHAR(50) NOT NULL,
    prompt_template_name VARCHAR(100) NOT NULL,
    user_id VARCHAR(36),
    success BOOLEAN NOT NULL,
    latency_ms BIGINT,
    total_tokens INT,
    quality_score INT,
    user_rating INT,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ab_test_experiment ON ai_prompt_ab_test(experiment_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_variant ON ai_prompt_ab_test(variant_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_created ON ai_prompt_ab_test(created_at);

-- Comments
COMMENT ON TABLE ai_user_usage IS 'Tracks AI token usage and costs per user per month';
COMMENT ON TABLE ai_prompt_ab_test IS 'Stores A/B test results for prompt experiments';

