-- Add runtime type and process port columns for Python sidecar plugin support
ALTER TABLE installed_plugins ADD COLUMN IF NOT EXISTS runtime VARCHAR(20) DEFAULT 'java';
ALTER TABLE installed_plugins ADD COLUMN IF NOT EXISTS process_port INTEGER;
