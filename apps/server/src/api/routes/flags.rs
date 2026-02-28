use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::state::AppState;

// ============================================================
// Request/Response types
// ============================================================

#[derive(Debug, Deserialize)]
pub struct CreateFlagRequest {
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default = "default_flag_type")]
    pub flag_type: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub variants: Vec<CreateVariantInput>,
    pub default_variant_key: String,
}

fn default_flag_type() -> String {
    "boolean".to_string()
}

#[derive(Debug, Deserialize)]
pub struct CreateVariantInput {
    pub key: String,
    pub value: serde_json::Value,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFlagRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub archived: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ToggleFlagRequest {
    pub enabled: bool,
    pub environment_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct FlagResponse {
    pub id: String,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub flag_type: String,
    pub tags: Vec<String>,
    pub archived: bool,
    pub variants: Vec<VariantResponse>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct VariantResponse {
    pub id: String,
    pub key: String,
    pub value: serde_json::Value,
    pub description: Option<String>,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

/// Publish config change events for all environments in a project.
async fn notify_config_change(state: &AppState, project_id: Uuid) {
    let environments = match state.store.list_environments(project_id).await {
        Ok(envs) => envs,
        Err(e) => {
            tracing::error!("Failed to list environments for notification: {e}");
            return;
        }
    };

    for env in environments {
        let version = state
            .store
            .increment_config_version(env.id)
            .await
            .unwrap_or(0);

        if let Some(ref redis) = state.redis {
            let _ = redis.invalidate_config(env.id).await;
            let _ = redis.publish_config_change(env.id, version).await;
        }
    }
}

// ============================================================
// Handlers
// ============================================================

pub async fn create_flag(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
    Json(req): Json<CreateFlagRequest>,
) -> Result<(StatusCode, Json<FlagResponse>), ApiError> {
    // Create the flag
    let flag = state
        .store
        .create_flag(
            project_id,
            &req.key,
            &req.name,
            req.description.as_deref(),
            &req.flag_type,
            &req.tags,
        )
        .await
        .map_err(|e| err(StatusCode::CONFLICT, &e.to_string()))?;

    // Create variants
    let mut variant_responses = Vec::new();
    let mut default_variant_id = None;

    for (i, v) in req.variants.iter().enumerate() {
        let variant = state
            .store
            .create_flag_variant(flag.id, &v.key, &v.value, v.description.as_deref(), i as i32)
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

        if v.key == req.default_variant_key {
            default_variant_id = Some(variant.id);
        }

        variant_responses.push(VariantResponse {
            id: variant.id.to_string(),
            key: variant.key,
            value: variant.value,
            description: variant.description,
        });
    }

    // Create flag_environment entries for all environments
    let environments = state
        .store
        .list_environments(project_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    for env in &environments {
        state
            .store
            .create_flag_environment(flag.id, env.id, false, default_variant_id)
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    }

    notify_config_change(&state, project_id).await;

    Ok((
        StatusCode::CREATED,
        Json(FlagResponse {
            id: flag.id.to_string(),
            key: flag.key,
            name: flag.name,
            description: flag.description,
            flag_type: flag.flag_type,
            tags: flag.tags,
            archived: flag.archived,
            variants: variant_responses,
            created_at: flag.created_at.to_rfc3339(),
            updated_at: flag.updated_at.to_rfc3339(),
        }),
    ))
}

pub async fn list_flags(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<Vec<FlagResponse>>, ApiError> {
    let flags = state
        .store
        .list_flags(project_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let mut responses = Vec::new();
    for flag in flags {
        let variants = state
            .store
            .get_flag_variants(flag.id)
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

        responses.push(FlagResponse {
            id: flag.id.to_string(),
            key: flag.key,
            name: flag.name,
            description: flag.description,
            flag_type: flag.flag_type,
            tags: flag.tags,
            archived: flag.archived,
            variants: variants
                .into_iter()
                .map(|v| VariantResponse {
                    id: v.id.to_string(),
                    key: v.key,
                    value: v.value,
                    description: v.description,
                })
                .collect(),
            created_at: flag.created_at.to_rfc3339(),
            updated_at: flag.updated_at.to_rfc3339(),
        });
    }

    Ok(Json(responses))
}

pub async fn get_flag(
    State(state): State<AppState>,
    Path((project_id, flag_key)): Path<(Uuid, String)>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<FlagResponse>, ApiError> {
    let flag = state
        .store
        .get_flag_by_key(project_id, &flag_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag not found"))?;

    let variants = state
        .store
        .get_flag_variants(flag.id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    Ok(Json(FlagResponse {
        id: flag.id.to_string(),
        key: flag.key,
        name: flag.name,
        description: flag.description,
        flag_type: flag.flag_type,
        tags: flag.tags,
        archived: flag.archived,
        variants: variants
            .into_iter()
            .map(|v| VariantResponse {
                id: v.id.to_string(),
                key: v.key,
                value: v.value,
                description: v.description,
            })
            .collect(),
        created_at: flag.created_at.to_rfc3339(),
        updated_at: flag.updated_at.to_rfc3339(),
    }))
}

pub async fn update_flag(
    State(state): State<AppState>,
    Path((project_id, flag_key)): Path<(Uuid, String)>,
    Extension(_auth): Extension<AuthInfo>,
    Json(req): Json<UpdateFlagRequest>,
) -> Result<Json<FlagResponse>, ApiError> {
    let flag = state
        .store
        .get_flag_by_key(project_id, &flag_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag not found"))?;

    let updated = state
        .store
        .update_flag(
            flag.id,
            req.name.as_deref(),
            req.description.as_deref(),
            req.tags.as_deref(),
            req.archived,
        )
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    notify_config_change(&state, project_id).await;

    let variants = state
        .store
        .get_flag_variants(updated.id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    Ok(Json(FlagResponse {
        id: updated.id.to_string(),
        key: updated.key,
        name: updated.name,
        description: updated.description,
        flag_type: updated.flag_type,
        tags: updated.tags,
        archived: updated.archived,
        variants: variants
            .into_iter()
            .map(|v| VariantResponse {
                id: v.id.to_string(),
                key: v.key,
                value: v.value,
                description: v.description,
            })
            .collect(),
        created_at: updated.created_at.to_rfc3339(),
        updated_at: updated.updated_at.to_rfc3339(),
    }))
}

pub async fn delete_flag(
    State(state): State<AppState>,
    Path((project_id, flag_key)): Path<(Uuid, String)>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<StatusCode, ApiError> {
    let flag = state
        .store
        .get_flag_by_key(project_id, &flag_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag not found"))?;

    state
        .store
        .delete_flag(flag.id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    notify_config_change(&state, project_id).await;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn toggle_flag(
    State(state): State<AppState>,
    Path((project_id, flag_key)): Path<(Uuid, String)>,
    Extension(_auth): Extension<AuthInfo>,
    Json(req): Json<ToggleFlagRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let flag = state
        .store
        .get_flag_by_key(project_id, &flag_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag not found"))?;

    let fe = state
        .store
        .toggle_flag(flag.id, req.environment_id, req.enabled)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    // Invalidate cache + bump version + publish change
    let version = state
        .store
        .increment_config_version(req.environment_id)
        .await
        .unwrap_or(0);

    if let Some(ref redis) = state.redis {
        let _ = redis.invalidate_config(req.environment_id).await;
        let _ = redis
            .publish_config_change(req.environment_id, version)
            .await;
    }

    Ok(Json(serde_json::json!({
        "flag_key": flag_key,
        "environment_id": req.environment_id,
        "enabled": fe.enabled,
    })))
}
