use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ============================================================
// Database row types
// ============================================================

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct OrganizationRow {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct ProjectRow {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct EnvironmentRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub slug: String,
    pub color: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct FlagRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub flag_type: String,
    pub tags: Vec<String>,
    pub archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct FlagVariantRow {
    pub id: Uuid,
    pub flag_id: Uuid,
    pub key: String,
    pub value: serde_json::Value,
    pub description: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct FlagEnvironmentRow {
    pub id: Uuid,
    pub flag_id: Uuid,
    pub environment_id: Uuid,
    pub enabled: bool,
    pub default_variant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct SegmentRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub match_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct SegmentConstraintRow {
    pub id: Uuid,
    pub segment_id: Uuid,
    pub attribute: String,
    pub operator: String,
    pub values: Vec<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct TargetingRuleRow {
    pub id: Uuid,
    pub flag_environment_id: Uuid,
    pub rank: i32,
    pub description: Option<String>,
    pub variant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct RuleSegmentRow {
    pub id: Uuid,
    pub rule_id: Uuid,
    pub segment_id: Uuid,
    pub negate: bool,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct RuleDistributionRow {
    pub id: Uuid,
    pub rule_id: Uuid,
    pub variant_id: Uuid,
    pub rollout_pct: i32,
    pub sort_order: i32,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct FlagOverrideRow {
    pub id: Uuid,
    pub flag_environment_id: Uuid,
    pub targeting_key: String,
    pub variant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct SdkKeyRow {
    pub id: Uuid,
    pub environment_id: Uuid,
    pub name: String,
    pub key_type: String,
    pub key_hash: String,
    pub key_prefix: String,
    pub last_used_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct AuditLogRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub actor_id: Option<Uuid>,
    pub actor_email: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub before_state: Option<serde_json::Value>,
    pub after_state: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct ConfigVersionRow {
    pub environment_id: Uuid,
    pub version: i64,
    pub updated_at: DateTime<Utc>,
}
