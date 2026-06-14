use anyhow::Result;
use serde::Deserialize;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use uuid::Uuid;

use crate::audit::AuditContext;
use super::models::*;
use eval_core::types as eval;

/// Input for a single code reference (used by `upsert_code_references`).
#[derive(Debug, Deserialize)]
pub struct CodeRefInput {
    pub repo: Option<String>,
    pub branch: Option<String>,
    pub commit_sha: Option<String>,
    pub file_path: String,
    pub line_number: Option<i32>,
    pub snippet: Option<String>,
}

const FLAG_COLS: &str =
    "id, project_id, key, name, description, flag_type, tags, archived, \
     owner_email, owner_name, lifecycle_status, stale_threshold_days, created_at, updated_at";
const SEGMENT_COLS: &str =
    "id, project_id, key, name, description, match_type, created_at, updated_at";
const CONSTRAINT_COLS: &str =
    r#"id, segment_id, attribute, operator, "values", sort_order, created_at"#;
const SDK_KEY_COLS: &str =
    "id, environment_id, name, key_type, key_hash, key_prefix, last_used_at, created_at, revoked_at";
const MGMT_KEY_COLS: &str =
    "id, project_id, name, key_hash, key_prefix, last_used_at, created_at, revoked_at";

/// SQLite store for all FlagForge data.
#[derive(Clone)]
pub struct SqliteStore {
    pool: SqlitePool,
}

