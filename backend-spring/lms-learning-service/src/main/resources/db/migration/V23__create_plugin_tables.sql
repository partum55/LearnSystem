-- Plugin system tables

CREATE TABLE IF NOT EXISTS installed_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    author VARCHAR(255),
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    installed_by UUID
);

CREATE TABLE IF NOT EXISTS plugin_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    message TEXT,
    details JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_by UUID
);

CREATE INDEX idx_installed_plugins_status ON installed_plugins(status);
CREATE INDEX idx_installed_plugins_type ON installed_plugins(type);
CREATE INDEX idx_plugin_events_plugin_id ON plugin_events_log(plugin_id);
CREATE INDEX idx_plugin_events_occurred_at ON plugin_events_log(occurred_at);
