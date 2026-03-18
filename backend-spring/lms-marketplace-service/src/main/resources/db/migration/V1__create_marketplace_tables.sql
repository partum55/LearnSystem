CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS marketplace_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    author VARCHAR(255) NOT NULL,
    author_url VARCHAR(500),
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    icon_url VARCHAR(500),
    homepage_url VARCHAR(500),
    repository_url VARCHAR(500),
    min_lms_version VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    total_downloads BIGINT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_plugin_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_plugin_id UUID NOT NULL REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    changelog TEXT,
    download_url VARCHAR(500) NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(128),
    is_latest BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(marketplace_plugin_id, version)
);

CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_plugin_id UUID NOT NULL REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(marketplace_plugin_id, user_id)
);

CREATE INDEX idx_mp_plugins_type ON marketplace_plugins(type);
CREATE INDEX idx_mp_plugins_category ON marketplace_plugins(category);
CREATE INDEX idx_mp_plugins_verified ON marketplace_plugins(is_verified);
CREATE INDEX idx_mp_plugins_featured ON marketplace_plugins(is_featured);
CREATE INDEX idx_mp_versions_plugin ON marketplace_plugin_versions(marketplace_plugin_id);
CREATE INDEX idx_mp_reviews_plugin ON marketplace_reviews(marketplace_plugin_id);
