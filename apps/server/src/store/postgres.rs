use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

use super::models::*;
use eval_core::types as eval;

/// PostgreSQL store for all FlagForge data.
#[derive(Clone)]
pub struct PostgresStore {
    pool: PgPool,
}

impl PostgresStore {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(20)
            .connect(database_url)
            .await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn run_migrations(&self) -> Result<()> {
        // If migrations fail due to checksum mismatch (e.g. manually applied),
        // fix the checksum in _sqlx_migrations and retry.
        let migrator = sqlx::migrate!("./migrations");
        match migrator.run(&self.pool).await {
            Ok(()) => Ok(()),
            Err(sqlx::migrate::MigrateError::VersionMismatch(version)) => {
                tracing::warn!(
                    "Migration {version} checksum mismatch — updating stored checksum"
                );
                // Find the migration with this version and update its checksum
                for m in migrator.iter() {
                    if m.version == version {
                        let checksum_vec = Vec::from(m.checksum.as_ref());
                        sqlx::query(
                            "UPDATE _sqlx_migrations SET checksum = $1 WHERE version = $2",
                        )
                        .bind(&checksum_vec)
                        .bind(version)
                        .execute(&self.pool)
                        .await?;
                        break;
                    }
                }
                // Retry after fixing checksum
                migrator.run(&self.pool).await?;
                Ok(())
            }
            Err(e) => Err(e.into()),
        }
    }