impl SqliteStore {
    pub async fn new(database_url: &str) -> Result<Self> {
        let connect_options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .after_connect(|conn, _meta| {
                Box::pin(async move {
                    sqlx::query("PRAGMA journal_mode = WAL")
                        .execute(&mut *conn)
                        .await?;
                    Ok(())
                })
            })
            .connect_with(connect_options)
            .await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn run_migrations(&self) -> Result<()> {
        let migrator = sqlx::migrate!("./migrations");
        match migrator.run(&self.pool).await {
            Ok(()) => Ok(()),
            Err(sqlx::migrate::MigrateError::VersionMismatch(version)) => {
                tracing::warn!(
                    "Migration {version} checksum mismatch — updating stored checksum"
                );
                for m in migrator.iter() {
                    if m.version == version {
                        let checksum_vec = Vec::from(m.checksum.as_ref());
                        sqlx::query(
                            "UPDATE _sqlx_migrations SET checksum = ? WHERE version = ?",
                        )
                        .bind(&checksum_vec)
                        .bind(version)
                        .execute(&self.pool)
                        .await?;
                        break;
                    }
                }
                migrator.run(&self.pool).await?;
                Ok(())
            }
            Err(e) => Err(e.into()),
        }
    }

    pub async fn create_organization(&self, name: &str, slug: &str) -> Result<OrganizationRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, OrganizationRow>(
            "INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?) RETURNING *",
        )
        .bind(id)
        .bind(name)
        .bind(slug)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn create_project(
        &self,
        org_id: Uuid,
        name: &str,
        slug: &str,
        description: Option<&str>,
    ) -> Result<ProjectRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, ProjectRow>(
            "INSERT INTO projects (id, organization_id, name, slug, description) VALUES (?, ?, ?, ?, ?) RETURNING *",
        )
        .bind(id)
        .bind(org_id)
        .bind(name)
        .bind(slug)
        .bind(description)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_project(&self, project_id: Uuid) -> Result<Option<ProjectRow>> {
        let row = sqlx::query_as::<_, ProjectRow>("SELECT * FROM projects WHERE id = ?")
            .bind(project_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    pub async fn create_environment(
        &self,
        project_id: Uuid,
        name: &str,
        slug: &str,
        color: Option<&str>,
    ) -> Result<EnvironmentRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, EnvironmentRow>(
            "INSERT INTO environments (id, project_id, name, slug, color) VALUES (?, ?, ?, ?, ?) RETURNING *",
        )
        .bind(id)
        .bind(project_id)
        .bind(name)
        .bind(slug)
        .bind(color)
        .fetch_one(&self.pool)
        .await?;

        sqlx::query("INSERT OR IGNORE INTO config_versions (environment_id) VALUES (?)")
            .bind(row.id)
            .execute(&self.pool)
            .await?;

        Ok(row)
    }

    pub async fn list_environments(&self, project_id: Uuid) -> Result<Vec<EnvironmentRow>> {
        let rows = sqlx::query_as::<_, EnvironmentRow>(
            "SELECT * FROM environments WHERE project_id = ? ORDER BY sort_order",
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_flag(
        &self,
        project_id: Uuid,
        key: &str,
        name: &str,
        description: Option<&str>,
        flag_type: &str,
        tags: &[String],
    ) -> Result<FlagRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, FlagRow>(
            &format!(
                "INSERT INTO flags (id, project_id, key, name, description, flag_type, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             RETURNING {FLAG_COLS}"
            ),
        )
        .bind(id)
        .bind(project_id)
        .bind(key)
        .bind(name)
        .bind(description)
        .bind(flag_type)
        .bind(sqlx::types::Json(tags))
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
            &format!("SELECT {FLAG_COLS} FROM flags WHERE project_id = ? AND key = ?"),
        )
        .bind(project_id)
        .bind(key)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn list_flags(&self, project_id: Uuid) -> Result<Vec<FlagRow>> {
        let rows = sqlx::query_as::<_, FlagRow>(
            &format!(
                "SELECT {FLAG_COLS} FROM flags WHERE project_id = ? AND archived = 0 ORDER BY created_at DESC"
            ),
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
        let tags_json = tags.map(sqlx::types::Json);
        let row = sqlx::query_as::<_, FlagRow>(
            &format!(
                "UPDATE flags SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                tags = COALESCE(?, tags),
                archived = COALESCE(?, archived)
             WHERE id = ?
             RETURNING {FLAG_COLS}"
            ),
        )
        .bind(name)
        .bind(description)
        .bind(tags_json)
        .bind(archived)
        .bind(flag_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn delete_flag(&self, flag_id: Uuid) -> Result<()> {
        sqlx::query("DELETE FROM flags WHERE id = ?")
            .bind(flag_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn create_flag_variant(
        &self,
        flag_id: Uuid,
        key: &str,
        value: &serde_json::Value,
        description: Option<&str>,
        sort_order: i32,
    ) -> Result<FlagVariantRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, FlagVariantRow>(
            "INSERT INTO flag_variants (id, flag_id, key, value, description, sort_order)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
        )
        .bind(id)
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
            "SELECT * FROM flag_variants WHERE flag_id = ? ORDER BY sort_order",
        )
        .bind(flag_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn update_flag_variant(
        &self,
        variant_id: Uuid,
        flag_id: Uuid,
        key: &str,
        value: &serde_json::Value,
        description: Option<&str>,
    ) -> Result<FlagVariantRow> {
        let row = sqlx::query_as::<_, FlagVariantRow>(
            "UPDATE flag_variants SET
                key = ?,
                value = ?,
                description = ?
             WHERE id = ? AND flag_id = ?
             RETURNING *",
        )
        .bind(key)
        .bind(value)
        .bind(description)
        .bind(variant_id)
        .bind(flag_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn create_flag_environment(
        &self,
        flag_id: Uuid,
        environment_id: Uuid,
        enabled: bool,
        default_variant_id: Option<Uuid>,
    ) -> Result<FlagEnvironmentRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, FlagEnvironmentRow>(
            "INSERT INTO flag_environments (id, flag_id, environment_id, enabled, default_variant_id)
             VALUES (?, ?, ?, ?, ?) RETURNING *",
        )
        .bind(id)
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
            "SELECT * FROM flag_environments WHERE flag_id = ? AND environment_id = ?",
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
            "UPDATE flag_environments SET enabled = ? WHERE flag_id = ? AND environment_id = ? RETURNING *",
        )
        .bind(enabled)
        .bind(flag_id)
        .bind(environment_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn create_segment(
        &self,
        project_id: Uuid,
        key: &str,
        name: &str,
        description: Option<&str>,
        match_type: &str,
    ) -> Result<SegmentRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, SegmentRow>(
            &format!(
                "INSERT INTO segments (id, project_id, key, name, description, match_type)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING {SEGMENT_COLS}"
            ),
        )
        .bind(id)
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
        let row = sqlx::query_as::<_, SegmentRow>(&format!(
            "SELECT {SEGMENT_COLS} FROM segments WHERE id = ?"
        ))
        .bind(segment_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn list_segments(&self, project_id: Uuid) -> Result<Vec<SegmentRow>> {
        let rows = sqlx::query_as::<_, SegmentRow>(
            &format!("SELECT {SEGMENT_COLS} FROM segments WHERE project_id = ? ORDER BY name"),
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
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, SegmentConstraintRow>(
            &format!(
                r#"INSERT INTO segment_constraints (id, segment_id, attribute, operator, "values", sort_order)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING {CONSTRAINT_COLS}"#
            ),
        )
        .bind(id)
        .bind(segment_id)
        .bind(attribute)
        .bind(operator)
        .bind(sqlx::types::Json(values))
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
            &format!(
                "SELECT {CONSTRAINT_COLS} FROM segment_constraints WHERE segment_id = ? ORDER BY sort_order"
            ),
        )
        .bind(segment_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ============================================================
    // Targeting rules — write methods
    // ============================================================

    pub async fn create_targeting_rule(
        &self,
        flag_environment_id: Uuid,
        rank: i32,
        description: Option<&str>,
        variant_id: Option<Uuid>,
    ) -> Result<TargetingRuleRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, TargetingRuleRow>(
            "INSERT INTO targeting_rules (id, flag_environment_id, rank, description, variant_id)
             VALUES (?, ?, ?, ?, ?) RETURNING *",
        )
        .bind(id)
        .bind(flag_environment_id)
        .bind(rank)
        .bind(description)
        .bind(variant_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn update_targeting_rule(
        &self,
        rule_id: Uuid,
        rank: Option<i32>,
        description: Option<&str>,
        variant_id: Option<Uuid>,
    ) -> Result<TargetingRuleRow> {
        let row = sqlx::query_as::<_, TargetingRuleRow>(
            "UPDATE targeting_rules SET
                rank        = COALESCE(?, rank),
                description = COALESCE(?, description),
                variant_id  = COALESCE(?, variant_id)
             WHERE id = ? RETURNING *",
        )
        .bind(rank)
        .bind(description)
        .bind(variant_id)
        .bind(rule_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn delete_targeting_rule(&self, rule_id: Uuid) -> Result<()> {
        sqlx::query("DELETE FROM targeting_rules WHERE id = ?")
            .bind(rule_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn replace_rule_segments(
        &self,
        rule_id: Uuid,
        segments: &[(Uuid, bool)], // (segment_id, negate)
    ) -> Result<()> {
        sqlx::query("DELETE FROM rule_segments WHERE rule_id = ?")
            .bind(rule_id)
            .execute(&self.pool)
            .await?;
        for (segment_id, negate) in segments {
            let id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO rule_segments (id, rule_id, segment_id, negate) VALUES (?, ?, ?, ?)",
            )
            .bind(id)
            .bind(rule_id)
            .bind(segment_id)
            .bind(negate)
            .execute(&self.pool)
            .await?;
        }
        Ok(())
    }

    pub async fn replace_rule_distributions(
        &self,
        rule_id: Uuid,
        distributions: &[(Uuid, i32)], // (variant_id, rollout_pct in basis points)
    ) -> Result<()> {
        sqlx::query("DELETE FROM rule_distributions WHERE rule_id = ?")
            .bind(rule_id)
            .execute(&self.pool)
            .await?;
        for (i, (variant_id, rollout_pct)) in distributions.iter().enumerate() {
            let id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO rule_distributions (id, rule_id, variant_id, rollout_pct, sort_order)
                 VALUES (?, ?, ?, ?, ?)",
            )
            .bind(id)
            .bind(rule_id)
            .bind(variant_id)
            .bind(rollout_pct)
            .bind(i as i32)
            .execute(&self.pool)
            .await?;
        }
        Ok(())
    }

    // ============================================================
    // Flag overrides — write methods
    // ============================================================

    pub async fn upsert_flag_override(
        &self,
        flag_environment_id: Uuid,
        targeting_key: &str,
        variant_id: Uuid,
    ) -> Result<FlagOverrideRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, FlagOverrideRow>(
            "INSERT INTO flag_overrides (id, flag_environment_id, targeting_key, variant_id)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(flag_environment_id, targeting_key)
             DO UPDATE SET variant_id = excluded.variant_id
             RETURNING *",
        )
        .bind(id)
        .bind(flag_environment_id)
        .bind(targeting_key)
        .bind(variant_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn delete_flag_override(
        &self,
        flag_environment_id: Uuid,
        targeting_key: &str,
    ) -> Result<()> {
        sqlx::query(
            "DELETE FROM flag_overrides WHERE flag_environment_id = ? AND targeting_key = ?",
        )
        .bind(flag_environment_id)
        .bind(targeting_key)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_flag_environment_id(
        &self,
        flag_id: Uuid,
        environment_id: Uuid,
    ) -> Result<Option<Uuid>> {
        let row: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM flag_environments WHERE flag_id = ? AND environment_id = ?",
        )
        .bind(flag_id)
        .bind(environment_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(|(id,)| id))
    }

    pub async fn get_targeting_rules(
        &self,
        flag_environment_id: Uuid,
    ) -> Result<Vec<TargetingRuleRow>> {
        let rows = sqlx::query_as::<_, TargetingRuleRow>(
            "SELECT * FROM targeting_rules WHERE flag_environment_id = ? ORDER BY rank",
        )
        .bind(flag_environment_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_rule_segments(&self, rule_id: Uuid) -> Result<Vec<RuleSegmentRow>> {
        let rows = sqlx::query_as::<_, RuleSegmentRow>(
            "SELECT * FROM rule_segments WHERE rule_id = ?",
        )
        .bind(rule_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_rule_distributions(&self, rule_id: Uuid) -> Result<Vec<RuleDistributionRow>> {
        let rows = sqlx::query_as::<_, RuleDistributionRow>(
            "SELECT * FROM rule_distributions WHERE rule_id = ? ORDER BY sort_order",
        )
        .bind(rule_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_flag_overrides(
        &self,
        flag_environment_id: Uuid,
    ) -> Result<Vec<FlagOverrideRow>> {
        let rows = sqlx::query_as::<_, FlagOverrideRow>(
            "SELECT * FROM flag_overrides WHERE flag_environment_id = ?",
        )
        .bind(flag_environment_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_sdk_key(
        &self,
        environment_id: Uuid,
        name: &str,
        key_type: &str,
        key_hash: &str,
        key_prefix: &str,
    ) -> Result<SdkKeyRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, SdkKeyRow>(
            &format!(
                "INSERT INTO sdk_keys (id, environment_id, name, key_type, key_hash, key_prefix)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING {SDK_KEY_COLS}"
            ),
        )
        .bind(id)
        .bind(environment_id)
        .bind(name)
        .bind(key_type)
        .bind(key_hash)
        .bind(key_prefix)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn update_sdk_key_last_used(&self, key_id: Uuid) -> Result<()> {
        sqlx::query("UPDATE sdk_keys SET last_used_at = datetime('now') WHERE id = ?")
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
            &format!(
                "SELECT sk.id, sk.environment_id, sk.name, sk.key_type, sk.key_hash, sk.key_prefix, sk.last_used_at, sk.created_at, sk.revoked_at
             FROM sdk_keys sk
             JOIN environments e ON sk.environment_id = e.id
             WHERE e.project_id = ?
             ORDER BY sk.created_at DESC"
            ),
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn revoke_sdk_key(&self, key_id: Uuid) -> Result<SdkKeyRow> {
        let row = sqlx::query_as::<_, SdkKeyRow>(
            &format!(
                "UPDATE sdk_keys SET revoked_at = datetime('now') WHERE id = ? RETURNING {SDK_KEY_COLS}"
            ),
        )
        .bind(key_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    // ============================================================
    // Management API keys (CI / automation)
    // ============================================================

    pub async fn create_management_api_key(
        &self,
        project_id: Uuid,
        name: &str,
        key_hash: &str,
        key_prefix: &str,
    ) -> Result<ManagementApiKeyRow> {
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, ManagementApiKeyRow>(
            &format!(
                "INSERT INTO management_api_keys (id, project_id, name, key_hash, key_prefix)
                 VALUES (?, ?, ?, ?, ?) RETURNING {MGMT_KEY_COLS}"
            ),
        )
        .bind(id)
        .bind(project_id)
        .bind(name)
        .bind(key_hash)
        .bind(key_prefix)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn list_management_api_keys(
        &self,
        project_id: Uuid,
    ) -> Result<Vec<ManagementApiKeyRow>> {
        let rows = sqlx::query_as::<_, ManagementApiKeyRow>(
            &format!(
                "SELECT {MGMT_KEY_COLS} FROM management_api_keys
                 WHERE project_id = ? ORDER BY created_at DESC"
            ),
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn revoke_management_api_key(&self, key_id: Uuid) -> Result<ManagementApiKeyRow> {
        let row = sqlx::query_as::<_, ManagementApiKeyRow>(
            &format!(
                "UPDATE management_api_keys SET revoked_at = datetime('now')
                 WHERE id = ? RETURNING {MGMT_KEY_COLS}"
            ),
        )
        .bind(key_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn resolve_management_api_key(
        &self,
        key_hash: &str,
    ) -> Result<Option<ManagementApiKeyRow>> {
        let row = sqlx::query_as::<_, ManagementApiKeyRow>(
            &format!(
                "SELECT {MGMT_KEY_COLS} FROM management_api_keys
                 WHERE key_hash = ? AND revoked_at IS NULL"
            ),
        )
        .bind(key_hash)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn update_management_api_key_last_used(&self, key_id: Uuid) -> Result<()> {
        sqlx::query("UPDATE management_api_keys SET last_used_at = datetime('now') WHERE id = ?")
            .bind(key_id)
            .execute(&self.pool)
            .await?;
        Ok(())
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
            "SELECT * FROM flag_environments WHERE flag_id = ?",
        )
        .bind(flag_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn build_flags_config(
        &self,
        project_id: Uuid,
        environment_id: Uuid,
    ) -> Result<eval::FlagsConfig> {
        let flags = self.list_flags(project_id).await?;
        let all_segments = self.list_segments(project_id).await?;

        let mut flag_configs = std::collections::HashMap::new();
        let mut segment_map = std::collections::HashMap::new();

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

        let version_row = sqlx::query_as::<_, ConfigVersionRow>(
            "SELECT * FROM config_versions WHERE environment_id = ?",
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

    pub async fn increment_config_version(&self, environment_id: Uuid) -> Result<i64> {
        let row = sqlx::query_as::<_, ConfigVersionRow>(
            "UPDATE config_versions SET version = version + 1, updated_at = datetime('now')
             WHERE environment_id = ? RETURNING *",
        )
        .bind(environment_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.version)
    }

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
        let ctx = AuditContext::system("legacy");
        self.create_audit_log_enriched(
            project_id,
            &ctx,
            action,
            entity_type,
            entity_id,
            before_state,
            after_state,
            None,
            None,
            None,
            None,
            None,
            actor_email.map(ToString::to_string),
        )
        .await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_audit_log_enriched(
        &self,
        project_id: Uuid,
        ctx: &AuditContext,
        action: &str,
        entity_type: &str,
        entity_id: Option<Uuid>,
        before_state: Option<&serde_json::Value>,
        after_state: Option<&serde_json::Value>,
        diff: Option<&serde_json::Value>,
        metadata: Option<&serde_json::Value>,
        severity_override: Option<&str>,
        environment_id: Option<Uuid>,
        environment_name: Option<&str>,
        actor_email_override: Option<String>,
    ) -> Result<AuditLogRow> {
        let severity = severity_override.unwrap_or("info");
        let metadata_json = metadata.cloned().unwrap_or_else(|| serde_json::json!({}));
        let id = Uuid::new_v4();
        let row = sqlx::query_as::<_, AuditLogRow>(
            "INSERT INTO audit_log (
                id, project_id, actor_id, actor_email, actor_type, actor_name, action,
                entity_type, entity_id, before_state, after_state, diff, metadata,
                severity, environment_id, environment_name, ip_address, user_agent, request_id
             ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?
             ) RETURNING
                id, project_id, actor_id, actor_email, actor_type, actor_name, action, entity_type, entity_id,
                before_state, after_state, diff, metadata, severity, environment_id, environment_name,
                ip_address, user_agent, request_id, created_at",
        )
        .bind(id)
        .bind(project_id)
        .bind(ctx.actor_id)
        .bind(actor_email_override.or_else(|| ctx.actor_email.clone()))
        .bind(ctx.actor_type.as_str())
        .bind(ctx.actor_name.clone())
        .bind(action)
        .bind(entity_type)
        .bind(entity_id)
        .bind(before_state)
        .bind(after_state)
        .bind(diff)
        .bind(metadata_json)
        .bind(severity)
        .bind(environment_id)
        .bind(environment_name)
        .bind(ctx.ip_address.map(|ip| ip.to_string()))
        .bind(ctx.user_agent.clone())
        .bind(ctx.request_id)
        .fetch_one(&self.pool)
        .await
        .inspect_err(|e| {
            tracing::warn!(
                error = %e,
                action,
                entity_type,
                %project_id,
                "audit log insert failed"
            )
        })?;
        Ok(row)
    }

    // ============================================================
    // Lifecycle / tech-debt management
    // ============================================================

    pub async fn update_flag_lifecycle(
        &self,
        flag_id: Uuid,
        owner_email: Option<&str>,
        owner_name: Option<&str>,
        lifecycle_status: Option<&str>,
        stale_threshold_days: Option<i32>,
    ) -> Result<FlagRow> {
        let row = sqlx::query_as::<_, FlagRow>(
            &format!(
                "UPDATE flags SET
                    owner_email          = COALESCE(?, owner_email),
                    owner_name           = COALESCE(?, owner_name),
                    lifecycle_status     = COALESCE(?, lifecycle_status),
                    stale_threshold_days = COALESCE(?, stale_threshold_days)
                 WHERE id = ?
                 RETURNING {FLAG_COLS}"
            ),
        )
        .bind(owner_email)
        .bind(owner_name)
        .bind(lifecycle_status)
        .bind(stale_threshold_days)
        .bind(flag_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    /// Returns flags that haven't been meaningfully changed in `default_threshold_days` days,
    /// are not archived, are not already in `scheduled_cleanup`, and are enabled in at least
    /// one environment. Ordered most-stale first.
    pub async fn get_stale_flags(
        &self,
        project_id: Uuid,
        default_threshold_days: i64,
    ) -> Result<Vec<StaleFlagRow>> {
        let rows = sqlx::query_as::<_, StaleFlagRow>(
            "SELECT * FROM (
                SELECT
                    f.id, f.project_id, f.key, f.name, f.description, f.flag_type,
                    f.tags, f.owner_email, f.owner_name, f.lifecycle_status,
                    f.stale_threshold_days, f.created_at,
                    MAX(al.created_at) AS last_activity_at,
                    CAST(
                        julianday('now') -
                        julianday(COALESCE(MAX(al.created_at), f.created_at))
                        AS INTEGER
                    ) AS staleness_days,
                    (SELECT COUNT(*) FROM flag_code_references cr
                     WHERE cr.flag_id = f.id) AS code_ref_count
                FROM flags f
                LEFT JOIN audit_log al
                    ON  al.entity_id = f.id
                    AND al.action IN (
                        'flag_updated', 'flag_toggled',
                        'rule_created', 'rule_updated', 'rule_deleted',
                        'override_upserted', 'override_deleted'
                    )
                WHERE f.project_id = ?
                  AND f.archived = 0
                  AND f.lifecycle_status != 'scheduled_cleanup'
                  AND EXISTS (
                      SELECT 1 FROM flag_environments fe
                      WHERE fe.flag_id = f.id AND fe.enabled = 1
                  )
                GROUP BY f.id
            ) stale
            WHERE staleness_days > COALESCE(stale_threshold_days, ?)
            ORDER BY staleness_days DESC",
        )
        .bind(project_id)
        .bind(default_threshold_days)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    /// All non-archived flags with lifecycle metadata and code-ref counts (not limited to stale).
    pub async fn get_lifecycle_flags(&self, project_id: Uuid) -> Result<Vec<StaleFlagRow>> {
        let rows = sqlx::query_as::<_, StaleFlagRow>(
            "SELECT
                f.id, f.project_id, f.key, f.name, f.description, f.flag_type,
                f.tags, f.owner_email, f.owner_name, f.lifecycle_status,
                f.stale_threshold_days, f.created_at,
                MAX(al.created_at) AS last_activity_at,
                CAST(
                    julianday('now') -
                    julianday(COALESCE(MAX(al.created_at), f.created_at))
                    AS INTEGER
                ) AS staleness_days,
                (SELECT COUNT(*) FROM flag_code_references cr
                 WHERE cr.flag_id = f.id) AS code_ref_count
            FROM flags f
            LEFT JOIN audit_log al
                ON  al.entity_id = f.id
                AND al.action IN (
                    'flag_updated', 'flag_toggled',
                    'rule_created', 'rule_updated', 'rule_deleted',
                    'override_upserted', 'override_deleted'
                )
            WHERE f.project_id = ?
              AND f.archived = 0
            GROUP BY f.id
            ORDER BY code_ref_count DESC, f.key ASC",
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    /// Idempotently replaces all code references for a flag+branch pair.
    pub async fn upsert_code_references(
        &self,
        flag_id: Uuid,
        project_id: Uuid,
        branch: Option<&str>,
        refs: &[CodeRefInput],
    ) -> Result<()> {
        let mut tx = self.pool.begin().await?;

        // Remove previous refs for this flag+branch so this call is idempotent.
        sqlx::query(
            "DELETE FROM flag_code_references WHERE flag_id = ? AND (branch = ? OR (branch IS NULL AND ? IS NULL))",
        )
        .bind(flag_id)
        .bind(branch)
        .bind(branch)
        .execute(&mut *tx)
        .await?;

        for r in refs {
            let id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO flag_code_references
                    (id, flag_id, project_id, repo, branch, commit_sha, file_path, line_number, snippet)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(id)
            .bind(flag_id)
            .bind(project_id)
            .bind(r.repo.as_deref())
            .bind(r.branch.as_deref())
            .bind(r.commit_sha.as_deref())
            .bind(&r.file_path)
            .bind(r.line_number)
            .bind(r.snippet.as_deref())
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_code_references(&self, flag_id: Uuid) -> Result<Vec<CodeReferenceRow>> {
        let rows = sqlx::query_as::<_, CodeReferenceRow>(
            "SELECT id, flag_id, project_id, repo, branch, commit_sha,
                    file_path, line_number, snippet, scanned_at
             FROM flag_code_references
             WHERE flag_id = ?
             ORDER BY file_path, line_number",
        )
        .bind(flag_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn list_audit_log(
        &self,
        project_id: Uuid,
        actor_email: Option<&str>,
        action: Option<&str>,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
        severity: Option<&str>,
        environment_id: Option<Uuid>,
        since_hours: Option<i64>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLogRow>> {
        let rows = sqlx::query_as::<_, AuditLogRow>(
            "SELECT
                id, project_id, actor_id, actor_email, actor_type, actor_name, action, entity_type, entity_id,
                before_state, after_state, diff, metadata, severity, environment_id, environment_name,
                ip_address, user_agent, request_id, created_at
             FROM audit_log
             WHERE project_id = ?
               AND (? IS NULL OR actor_email = ?)
               AND (? IS NULL OR action = ?)
               AND (? IS NULL OR entity_type = ?)
               AND (? IS NULL OR entity_id = ?)
               AND (? IS NULL OR severity = ?)
               AND (? IS NULL OR environment_id = ?)
               AND (? IS NULL OR created_at >= datetime('now', '-' || ? || ' hours'))
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?",
        )
        .bind(project_id)
        .bind(actor_email)
        .bind(actor_email)
        .bind(action)
        .bind(action)
        .bind(entity_type)
        .bind(entity_type)
        .bind(entity_id)
        .bind(entity_id)
        .bind(severity)
        .bind(severity)
        .bind(environment_id)
        .bind(environment_id)
        .bind(since_hours)
        .bind(since_hours)
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
