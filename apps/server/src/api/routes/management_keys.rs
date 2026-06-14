use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::{require_dashboard_user, AuthInfo};
use crate::audit::{AuditAction, AuditContext};
use crate::auth::api_keys;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateManagementKeyRequest {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct ManagementKeyResponse {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub key_prefix: String,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub revoked_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateManagementKeyResponse {
    #[serde(flatten)]
    pub key: ManagementKeyResponse,
    pub raw_key: String,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

pub async fn list_management_keys(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(auth): Extension<AuthInfo>,
) -> Result<Json<Vec<ManagementKeyResponse>>, ApiError> {
    require_dashboard_user(&auth).map_err(|s| err(s, "Dashboard session required"))?;

    let keys = state
        .store
        .list_management_api_keys(project_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let responses = keys
        .into_iter()
        .map(|k| ManagementKeyResponse {
            id: k.id.to_string(),
            project_id: k.project_id.to_string(),
            name: k.name,
            key_prefix: k.key_prefix,
            last_used_at: k.last_used_at.map(|t| t.to_rfc3339()),
            created_at: k.created_at.to_rfc3339(),
            revoked_at: k.revoked_at.map(|t| t.to_rfc3339()),
        })
        .collect();

    Ok(Json(responses))
}

pub async fn create_management_key(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
    Json(req): Json<CreateManagementKeyRequest>,
) -> Result<(StatusCode, Json<CreateManagementKeyResponse>), ApiError> {
    require_dashboard_user(&auth).map_err(|s| err(s, "Dashboard session required"))?;

    if req.name.trim().is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "Name is required"));
    }

    let (raw_key, key_hash, key_prefix) = api_keys::generate_management_key();

    let key = state
        .store
        .create_management_api_key(project_id, req.name.trim(), &key_hash, &key_prefix)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let _ = state
        .store
        .create_audit_log_enriched(
            project_id,
            &audit_ctx,
            AuditAction::ManagementKeyCreated.as_str(),
            "management_api_key",
            Some(key.id),
            None,
            Some(&serde_json::json!({ "name": key.name, "key_prefix": key.key_prefix })),
            None,
            None,
            Some(AuditAction::ManagementKeyCreated.severity().as_str()),
            None,
            None,
            None,
        )
        .await;

    Ok((
        StatusCode::CREATED,
        Json(CreateManagementKeyResponse {
            key: ManagementKeyResponse {
                id: key.id.to_string(),
                project_id: key.project_id.to_string(),
                name: key.name,
                key_prefix: key.key_prefix,
                last_used_at: None,
                created_at: key.created_at.to_rfc3339(),
                revoked_at: None,
            },
            raw_key,
        }),
    ))
}

pub async fn revoke_management_key(
    State(state): State<AppState>,
    Path((project_id, key_id)): Path<(Uuid, Uuid)>,
    Extension(auth): Extension<AuthInfo>,
    Extension(audit_ctx): Extension<AuditContext>,
) -> Result<Json<ManagementKeyResponse>, ApiError> {
    require_dashboard_user(&auth).map_err(|s| err(s, "Dashboard session required"))?;

    let key = state
        .store
        .revoke_management_api_key(key_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    if key.project_id != project_id {
        return Err(err(StatusCode::NOT_FOUND, "Key not found"));
    }

    let _ = state
        .store
        .create_audit_log_enriched(
            project_id,
            &audit_ctx,
            AuditAction::ManagementKeyRevoked.as_str(),
            "management_api_key",
            Some(key.id),
            None,
            None,
            None,
            None,
            Some(AuditAction::ManagementKeyRevoked.severity().as_str()),
            None,
            None,
            None,
        )
        .await;

    Ok(Json(ManagementKeyResponse {
        id: key.id.to_string(),
        project_id: key.project_id.to_string(),
        name: key.name,
        key_prefix: key.key_prefix,
        last_used_at: key.last_used_at.map(|t| t.to_rfc3339()),
        created_at: key.created_at.to_rfc3339(),
        revoked_at: key.revoked_at.map(|t| t.to_rfc3339()),
    }))
}
