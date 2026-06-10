-- Enhance audit_log with actor/context/diff/queryability columns
ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS actor_type TEXT,
    ADD COLUMN IF NOT EXISTS actor_name TEXT,
    ADD COLUMN IF NOT EXISTS ip_address INET,
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS request_id UUID,
    ADD COLUMN IF NOT EXISTS diff JSONB,
    ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS environment_id UUID,
    ADD COLUMN IF NOT EXISTS environment_name TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
    ON audit_log(project_id, actor_id)
    WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_action
    ON audit_log(project_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_severity
    ON audit_log(project_id, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_environment
    ON audit_log(project_id, environment_id, created_at DESC)
    WHERE environment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_request
    ON audit_log(request_id)
    WHERE request_id IS NOT NULL;