    // ============================================================
    // Organizations
    // ============================================================
    pub async fn create_organization(&self, name: &str, slug: &str) -> Result<OrganizationRow> {
        let row = sqlx::query_as::<_, OrganizationRow>(
            "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *",
        )
        .bind(name)
        .bind(slug)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    // ============================================================
    // Projects
    // ============================================================
    pub async fn create_project(
        &self,
        org_id: Uuid,
        name: &str,
        slug: &str,
        description: Option<&str>,
    ) -> Result<ProjectRow> {
        let row = sqlx::query_as::<_, ProjectRow>(
            "INSERT INTO projects (organization_id, name, slug, description) VALUES ($1, $2, $3, $4) RETURNING *",
        )
        .bind(org_id)
        .bind(name)
        .bind(slug)
        .bind(description)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_project(&self, project_id: Uuid) -> Result<Option<ProjectRow>> {
        let row =
            sqlx::query_as::<_, ProjectRow>("SELECT * FROM projects WHERE id = $1")
                .bind(project_id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(row)
    }

    // ============================================================
    // Environments
    // ============================================================
    pub async fn create_environment(
        &self,
        project_id: Uuid,
        name: &str,
        slug: &str,
        color: Option<&str>,
    ) -> Result<EnvironmentRow> {
        let row = sqlx::query_as::<_, EnvironmentRow>(
            "INSERT INTO environments (project_id, name, slug, color) VALUES ($1, $2, $3, $4) RETURNING *",
        )
        .bind(project_id)
        .bind(name)
        .bind(slug)
        .bind(color)
        .fetch_one(&self.pool)
        .await?;

        // Initialize config version
        sqlx::query("INSERT INTO config_versions (environment_id) VALUES ($1) ON CONFLICT DO NOTHING")
            .bind(row.id)
            .execute(&self.pool)
            .await?;

        Ok(row)
    }

    pub async fn list_environments(&self, project_id: Uuid) -> Result<Vec<EnvironmentRow>> {
        let rows = sqlx::query_as::<_, EnvironmentRow>(
            "SELECT * FROM environments WHERE project_id = $1 ORDER BY sort_order",
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ============================================================
    // Flags
    // ============================================================
    pub async fn create_flag(
        &self,
        project_id: Uuid,
        key: &str,
        name: &str,
        description: Option<&str>,
        flag_type: &str,
        tags: &[String],
    ) -> Result<FlagRow> {
        let row = sqlx::query_as::<_, FlagRow>(
            "INSERT INTO flags (project_id, key, name, description, flag_type, tags)
             VALUES ($1, $2, $3, $4, $5::flag_type, $6)
             RETURNING *",
        )
        .bind(project_id)
        .bind(key)
        .bind(name)
        .bind(description)
        .bind(flag_type)
        .bind(tags)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_flag_by_key(
        &self,
        project_id: Uuid,
        key: &str,
    ) -> Result<Option<FlagRow>> {
        let row = sqlx::query_as::<_, FlagRow>(
            "SELECT * FROM flags WHERE project_id = $1 AND key = $2",
        )
        .bind(project_id)
        .bind(key)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn list_flags(&self, project_id: Uuid) -> Result<Vec<FlagRow>> {
        let rows = sqlx::query_as::<_, FlagRow>(
            "SELECT * FROM flags WHERE project_id = $1 AND archived = FALSE ORDER BY created_at DESC",
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn update_flag(
        &self,
        flag_id: Uuid,
        name: Option<&str>,
        description: Option<&str>,
        tags: Option<&[String]>,
        archived: Option<bool>,
    ) -> Result<FlagRow> {
        let row = sqlx::query_as::<_, FlagRow>(
            "UPDATE flags SET
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                tags = COALESCE($4, tags),
                archived = COALESCE($5, archived)
             WHERE id = $1
             RETURNING *",
        )
        .bind(flag_id)
        .bind(name)
        .bind(description)
        .bind(tags)
        .bind(archived)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn delete_flag(&self, flag_id: Uuid) -> Result<()> {
        sqlx::query("DELETE FROM flags WHERE id = $1")
            .bind(flag_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============================================================
    // Flag Variants
    // ============================================================
    pub async fn create_flag_variant(
        &self,
        flag_id: Uuid,
        key: &str,
        value: &serde_json::Value,
        description: Option<&str>,
        sort_order: i32,
    ) -> Result<FlagVariantRow> {
        let row = sqlx::query_as::<_, FlagVariantRow>(
            "INSERT INTO flag_variants (flag_id, key, value, description, sort_order)
             VALUES ($1, $2, $3, $4, $5) RETURNING *",
        )
        .bind(flag_id)
        .bind(key)
        .bind(value)
        .bind(description)
        .bind(sort_order)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_flag_variants(&self, flag_id: Uuid) -> Result<Vec<FlagVariantRow>> {
        let rows = sqlx::query_as::<_, FlagVariantRow>(
            "SELECT * FROM flag_variants WHERE flag_id = $1 ORDER BY sort_order",
        )
        .bind(flag_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ============================================================
    // Flag Environments
    // ============================================================
    pub async fn create_flag_environment(
        &self,
        flag_id: Uuid,
        environment_id: Uuid,
        enabled: bool,
        default_variant_id: Option<Uuid>,
    ) -> Result<FlagEnvironmentRow> {
        let row = sqlx::query_as::<_, FlagEnvironmentRow>(
            "INSERT INTO flag_environments (flag_id, environment_id, enabled, default_variant_id)
             VALUES ($1, $2, $3, $4) RETURNING *",
        )
        .bind(flag_id)
        .bind(environment_id)
        .bind(enabled)
        .bind(default_variant_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_flag_environment(
        &self,
        flag_id: Uuid,
        environment_id: Uuid,
    ) -> Result<Option<FlagEnvironmentRow>> {
        let row = sqlx::query_as::<_, FlagEnvironmentRow>(
            "SELECT * FROM flag_environments WHERE flag_id = $1 AND environment_id = $2",
        )
        .bind(flag_id)
        .bind(environment_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn toggle_flag(
        &self,
        flag_id: Uuid,
        environment_id: Uuid,
        enabled: bool,
    ) -> Result<FlagEnvironmentRow> {
        let row = sqlx::query_as::<_, FlagEnvironmentRow>(
            "UPDATE flag_environments SET enabled = $3 WHERE flag_id = $1 AND environment_id = $2 RETURNING *",
        )
        .bind(flag_id)
        .bind(environment_id)
        .bind(enabled)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    // ============================================================
    // Segments
    // ============================================================
    pub async fn create_segment(
        &self,
        project_id: Uuid,
        key: &str,
        name: &str,
        description: Option<&str>,
        match_type: &str,
    ) -> Result<SegmentRow> {
        let row = sqlx::query_as::<_, SegmentRow>(
            "INSERT INTO segments (project_id, key, name, description, match_type)
             VALUES ($1, $2, $3, $4, $5::match_type) RETURNING *",
        )
        .bind(project_id)
        .bind(key)
        .bind(name)
        .bind(description)
        .bind(match_type)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_segment(&self, segment_id: Uuid) -> Result<Option<SegmentRow>> {
        let row = sqlx::query_as::<_, SegmentRow>("SELECT * FROM segments WHERE id = $1")
            .bind(segment_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    pub async fn list_segments(&self, project_id: Uuid) -> Result<Vec<SegmentRow>> {
        let rows = sqlx::query_as::<_, SegmentRow>(
            "SELECT * FROM segments WHERE project_id = $1 ORDER BY name",
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_segment_constraint(
        &self,
        segment_id: Uuid,
        attribute: &str,
        operator: &str,
        values: &[String],
        sort_order: i32,
    ) -> Result<SegmentConstraintRow> {
        let row = sqlx::query_as::<_, SegmentConstraintRow>(
            "INSERT INTO segment_constraints (segment_id, attribute, operator, values, sort_order)
             VALUES ($1, $2, $3::operator_type, $4, $5) RETURNING *",
        )
        .bind(segment_id)
        .bind(attribute)
        .bind(operator)
        .bind(values)
        .bind(sort_order)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_segment_constraints(
        &self,
        segment_id: Uuid,
    ) -> Result<Vec<SegmentConstraintRow>> {
        let rows = sqlx::query_as::<_, SegmentConstraintRow>(
            "SELECT * FROM segment_constraints WHERE segment_id = $1 ORDER BY sort_order",
        )
        .bind(segment_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ============================================================
    // Targeting Rules
    // ============================================================
    pub async fn get_targeting_rules(
        &self,
        flag_environment_id: Uuid,
    ) -> Result<Vec<TargetingRuleRow>> {
        let rows = sqlx::query_as::<_, TargetingRuleRow>(
            "SELECT * FROM targeting_rules WHERE flag_environment_id = $1 ORDER BY rank",
        )
        .bind(flag_environment_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_rule_segments(&self, rule_id: Uuid) -> Result<Vec<RuleSegmentRow>> {
        let rows = sqlx::query_as::<_, RuleSegmentRow>(
            "SELECT * FROM rule_segments WHERE rule_id = $1",
        )
        .bind(rule_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_rule_distributions(&self, rule_id: Uuid) -> Result<Vec<RuleDistributionRow>> {
        let rows = sqlx::query_as::<_, RuleDistributionRow>(
            "SELECT * FROM rule_distributions WHERE rule_id = $1 ORDER BY sort_order",
        )
        .bind(rule_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ============================================================
    // Overrides
    // ============================================================
    pub async fn get_flag_overrides(
        &self,
        flag_environment_id: Uuid,
    ) -> Result<Vec<FlagOverrideRow>> {
        let rows = sqlx::query_as::<_, FlagOverrideRow>(
            "SELECT * FROM flag_overrides WHERE flag_environment_id = $1",
        )
        .bind(flag_environment_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ============================================================
    // SDK Keys
    // ============================================================
    pub async fn create_sdk_key(
        &self,
        environment_id: Uuid,
        name: &str,
        key_type: &str,
        key_hash: &str,
        key_prefix: &str,
    ) -> Result<SdkKeyRow> {
        let row = sqlx::query_as::<_, SdkKeyRow>(
            "INSERT INTO sdk_keys (environment_id, name, key_type, key_hash, key_prefix)
             VALUES ($1, $2, $3::sdk_key_type, $4, $5) RETURNING *",
        )
        .bind(environment_id)
        .bind(name)
        .bind(key_type)
        .bind(key_hash)
        .bind(key_prefix)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_sdk_key_by_hash(&self, key_hash: &str) -> Result<Option<SdkKeyRow>> {
        let row = sqlx::query_as::<_, SdkKeyRow>(
            "SELECT * FROM sdk_keys WHERE key_hash = $1 AND revoked_at IS NULL",
        )
        .bind(key_hash)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn update_sdk_key_last_used(&self, key_id: Uuid) -> Result<()> {
        sqlx::query("UPDATE sdk_keys SET last_used_at = NOW() WHERE id = $1")
            .bind(key_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn list_sdk_keys_for_project(
        &self,
        project_id: Uuid,
    ) -> Result<Vec<SdkKeyRow>> {
        let rows = sqlx::query_as::<_, SdkKeyRow>(
            "SELECT sk.* FROM sdk_keys sk
             JOIN environments e ON sk.environment_id = e.id
             WHERE e.project_id = $1
             ORDER BY sk.created_at DESC",
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn revoke_sdk_key(&self, key_id: Uuid) -> Result<SdkKeyRow> {
        let row = sqlx::query_as::<_, SdkKeyRow>(
            "UPDATE sdk_keys SET revoked_at = NOW() WHERE id = $1 RETURNING *",
        )
        .bind(key_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn list_all_projects(&self) -> Result<Vec<ProjectRow>> {
        let rows = sqlx::query_as::<_, ProjectRow>(
            "SELECT * FROM projects ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn list_flag_environments(
        &self,
        flag_id: Uuid,
    ) -> Result<Vec<FlagEnvironmentRow>> {
        let rows = sqlx::query_as::<_, FlagEnvironmentRow>(
            "SELECT * FROM flag_environments WHERE flag_id = $1",
        )
        .bind(flag_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ============================================================
    // Config Builder — build eval-core FlagsConfig from DB
    // ============================================================
    pub async fn build_flags_config(
        &self,
        project_id: Uuid,
        environment_id: Uuid,
    ) -> Result<eval::FlagsConfig> {
        let flags = self.list_flags(project_id).await?;
        let all_segments = self.list_segments(project_id).await?;

        let mut flag_configs = std::collections::HashMap::new();
        let mut segment_map = std::collections::HashMap::new();

        // Build segment map
        for seg in &all_segments {
            let constraints = self.get_segment_constraints(seg.id).await?;
            segment_map.insert(
                seg.id,
                eval::Segment {
                    id: seg.id,
                    key: seg.key.clone(),
                    name: seg.name.clone(),
                    match_type: match seg.match_type.as_str() {
                        "any" => eval::MatchType::Any,
                        _ => eval::MatchType::All,
                    },
                    constraints: constraints
                        .into_iter()
                        .map(|c| eval::SegmentConstraint {
                            attribute: c.attribute,
                            operator: parse_operator(&c.operator),
                            values: c.values,
                        })
                        .collect(),
                },
            );
        }

        // Build flag configs
        for flag in &flags {
            let variants = self.get_flag_variants(flag.id).await?;
            let flag_env = self.get_flag_environment(flag.id, environment_id).await?;

            let Some(fe) = flag_env else { continue };

            let rules = self.get_targeting_rules(fe.id).await?;
            let overrides = self.get_flag_overrides(fe.id).await?;

            let mut eval_rules = Vec::new();
            for rule in rules {
                let rule_segs = self.get_rule_segments(rule.id).await?;
                let rule_dists = self.get_rule_distributions(rule.id).await?;

                eval_rules.push(eval::TargetingRule {
                    id: rule.id,
                    rank: rule.rank,
                    description: rule.description,
                    segments: rule_segs
                        .into_iter()
                        .map(|rs| eval::RuleSegment {
                            segment_id: rs.segment_id,
                            negate: rs.negate,
                        })
                        .collect(),
                    distributions: rule_dists
                        .into_iter()
                        .map(|rd| eval::RuleDistribution {
                            variant_id: rd.variant_id,
                            rollout_pct: rd.rollout_pct,
                        })
                        .collect(),
                    variant_id: rule.variant_id,
                });
            }

            let default_variant_id = fe.default_variant_id.unwrap_or_else(|| {
                variants.first().map(|v| v.id).unwrap_or_default()
            });

            flag_configs.insert(
                flag.key.clone(),
                eval::FlagConfig {
                    key: flag.key.clone(),
                    flag_type: match flag.flag_type.as_str() {
                        "string" => eval::FlagType::String,
                        "number" => eval::FlagType::Number,
                        "json" => eval::FlagType::Json,
                        _ => eval::FlagType::Boolean,
                    },
                    variants: variants
                        .into_iter()
                        .map(|v| eval::Variant {
                            id: v.id,
                            key: v.key,
                            value: v.value,
                            description: v.description,
                        })
                        .collect(),
                    environment: eval::FlagEnvironment {
                        enabled: fe.enabled,
                        default_variant_id,
                        rules: eval_rules,
                        overrides: overrides
                            .into_iter()
                            .map(|o| eval::FlagOverride {
                                targeting_key: o.targeting_key,
                                variant_id: o.variant_id,
                            })
                            .collect(),
                    },
                },
            );
        }

        // Get config version
        let version_row = sqlx::query_as::<_, ConfigVersionRow>(
            "SELECT * FROM config_versions WHERE environment_id = $1",
        )
        .bind(environment_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(eval::FlagsConfig {
            flags: flag_configs,
            segments: segment_map,
            version: version_row.map(|v| v.version).unwrap_or(1),
        })
    }

    /// Increment config version for cache invalidation.
    pub async fn increment_config_version(&self, environment_id: Uuid) -> Result<i64> {
        let row = sqlx::query_as::<_, ConfigVersionRow>(
            "UPDATE config_versions SET version = version + 1, updated_at = NOW()
             WHERE environment_id = $1 RETURNING *",
        )
        .bind(environment_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.version)
    }

    // ============================================================
    // Audit Log
    // ============================================================
    pub async fn create_audit_log(
        &self,
        project_id: Uuid,
        actor_email: Option<&str>,
        action: &str,
        entity_type: &str,
        entity_id: Option<Uuid>,
        before_state: Option<&serde_json::Value>,
        after_state: Option<&serde_json::Value>,
    ) -> Result<AuditLogRow> {
        let row = sqlx::query_as::<_, AuditLogRow>(
            "INSERT INTO audit_log (project_id, actor_email, action, entity_type, entity_id, before_state, after_state)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        )
        .bind(project_id)
        .bind(actor_email)
        .bind(action)
        .bind(entity_type)
        .bind(entity_id)
        .bind(before_state)
        .bind(after_state)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn list_audit_log(
        &self,
        project_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLogRow>> {
        let rows = sqlx::query_as::<_, AuditLogRow>(
            "SELECT * FROM audit_log WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(project_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }
}

fn parse_operator(s: &str) -> eval::Operator {
    match s {
        "eq" => eval::Operator::Eq,
        "neq" => eval::Operator::Neq,
        "gt" => eval::Operator::Gt,
        "gte" => eval::Operator::Gte,
        "lt" => eval::Operator::Lt,
        "lte" => eval::Operator::Lte,
        "in" => eval::Operator::In,
        "not_in" => eval::Operator::NotIn,
        "contains" => eval::Operator::Contains,
        "starts_with" => eval::Operator::StartsWith,
        "ends_with" => eval::Operator::EndsWith,
        "matches" => eval::Operator::Matches,
        "semver_eq" => eval::Operator::SemverEq,
        "semver_gt" => eval::Operator::SemverGt,
        "semver_lt" => eval::Operator::SemverLt,
        _ => eval::Operator::Eq,
    }
}
