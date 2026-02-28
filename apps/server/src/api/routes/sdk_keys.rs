use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
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

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
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
        .create_audit_log(
            _project_id,
            None,
            "sdk_key_created",
            "sdk_key",
            Some(key.id),
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
) -> Result<Json<SdkKeyResponse>, ApiError> {
    let key = state
        .store
        .revoke_sdk_key(key_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let _ = state
        .store
        .create_audit_log(
            _project_id,
            None,
            "sdk_key_revoked",
            "sdk_key",
            Some(key.id),
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
