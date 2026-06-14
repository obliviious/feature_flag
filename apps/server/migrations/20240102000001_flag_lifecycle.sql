-- Flag Lifecycle / Tech Debt Management
-- Adds ownership, lifecycle status, and code-reference tracking to flags.

-- ============================================================
-- Lifecycle columns on the flags table
-- ============================================================
ALTER TABLE flags ADD COLUMN owner_email TEXT;
ALTER TABLE flags ADD COLUMN owner_name TEXT;
ALTER TABLE flags ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'deprecated', 'scheduled_cleanup'));
ALTER TABLE flags ADD COLUMN stale_threshold_days INTEGER;

-- ============================================================
-- Code references (ingested from CI/CD scanners)
-- ============================================================
CREATE TABLE flag_code_references (
    id          TEXT PRIMARY KEY NOT NULL,
    flag_id     TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repo        TEXT,
    branch      TEXT,
    commit_sha  TEXT,
    file_path   TEXT NOT NULL,
    line_number INTEGER,
    snippet     TEXT,
    scanned_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_code_refs_flag        ON flag_code_references(flag_id);
CREATE INDEX idx_code_refs_project     ON flag_code_references(project_id);
CREATE INDEX idx_code_refs_flag_branch ON flag_code_references(flag_id, branch);
