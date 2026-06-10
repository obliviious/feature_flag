-- FlagForge initial schema (SQLite)

PRAGMA foreign_keys = ON;

-- ============================================================
-- Organizations
-- ============================================================
CREATE TABLE organizations (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Projects
-- ============================================================
CREATE TABLE projects (
    id              TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    description     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects(organization_id);

-- ============================================================
-- Environments
-- ============================================================
CREATE TABLE environments (
    id          TEXT PRIMARY KEY NOT NULL,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    color       TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, slug)
);

CREATE INDEX idx_environments_project ON environments(project_id);

-- ============================================================
-- Flags
-- ============================================================
CREATE TABLE flags (
    id          TEXT PRIMARY KEY NOT NULL,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    flag_type   TEXT NOT NULL DEFAULT 'boolean' CHECK (flag_type IN ('boolean', 'string', 'number', 'json')),
    tags        TEXT NOT NULL DEFAULT '[]',
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, key)
);

CREATE INDEX idx_flags_project ON flags(project_id);
CREATE INDEX idx_flags_key ON flags(project_id, key);

-- ============================================================
-- Flag Variants
-- ============================================================
CREATE TABLE flag_variants (
    id          TEXT PRIMARY KEY NOT NULL,
    flag_id     TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(flag_id, key)
);

CREATE INDEX idx_flag_variants_flag ON flag_variants(flag_id);

-- ============================================================
-- Flag Environments (per-environment flag configuration)
-- ============================================================
CREATE TABLE flag_environments (
    id                  TEXT PRIMARY KEY NOT NULL,
    flag_id             TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    environment_id      TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    enabled             INTEGER NOT NULL DEFAULT 0,
    default_variant_id  TEXT REFERENCES flag_variants(id),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(flag_id, environment_id)
);

CREATE INDEX idx_flag_environments_flag ON flag_environments(flag_id);
CREATE INDEX idx_flag_environments_env ON flag_environments(environment_id);

-- ============================================================
-- Segments (reusable targeting groups)
-- ============================================================
CREATE TABLE segments (
    id          TEXT PRIMARY KEY NOT NULL,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    match_type  TEXT NOT NULL DEFAULT 'all' CHECK (match_type IN ('all', 'any')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, key)
);

CREATE INDEX idx_segments_project ON segments(project_id);

-- ============================================================
-- Segment Constraints
-- ============================================================
CREATE TABLE segment_constraints (
    id          TEXT PRIMARY KEY NOT NULL,
    segment_id  TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    attribute   TEXT NOT NULL,
    operator    TEXT NOT NULL CHECK (operator IN (
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'in', 'not_in',
        'contains', 'starts_with', 'ends_with', 'matches',
        'semver_eq', 'semver_gt', 'semver_lt'
    )),
    "values"    TEXT NOT NULL DEFAULT '[]',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_segment_constraints_segment ON segment_constraints(segment_id);

-- ============================================================
-- Targeting Rules
-- ============================================================
CREATE TABLE targeting_rules (
    id                  TEXT PRIMARY KEY NOT NULL,
    flag_environment_id TEXT NOT NULL REFERENCES flag_environments(id) ON DELETE CASCADE,
    rank                INTEGER NOT NULL,
    description         TEXT,
    variant_id          TEXT REFERENCES flag_variants(id),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_targeting_rules_flag_env ON targeting_rules(flag_environment_id);

-- ============================================================
-- Rule Segments (which segments a rule references)
-- ============================================================
CREATE TABLE rule_segments (
    id          TEXT PRIMARY KEY NOT NULL,
    rule_id     TEXT NOT NULL REFERENCES targeting_rules(id) ON DELETE CASCADE,
    segment_id  TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    negate      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_rule_segments_rule ON rule_segments(rule_id);

-- ============================================================
-- Rule Distributions (percentage rollouts within a rule)
-- ============================================================
CREATE TABLE rule_distributions (
    id          TEXT PRIMARY KEY NOT NULL,
    rule_id     TEXT NOT NULL REFERENCES targeting_rules(id) ON DELETE CASCADE,
    variant_id  TEXT NOT NULL REFERENCES flag_variants(id) ON DELETE CASCADE,
    rollout_pct INTEGER NOT NULL CHECK (rollout_pct >= 0 AND rollout_pct <= 10000),
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_rule_distributions_rule ON rule_distributions(rule_id);

-- ============================================================
-- Flag Overrides (per-user overrides)
-- ============================================================
CREATE TABLE flag_overrides (
    id                  TEXT PRIMARY KEY NOT NULL,
    flag_environment_id TEXT NOT NULL REFERENCES flag_environments(id) ON DELETE CASCADE,
    targeting_key       TEXT NOT NULL,
    variant_id          TEXT NOT NULL REFERENCES flag_variants(id) ON DELETE CASCADE,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(flag_environment_id, targeting_key)
);

CREATE INDEX idx_flag_overrides_flag_env ON flag_overrides(flag_environment_id);

-- ============================================================
-- SDK Keys
-- ============================================================
CREATE TABLE sdk_keys (
    id              TEXT PRIMARY KEY NOT NULL,
    environment_id  TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    key_type        TEXT NOT NULL CHECK (key_type IN ('server', 'client')),
    key_hash        TEXT NOT NULL UNIQUE,
    key_prefix      TEXT NOT NULL,
    last_used_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at      TEXT
);

CREATE INDEX idx_sdk_keys_env ON sdk_keys(environment_id);
CREATE INDEX idx_sdk_keys_hash ON sdk_keys(key_hash);

-- ============================================================
-- Audit Log (append-only)
-- ============================================================
CREATE TABLE audit_log (
    id                TEXT PRIMARY KEY NOT NULL,
    project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    actor_id          TEXT,
    actor_email       TEXT,
    actor_type        TEXT,
    actor_name        TEXT,
    action            TEXT NOT NULL,
    entity_type       TEXT NOT NULL,
    entity_id         TEXT,
    before_state      TEXT,
    after_state       TEXT,
    diff              TEXT,
    metadata          TEXT NOT NULL DEFAULT '{}',
    severity          TEXT NOT NULL DEFAULT 'info',
    environment_id    TEXT,
    environment_name  TEXT,
    ip_address        TEXT,
    user_agent        TEXT,
    request_id        TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_log_project ON audit_log(project_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(project_id, actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(project_id, action, created_at DESC);
CREATE INDEX idx_audit_log_severity ON audit_log(project_id, severity, created_at DESC);
CREATE INDEX idx_audit_log_environment ON audit_log(project_id, environment_id, created_at DESC);
CREATE INDEX idx_audit_log_request ON audit_log(request_id);

-- ============================================================
-- Config version tracking for cache invalidation
-- ============================================================
CREATE TABLE config_versions (
    environment_id  TEXT PRIMARY KEY REFERENCES environments(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL DEFAULT 1,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Triggers to auto-update updated_at timestamps
-- ============================================================
CREATE TRIGGER trg_organizations_updated_at
AFTER UPDATE ON organizations
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE organizations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_environments_updated_at
AFTER UPDATE ON environments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE environments SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_flags_updated_at
AFTER UPDATE ON flags
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE flags SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_flag_environments_updated_at
AFTER UPDATE ON flag_environments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE flag_environments SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_segments_updated_at
AFTER UPDATE ON segments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE segments SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_targeting_rules_updated_at
AFTER UPDATE ON targeting_rules
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE targeting_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;
