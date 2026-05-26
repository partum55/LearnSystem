CREATE TABLE IF NOT EXISTS ai.ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    input_json JSONB NOT NULL,
    output_json JSONB,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    key_source TEXT NOT NULL,
    token_usage_json JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_generations_user_id ON ai.ai_generations(user_id);
CREATE INDEX idx_ai_generations_task_type ON ai.ai_generations(task_type);
CREATE INDEX idx_ai_generations_status ON ai.ai_generations(status);
