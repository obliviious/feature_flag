use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::audit::AuditContext;
use crate::state::AppState;

// ============================================================
// Shared helpers
// ============================================================

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

async fn resolve_flag_env_id(
    state: &AppState,
    project_id: Uuid,
    flag_key: &str,
    environment_id: Uuid,
) -> Result<(Uuid, Uuid), ApiError> {
    let flag = state
        .store
        .get_flag_by_key(project_id, flag_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag not found"))?;

    let fe_id = state
        .store
        .get_flag_environment_id(flag.id, environment_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag environment not found"))?;

    Ok((flag.id, fe_id))
}

// ============================================================
// Request / Response types
// ============================================================

/// One distribution bucket: variant_id + percentage (0–100, integer).
#[derive(Debug, Deserialize)]
pub struct DistributionInput {
    pub variant_id: Uuid,
    /// Percentage 0–100. Converted to basis points internally.
    pub percentage: u8,
}

#[derive(Debug, Deserialize)]
pub struct RuleSegmentInput {
    pub segment_id: Uuid,
    #[serde(default)]
    pub negate: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateRuleRequest {
    pub rank: i32,
    pub description: Option<String>,
    /// Serve a single variant (use this OR distributions, not both).
    pub variant_id: Option<Uuid>,
    #[serde(default)]
    pub segments: Vec<RuleSegmentInput>,
    #[serde(default)]
    pub distributions: Vec<DistributionInput>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRuleRequest {
    pub rank: Option<i32>,
    pub description: Option<String>,
    pub variant_id: Option<Uuid>,
    pub segments: Option<Vec<RuleSegmentInput>>,
    pub distributions: Option<Vec<DistributionInput>>,
}

#[derive(Debug, Serialize)]
pub struct RuleSegmentResponse {
    pub id: String,
    pub segment_id: String,
    pub negate: bool,
}

#[derive(Debug, Serialize)]
pub struct RuleDistributionResponse {
    pub id: String,
    pub variant_id: String,
    pub percentage: i32,
}

#[derive(Debug, Serialize)]
pub struct TargetingRuleResponse {
    pub id: String,
    pub flag_environment_id: String,
    pub rank: i32,
    pub description: Option<String>,
    pub variant_id: Option<String>,
    pub segments: Vec<RuleSegmentResponse>,
    pub distributions: Vec<RuleDistributionResponse>,
    pub created_at: String,
    pub updated_at: String,
}

async fn build_rule_response(
    state: &AppState,
    rule_id: Uuid,
    flag_environment_id: Uuid,
    rank: i32,
    description: Option<String>,
    variant_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
) -> Result<TargetingRuleResponse, ApiError> {
    let segs = state
        .store
        .get_rule_segments(rule_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    let dists = state
        .store
        .get_rule_distributions(rule_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    Ok(TargetingRuleResponse {
        id: rule_id.to_string(),
        flag_environment_id: flag_environment_id.to_string(),
        rank,
        description,
        variant_id: variant_id.map(|v| v.to_string()),
        segments: segs
            .into_iter()
            .map(|s| RuleSegmentResponse {
                id: s.id.to_string(),
                segment_id: s.segment_id.to_string(),
                negate: s.negate,
            })
            .collect(),
        distributions: dists
            .into_iter()
            .map(|d| RuleDistributionResponse {
                id: d.id.to_string(),
                variant_id: d.variant_id.to_string(),
                percentage: d.rollout_pct / 100,
            })
            .collect(),
        created_at: created_at.to_rfc3339(),
        updated_at: updated_at.to_rfc3339(),
    })
}

fn validate_distributions(dists: &[DistributionInput]) -> Result<(), ApiError> {
    let total: i32 = dists.iter().map(|d| d.percentage as i32).sum();
    if total != 100 {
        return Err(err(
            StatusCode::BAD_REQUEST,
            &format!("Distribution percentages must sum to 100 (got {total})"),
        ));
    }
    Ok(())
}

// ============================================================
// Handlers: Targeting Rules
// ============================================================

/// GET /flags/{flag_key}/environments/{environment_id}/rules
pub async fn list_rules(
    State(state): State<AppState>,
    Path((project_id, flag_key, environment_id)): Path<(Uuid, String, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<Vec<TargetingRuleResponse>>, ApiError> {
    let (_, fe_id) = resolve_flag_env_id(&state, project_id, &flag_key, environment_id).await?;

    let rules = state
        .store
        .get_targeting_rules(fe_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let mut responses = Vec::with_capacity(rules.len());
    for rule in rules {
        let resp = build_rule_response(
            &state,
            rule.id,
            rule.flag_environment_id,
            rule.rank,
            rule.description,
            rule.variant_id,
            rule.created_at,
            rule.updated_at,
        )
        .await?;
        responses.push(resp);
    }
    Ok(Json(responses))
}

/// POST /flags/{flag_key}/environments/{environment_id}/rules
pub async fn create_rule(
    State(state): State<AppState>,
    Path((project_id, flag_key, environment_id)): Path<(Uuid, String, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
    Json(req): Json<CreateRuleRequest>,
) -> Result<(StatusCode, Json<TargetingRuleResponse>), ApiError> {
    if req.variant_id.is_some() && !req.distributions.is_empty() {
        return Err(err(
            StatusCode::BAD_REQUEST,
            "Specify either variant_id or distributions, not both",
        ));
    }
    if !req.distributions.is_empty() {
        validate_distributions(&req.distributions)?;
    }

    let (flag_id, fe_id) =
        resolve_flag_env_id(&state, project_id, &flag_key, environment_id).await?;

    let rule = state
        .store
        .create_targeting_rule(fe_id, req.rank, req.description.as_deref(), req.variant_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let seg_pairs: Vec<(Uuid, bool)> = req.segments.iter().map(|s| (s.segment_id, s.negate)).collect();
    state
        .store
        .replace_rule_segments(rule.id, &seg_pairs)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let dist_pairs: Vec<(Uuid, i32)> = req
        .distributions
        .iter()
        .map(|d| (d.variant_id, (d.percentage as i32) * 100))
        .collect();
    state
        .store
        .replace_rule_distributions(rule.id, &dist_pairs)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    notify_flag_change(&state, project_id, &flag_key).await;

    let _ = state
        .store
        .create_audit_log_enriched(
            project_id,
            &audit_ctx,
            "rule_created",
            "flag",
            Some(flag_id),
            None,
            None,
            None,
            None,
            Some("info"),
            Some(environment_id),
            None,
            None,
        )
        .await;

    let resp = build_rule_response(
        &state,
        rule.id,
        rule.flag_environment_id,
        rule.rank,
        rule.description,
        rule.variant_id,
        rule.created_at,
        rule.updated_at,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(resp)))
}

/// PUT /flags/{flag_key}/environments/{environment_id}/rules/{rule_id}
pub async fn update_rule(
    State(state): State<AppState>,
    Path((project_id, flag_key, environment_id, rule_id)): Path<(Uuid, String, Uuid, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
    Json(req): Json<UpdateRuleRequest>,
) -> Result<Json<TargetingRuleResponse>, ApiError> {
    if let Some(ref dists) = req.distributions {
        if !dists.is_empty() {
            validate_distributions(dists)?;
        }
    }

    let (flag_id, _fe_id) =
        resolve_flag_env_id(&state, project_id, &flag_key, environment_id).await?;

    let rule = state
        .store
        .update_targeting_rule(
            rule_id,
            req.rank,
            req.description.as_deref(),
            req.variant_id,
        )
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    if let Some(segs) = req.segments {
        let pairs: Vec<(Uuid, bool)> = segs.iter().map(|s| (s.segment_id, s.negate)).collect();
        state
            .store
            .replace_rule_segments(rule_id, &pairs)
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    }

    if let Some(dists) = req.distributions {
        let pairs: Vec<(Uuid, i32)> = dists
            .iter()
            .map(|d| (d.variant_id, (d.percentage as i32) * 100))
            .collect();
        state
            .store
            .replace_rule_distributions(rule_id, &pairs)
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    }

    notify_flag_change(&state, project_id, &flag_key).await;

    let _ = state
        .store
        .create_audit_log_enriched(
            project_id,
            &audit_ctx,
            "rule_updated",
            "flag",
            Some(flag_id),
            None,
            None,
            None,
            None,
            Some("info"),
            Some(environment_id),
            None,
            None,
        )
        .await;

    let resp = build_rule_response(
        &state,
        rule.id,
        rule.flag_environment_id,
        rule.rank,
        rule.description,
        rule.variant_id,
        rule.created_at,
        rule.updated_at,
    )
    .await?;
    Ok(Json(resp))
}

/// DELETE /flags/{flag_key}/environments/{environment_id}/rules/{rule_id}
pub async fn delete_rule(
    State(state): State<AppState>,
    Path((project_id, flag_key, environment_id, rule_id)): Path<(Uuid, String, Uuid, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
) -> Result<StatusCode, ApiError> {
    let (flag_id, _) =
        resolve_flag_env_id(&state, project_id, &flag_key, environment_id).await?;

    state
        .store
        .delete_targeting_rule(rule_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    notify_flag_change(&state, project_id, &flag_key).await;

    let _ = state
        .store
        .create_audit_log_enriched(
            project_id,
            &audit_ctx,
            "rule_deleted",
            "flag",
            Some(flag_id),
            None,
            None,
            None,
            None,
            Some("warning"),
            Some(environment_id),
            None,
            None,
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

// ============================================================
// Handlers: Flag Overrides
// ============================================================

#[derive(Debug, Serialize)]
pub struct FlagOverrideResponse {
    pub id: String,
    pub targeting_key: String,
    pub variant_id: String,
    pub created_at: String,
}

/// GET /flags/{flag_key}/environments/{environment_id}/overrides
pub async fn list_overrides(
    State(state): State<AppState>,
    Path((project_id, flag_key, environment_id)): Path<(Uuid, String, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<Vec<FlagOverrideResponse>>, ApiError> {
    let (_, fe_id) = resolve_flag_env_id(&state, project_id, &flag_key, environment_id).await?;

    let overrides = state
        .store
        .get_flag_overrides(fe_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let resp = overrides
        .into_iter()
        .map(|o| FlagOverrideResponse {
            id: o.id.to_string(),
            targeting_key: o.targeting_key,
            variant_id: o.variant_id.to_string(),
            created_at: o.created_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(resp))
}

#[derive(Debug, Deserialize)]
pub struct UpsertOverrideRequest {
    pub targeting_key: String,
    pub variant_id: Uuid,
}

/// PUT /flags/{flag_key}/environments/{environment_id}/overrides
pub async fn upsert_override(
    State(state): State<AppState>,
    Path((project_id, flag_key, environment_id)): Path<(Uuid, String, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
    Json(req): Json<UpsertOverrideRequest>,
) -> Result<Json<FlagOverrideResponse>, ApiError> {
    if req.targeting_key.trim().is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "targeting_key cannot be empty"));
    }

    let (flag_id, fe_id) =
        resolve_flag_env_id(&state, project_id, &flag_key, environment_id).await?;

    let ovr = state
        .store
        .upsert_flag_override(fe_id, req.targeting_key.trim(), req.variant_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    notify_flag_change(&state, project_id, &flag_key).await;

    let _ = state
        .store
        .create_audit_log_enriched(
            project_id,
            &audit_ctx,
            "override_upserted",
            "flag",
            Some(flag_id),
            None,
            None,
            None,
            None,
            Some("info"),
            Some(environment_id),
            None,
            None,
        )
        .await;

    Ok(Json(FlagOverrideResponse {
        id: ovr.id.to_string(),
        targeting_key: ovr.targeting_key,
        variant_id: ovr.variant_id.to_string(),
        created_at: ovr.created_at.to_rfc3339(),
    }))
}

/// DELETE /flags/{flag_key}/environments/{environment_id}/overrides/{targeting_key}
pub async fn delete_override(
    State(state): State<AppState>,
    Path((project_id, flag_key, environment_id, targeting_key)): Path<(
        Uuid,
        String,
        Uuid,
        String,
    )>,
    Extension(_auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
) -> Result<StatusCode, ApiError> {
    let (flag_id, fe_id) =
        resolve_flag_env_id(&state, project_id, &flag_key, environment_id).await?;

    state
        .store
        .delete_flag_override(fe_id, &targeting_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    notify_flag_change(&state, project_id, &flag_key).await;

    let _ = state
        .store
        .create_audit_log_enriched(
            project_id,
            &audit_ctx,
            "override_deleted",
            "flag",
            Some(flag_id),
            None,
            None,
            None,
            None,
            Some("info"),
            Some(environment_id),
            None,
            None,
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

// ============================================================
// Internal helpers
// ============================================================

async fn notify_flag_change(state: &AppState, project_id: Uuid, flag_key: &str) {
    let environments = match state.store.list_environments(project_id).await {
        Ok(envs) => envs,
        Err(_) => return,
    };
    for env in environments {
        let version = state
            .store
            .increment_config_version(env.id)
            .await
            .unwrap_or(0);
        if let Some(ref redis) = state.redis {
            let _ = redis.invalidate_config(env.id).await;
            let seq = redis
                .next_config_change_seq()
                .await
                .unwrap_or_else(|_| chrono::Utc::now().timestamp_millis());
            let _ = redis
                .publish_config_change(
                    seq,
                    env.id,
                    version,
                    false,
                    &[flag_key.to_string()],
                    &[],
                )
                .await;
        }
    }
}
