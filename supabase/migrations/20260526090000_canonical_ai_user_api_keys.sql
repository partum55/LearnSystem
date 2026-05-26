-- Canonical AI provider key storage.
-- ai-service owns this schema/table. User-facing settings routes are gatewayed to ai-service.

BEGIN;

CREATE SCHEMA IF NOT EXISTS ai;

REVOKE ALL ON SCHEMA ai FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA ai TO authenticated;

DROP TABLE IF EXISTS public.user_api_keys CASCADE;
DROP TABLE IF EXISTS ai.user_api_keys CASCADE;

DO $$
BEGIN
  CREATE TYPE ai.ai_provider AS ENUM ('GEMINI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ai.ai_provider_key_status AS ENUM ('ACTIVE', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE ai.user_api_keys (
    id                UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID                          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider          ai.ai_provider                NOT NULL,
    encrypted_api_key TEXT                          NOT NULL,
    key_prefix        TEXT,
    key_last4         TEXT                          NOT NULL,
    status            ai.ai_provider_key_status     NOT NULL DEFAULT 'ACTIVE',
    created_at        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
    last_used_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_ai_user_api_keys_active
    ON ai.user_api_keys(user_id, provider)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_ai_user_api_keys_user_provider
    ON ai.user_api_keys(user_id, provider);

CREATE INDEX idx_ai_user_api_keys_status
    ON ai.user_api_keys(status);

CREATE TRIGGER trg_ai_user_api_keys_updated_at
    BEFORE UPDATE ON ai.user_api_keys
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

ALTER TABLE ai.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_user_api_keys_own
    ON ai.user_api_keys FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON ai.user_api_keys TO authenticated;

COMMIT;
