use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    #[serde(default)]
    pub actor_email: Option<String>,
    #[serde(default)]
    pub action: Option<String>,
    #[serde(default)]
    pub entity_type: Option<String>,
    #[serde(default)]
    pub entity_id: Option<Uuid>,
    #[serde(default)]
    pub severity: Option<String>,
    #[serde(default)]
    pub environment_id: Option<Uuid>,
    #[serde(default)]
    pub since_hours: Option<i64>,
}

fn default_limit() -> i64 {
    50
}

#[derive(Debug, Serialize)]
pub struct AuditLogResponse {
    pub id: String,
    pub project_id: String,
    pub actor_id: Option<String>,
    pub actor_email: Option<String>,
    pub actor_type: Option<String>,
    pub actor_name: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub before_state: Option<serde_json::Value>,
    pub after_state: Option<serde_json::Value>,
    pub diff: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub severity: String,
    pub environment_id: Option<String>,
    pub environment_name: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<String>,
    pub created_at: String,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

pub async fn list_audit_log(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
    Query(query): Query<AuditLogQuery>,
) -> Result<Json<Vec<AuditLogResponse>>, ApiError> {
    let logs = state
        .store
        .list_audit_log(
            project_id,
            query.actor_email.as_deref(),
            query.action.as_deref(),
            query.entity_type.as_deref(),
            query.entity_id,
            query.severity.as_deref(),
            query.environment_id,
            query.since_hours,
            query.limit,
            query.offset,
        )
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let responses: Vec<AuditLogResponse> = logs
        .into_iter()
        .map(|log| AuditLogResponse {
            id: log.id.to_string(),
            project_id: log.project_id.to_string(),
            actor_id: log.actor_id.map(|id| id.to_string()),
            actor_email: log.actor_email,
            actor_type: log.actor_type,
            actor_name: log.actor_name,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id.map(|id| id.to_string()),
            before_state: log.before_state,
            after_state: log.after_state,
            diff: log.diff,
            metadata: log.metadata,
            severity: log.severity,
            environment_id: log.environment_id.map(|id| id.to_string()),
            environment_name: log.environment_name,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            request_id: log.request_id.map(|id| id.to_string()),
            created_at: log.created_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(responses))
}
