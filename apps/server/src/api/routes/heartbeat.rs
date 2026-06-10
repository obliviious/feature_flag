use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::{Deserialize, Serialize};

use crate::api::middleware::auth::AuthInfo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct HeartbeatRequest {
    pub sdk_instance_id: String,
    pub sdk_version: Option<String>,
    pub runtime: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HeartbeatResponse {
    pub tracking_enabled: bool,
    pub environment_id: String,
    pub project_id: String,
    pub server_timestamp: i64,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

/// Record SDK heartbeat for connection visibility and operational metrics.
pub async fn heartbeat(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthInfo>,
    Json(req): Json<HeartbeatRequest>,
) -> Result<Json<HeartbeatResponse>, ApiError> {
    let (environment_id, project_id, key_type) = match auth {
        AuthInfo::SdkKey {
            environment_id,
            project_id,
            key_type,
            ..
        } => (environment_id, project_id, key_type),
        _ => {
            return Err(err(
                StatusCode::FORBIDDEN,
                "Heartbeat requires SDK key authentication",
            ));
        }
    };

    if req.sdk_instance_id.trim().is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "sdk_instance_id is required"));
    }

    let now = chrono::Utc::now().timestamp();
    let sdk_version = req.sdk_version.unwrap_or_else(|| "unknown".to_string());
    let runtime = req.runtime.unwrap_or_else(|| "unknown".to_string());

    if let Some(ref redis) = state.redis {
        redis
            .record_sdk_heartbeat(
                environment_id,
                now,
                &req.sdk_instance_id,
                &sdk_version,
                &key_type,
                &runtime,
            )
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

        let stale_before = now - 300;
        let _ = redis
            .cleanup_stale_sdk_connections(environment_id, stale_before)
            .await;
    }

    Ok(Json(HeartbeatResponse {
        tracking_enabled: state.redis.is_some(),
        environment_id: environment_id.to_string(),
        project_id: project_id.to_string(),
        server_timestamp: now,
    }))
}
