-- V1__init.sql
-- Squashed migration combining V001 (users table), V002 (is_deleted column),
-- and V003 (user_api_keys table) into a single baseline migration.

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- Table: users
-- (is_deleted from V002 folded directly into the column list)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Authentication
    email VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(255),

    -- Profile Information
    display_name VARCHAR(150),
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    student_id VARCHAR(50) UNIQUE,
    bio TEXT,
    avatar_url TEXT,

    -- Role and Permissions (VARCHAR with CHECK constraint for Hibernate compatibility)
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    locale VARCHAR(5) NOT NULL DEFAULT 'UK',
    theme VARCHAR(10) DEFAULT 'light',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_staff BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,

    -- Tokens
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,

    -- User Preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{}'::jsonb,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_user_role CHECK (role IN ('SUPERADMIN', 'TEACHER', 'STUDENT', 'TA')),
    CONSTRAINT check_user_locale CHECK (locale IN ('UK', 'EN'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_user_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_user_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_is_deleted ON users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_user_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_user_password_reset_token ON users(password_reset_token);

-- Trigger function for updated_at (shared by both tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger: auto-update updated_at on users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Comments
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON COLUMN users.id IS 'Primary key UUID';
COMMENT ON COLUMN users.email IS 'Unique email address for authentication';
COMMENT ON COLUMN users.role IS 'User role: SUPERADMIN, TEACHER, STUDENT, or TA';
COMMENT ON COLUMN users.locale IS 'Preferred language: UK (Ukrainian) or EN (English)';
COMMENT ON COLUMN users.is_deleted IS 'Soft-delete flag; TRUE means the record is logically removed';
COMMENT ON COLUMN users.preferences IS 'JSON object for flexible user preferences storage';

-- -------------------------------------------------------------------------
-- Table: user_api_keys
-- Stores encrypted API keys for external service integrations (e.g., Groq AI)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'GROQ',
    encrypted_key TEXT NOT NULL,
    key_hint VARCHAR(8) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

-- Trigger: auto-update updated_at on user_api_keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_api_keys_updated_at') THEN
        CREATE TRIGGER update_user_api_keys_updated_at
            BEFORE UPDATE ON user_api_keys
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

COMMIT;
