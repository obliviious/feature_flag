-- Management API keys for CI/CD and automation (project-scoped, mgmt_ prefix)

CREATE TABLE management_api_keys (
    id          TEXT PRIMARY KEY NOT NULL,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    key_hash    TEXT NOT NULL UNIQUE,
    key_prefix  TEXT NOT NULL,
    last_used_at TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at  TEXT
);

CREATE INDEX idx_mgmt_keys_project ON management_api_keys(project_id);
CREATE INDEX idx_mgmt_keys_hash ON management_api_keys(key_hash);
