-- FlagForge initial schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Organizations
-- ============================================================
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Projects
-- ============================================================
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects(organization_id);

-- ============================================================
-- Environments
-- ============================================================
CREATE TABLE environments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    color       VARCHAR(7),  -- hex color for UI
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, slug)
);

CREATE INDEX idx_environments_project ON environments(project_id);

-- ============================================================
-- Flags
-- ============================================================
CREATE TYPE flag_type AS ENUM ('boolean', 'string', 'number', 'json');

CREATE TABLE flags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    flag_type   flag_type NOT NULL DEFAULT 'boolean',
    tags        TEXT[] DEFAULT '{}',
    archived    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, key)
);

CREATE INDEX idx_flags_project ON flags(project_id);
CREATE INDEX idx_flags_key ON flags(project_id, key);

-- ============================================================
-- Flag Variants
-- ============================================================
CREATE TABLE flag_variants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_id     UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    key         VARCHAR(255) NOT NULL,
    value       JSONB NOT NULL,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(flag_id, key)
);

CREATE INDEX idx_flag_variants_flag ON flag_variants(flag_id);

-- ============================================================
-- Flag Environments (per-environment flag configuration)
-- ============================================================
CREATE TABLE flag_environments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_id             UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    environment_id      UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    enabled             BOOLEAN NOT NULL DEFAULT FALSE,
    default_variant_id  UUID REFERENCES flag_variants(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(flag_id, environment_id)
);

CREATE INDEX idx_flag_environments_flag ON flag_environments(flag_id);
CREATE INDEX idx_flag_environments_env ON flag_environments(environment_id);

-- ============================================================
-- Segments (reusable targeting groups)
-- ============================================================
CREATE TYPE match_type AS ENUM ('all', 'any');

CREATE TABLE segments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    match_type  match_type NOT NULL DEFAULT 'all',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, key)
);

CREATE INDEX idx_segments_project ON segments(project_id);

-- ============================================================
-- Segment Constraints
-- ============================================================
CREATE TYPE operator_type AS ENUM (
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'not_in',
    'contains', 'starts_with', 'ends_with', 'matches',
    'semver_eq', 'semver_gt', 'semver_lt'
);

CREATE TABLE segment_constraints (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id  UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    attribute   VARCHAR(255) NOT NULL,
    operator    operator_type NOT NULL,
    values      TEXT[] NOT NULL DEFAULT '{}',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_segment_constraints_segment ON segment_constraints(segment_id);

-- ============================================================
-- Targeting Rules
-- ============================================================
CREATE TABLE targeting_rules (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_environment_id UUID NOT NULL REFERENCES flag_environments(id) ON DELETE CASCADE,
    rank                INTEGER NOT NULL,
    description         TEXT,
    variant_id          UUID REFERENCES flag_variants(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_targeting_rules_flag_env ON targeting_rules(flag_environment_id);

-- ============================================================
-- Rule Segments (which segments a rule references)
-- ============================================================
CREATE TABLE rule_segments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id     UUID NOT NULL REFERENCES targeting_rules(id) ON DELETE CASCADE,
    segment_id  UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    negate      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_rule_segments_rule ON rule_segments(rule_id);

-- ============================================================
-- Rule Distributions (percentage rollouts within a rule)
-- ============================================================
CREATE TABLE rule_distributions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id     UUID NOT NULL REFERENCES targeting_rules(id) ON DELETE CASCADE,
    variant_id  UUID NOT NULL REFERENCES flag_variants(id) ON DELETE CASCADE,
    rollout_pct INTEGER NOT NULL CHECK (rollout_pct >= 0 AND rollout_pct <= 10000),
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_rule_distributions_rule ON rule_distributions(rule_id);

-- ============================================================
-- Flag Overrides (per-user overrides)
-- ============================================================
CREATE TABLE flag_overrides (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_environment_id UUID NOT NULL REFERENCES flag_environments(id) ON DELETE CASCADE,
    targeting_key       VARCHAR(255) NOT NULL,
    variant_id          UUID NOT NULL REFERENCES flag_variants(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(flag_environment_id, targeting_key)
);

CREATE INDEX idx_flag_overrides_flag_env ON flag_overrides(flag_environment_id);

-- ============================================================
-- SDK Keys
-- ============================================================
CREATE TYPE sdk_key_type AS ENUM ('server', 'client');

CREATE TABLE sdk_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id  UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    key_type        sdk_key_type NOT NULL,
    key_hash        VARCHAR(255) NOT NULL UNIQUE,
    key_prefix      VARCHAR(20) NOT NULL,  -- "srv_" or "cli_" + first 8 chars for display
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_sdk_keys_env ON sdk_keys(environment_id);
CREATE INDEX idx_sdk_keys_hash ON sdk_keys(key_hash);

-- ============================================================
-- Audit Log (append-only)
-- ============================================================
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    actor_id        UUID,
    actor_email     VARCHAR(255),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    before_state    JSONB,
    after_state     JSONB,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_project ON audit_log(project_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================
-- Config version tracking for cache invalidation
-- ============================================================
CREATE TABLE config_versions (
    environment_id  UUID PRIMARY KEY REFERENCES environments(id) ON DELETE CASCADE,
    version         BIGINT NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Trigger to auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_environments_updated_at BEFORE UPDATE ON environments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_flags_updated_at BEFORE UPDATE ON flags FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_flag_environments_updated_at BEFORE UPDATE ON flag_environments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_segments_updated_at BEFORE UPDATE ON segments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_targeting_rules_updated_at BEFORE UPDATE ON targeting_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
