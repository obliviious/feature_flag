use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::audit::{AuditAction, AuditContext};
use crate::auth::api_keys;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateSdkKeyRequest {
    pub environment_id: Uuid,
    pub name: String,
    #[serde(default = "default_key_type")]
    pub key_type: String,
}

fn default_key_type() -> String {
    "server".to_string()
}

#[derive(Debug, Serialize)]
pub struct SdkKeyResponse {
    pub id: String,
    pub environment_id: String,
    pub name: String,
    pub key_type: String,
    pub key_prefix: String,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub revoked_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateSdkKeyResponse {
    #[serde(flatten)]
    pub key: SdkKeyResponse,
    pub raw_key: String,
}

#[derive(Debug, Deserialize)]
pub struct SdkConnectionsQuery {
    #[serde(default = "default_active_window_secs")]
    pub active_window_secs: i64,
}

fn default_active_window_secs() -> i64 {
    60
}

#[derive(Debug, Serialize)]
pub struct SdkConnectionEnvironmentSummary {
    pub environment_id: String,
    pub environment_name: String,
    pub environment_slug: String,
    pub active_count: usize,
    pub last_heartbeat_ts: Option<i64>,
    pub active_instances: Vec<crate::store::redis::SdkConnectionInfo>,
}

#[derive(Debug, Serialize)]
pub struct SdkConnectionsResponse {
    pub tracking_enabled: bool,
    pub project_id: String,
    pub active_window_secs: i64,
    pub generated_at: i64,
    pub total_active_instances: usize,
    pub environments_with_connections: usize,
    pub environments_without_connections: usize,
    pub environments: Vec<SdkConnectionEnvironmentSummary>,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

pub async fn sdk_connections(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Query(query): Query<SdkConnectionsQuery>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<SdkConnectionsResponse>, ApiError> {
    let now = chrono::Utc::now().timestamp();
    let active_window_secs = query.active_window_secs.clamp(10, 3600);
    let active_since = now - active_window_secs;
    let stale_before = now - 300;

    let environments = state
        .store
        .list_environments(project_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    if let Some(ref redis) = state.redis {
        let mut env_summaries = Vec::with_capacity(environments.len());
        let mut total_active = 0usize;
        let mut with_connections = 0usize;

        for env in environments {
            let _ = redis
                .cleanup_stale_sdk_connections(env.id, stale_before)
                .await;
            let active_instances = redis
                .list_active_sdk_connections(env.id, active_since)
                .await
                .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
            let active_count = active_instances.len();
            let last_heartbeat_ts = active_instances
                .iter()
                .map(|i| i.last_heartbeat_ts)
                .max();

            if active_count > 0 {
                with_connections += 1;
            }
            total_active += active_count;

            env_summaries.push(SdkConnectionEnvironmentSummary {
                environment_id: env.id.to_string(),
                environment_name: env.name,
                environment_slug: env.slug,
                active_count,
                last_heartbeat_ts,
                active_instances,
            });
        }

        let without_connections = env_summaries.len().saturating_sub(with_connections);
        return Ok(Json(SdkConnectionsResponse {
            tracking_enabled: true,
            project_id: project_id.to_string(),
            active_window_secs,
            generated_at: now,
            total_active_instances: total_active,
            environments_with_connections: with_connections,
            environments_without_connections: without_connections,
            environments: env_summaries,
        }));
    }

    let environments_empty = environments
        .into_iter()
        .map(|env| SdkConnectionEnvironmentSummary {
            environment_id: env.id.to_string(),
            environment_name: env.name,
            environment_slug: env.slug,
            active_count: 0,
            last_heartbeat_ts: None,
            active_instances: Vec::new(),
        })
        .collect::<Vec<_>>();

    Ok(Json(SdkConnectionsResponse {
        tracking_enabled: false,
        project_id: project_id.to_string(),
        active_window_secs,
        generated_at: now,
        total_active_instances: 0,
        environments_with_connections: 0,
        environments_without_connections: environments_empty.len(),
        environments: environments_empty,
    }))
}

pub async fn list_sdk_keys(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<Vec<SdkKeyResponse>>, ApiError> {
    let keys = state
        .store
        .list_sdk_keys_for_project(project_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let responses: Vec<SdkKeyResponse> = keys
        .into_iter()
        .map(|k| SdkKeyResponse {
            id: k.id.to_string(),
            environment_id: k.environment_id.to_string(),
            name: k.name,
            key_type: k.key_type,
            key_prefix: k.key_prefix,
            last_used_at: k.last_used_at.map(|t| t.to_rfc3339()),
            created_at: k.created_at.to_rfc3339(),
            revoked_at: k.revoked_at.map(|t| t.to_rfc3339()),
        })
        .collect();

    Ok(Json(responses))
}

pub async fn create_sdk_key(
    State(state): State<AppState>,
    Path(_project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
    Json(req): Json<CreateSdkKeyRequest>,
) -> Result<(StatusCode, Json<CreateSdkKeyResponse>), ApiError> {
    let prefix = if req.key_type == "client" {
        "cli_"
    } else {
        "srv_"
    };

    let (raw_key, key_hash, key_prefix) = api_keys::generate_sdk_key(prefix);

    let key = state
        .store
        .create_sdk_key(
            req.environment_id,
            &req.name,
            &req.key_type,
            &key_hash,
            &key_prefix,
        )
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let _ = state
        .store
        .create_audit_log_enriched(
            _project_id,
            &audit_ctx,
            AuditAction::SdkKeyCreated.as_str(),
            "sdk_key",
            Some(key.id),
            None,
            None,
            None,
            None,
            Some(AuditAction::SdkKeyCreated.severity().as_str()),
            Some(key.environment_id),
            None,
            None,
        )
        .await;

    Ok((
        StatusCode::CREATED,
        Json(CreateSdkKeyResponse {
            key: SdkKeyResponse {
                id: key.id.to_string(),
                environment_id: key.environment_id.to_string(),
                name: key.name,
                key_type: key.key_type,
                key_prefix: key.key_prefix,
                last_used_at: None,
                created_at: key.created_at.to_rfc3339(),
                revoked_at: None,
            },
            raw_key,
        }),
    ))
}

pub async fn revoke_sdk_key(
    State(state): State<AppState>,
    Path((_project_id, key_id)): Path<(Uuid, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
) -> Result<Json<SdkKeyResponse>, ApiError> {
    let key = state
        .store
        .revoke_sdk_key(key_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    state.invalidate_local_sdk_auth(&key.key_hash).await;

    if let Some(ref redis) = state.redis {
        let _ = redis.invalidate_sdk_auth(&key.key_hash).await;
    }

    let _ = state
        .store
        .create_audit_log_enriched(
            _project_id,
            &audit_ctx,
            AuditAction::SdkKeyRevoked.as_str(),
            "sdk_key",
            Some(key.id),
            None,
            None,
            None,
            None,
            Some(AuditAction::SdkKeyRevoked.severity().as_str()),
            Some(key.environment_id),
            None,
            None,
        )
        .await;

    Ok(Json(SdkKeyResponse {
        id: key.id.to_string(),
        environment_id: key.environment_id.to_string(),
        name: key.name,
        key_type: key.key_type,
        key_prefix: key.key_prefix,
        last_used_at: key.last_used_at.map(|t| t.to_rfc3339()),
        created_at: key.created_at.to_rfc3339(),
        revoked_at: key.revoked_at.map(|t| t.to_rfc3339()),
    }))
}
