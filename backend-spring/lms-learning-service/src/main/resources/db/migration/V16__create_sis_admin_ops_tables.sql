-- V16__create_sis_admin_ops_tables.sql
-- SIS admin operations: preview/apply/rollback tracking + audit logs

CREATE TABLE IF NOT EXISTS sis_import_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_code VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    requested_by UUID NOT NULL,
    valid BOOLEAN NOT NULL DEFAULT FALSE,
    preview_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    change_set JSONB NOT NULL DEFAULT '[]'::jsonb,
    apply_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    applied_at TIMESTAMP,
    rollback_expires_at TIMESTAMP,
    rolled_back_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sis_import_runs_status ON sis_import_runs(status);
CREATE INDEX IF NOT EXISTS idx_sis_import_runs_semester ON sis_import_runs(semester_code);
CREATE INDEX IF NOT EXISTS idx_sis_import_runs_created_at ON sis_import_runs(created_at);

CREATE TABLE IF NOT EXISTS sis_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_run_id UUID REFERENCES sis_import_runs(id) ON DELETE SET NULL,
    actor_id UUID NOT NULL,
    action VARCHAR(60) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_key VARCHAR(180),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_import_run ON sis_audit_logs(import_run_id);
CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_action ON sis_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_entity_type ON sis_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_created_at ON sis_audit_logs(created_at);

COMMENT ON TABLE sis_import_runs IS 'Stores SIS import preview/apply/rollback payloads for admin operations.';
COMMENT ON TABLE sis_audit_logs IS 'Audit trail for SIS and bulk admin actions.';
