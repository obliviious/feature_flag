use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateEnvironmentRequest {
    pub name: String,
    pub slug: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EnvironmentResponse {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub color: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

pub async fn create_environment(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
    Json(req): Json<CreateEnvironmentRequest>,
) -> Result<(StatusCode, Json<EnvironmentResponse>), ApiError> {
    let env = state
        .store
        .create_environment(project_id, &req.name, &req.slug, req.color.as_deref())
        .await
        .map_err(|e| err(StatusCode::CONFLICT, &e.to_string()))?;

    let _ = state
        .store
        .create_audit_log(project_id, None, "environment_created", "environment", Some(env.id), None, None)
        .await;

    Ok((
        StatusCode::CREATED,
        Json(EnvironmentResponse {
            id: env.id.to_string(),
            name: env.name,
            slug: env.slug,
            color: env.color,
            sort_order: env.sort_order,
            created_at: env.created_at.to_rfc3339(),
            updated_at: env.updated_at.to_rfc3339(),
        }),
    ))
}

pub async fn list_environments(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<Vec<EnvironmentResponse>>, ApiError> {
    let environments = state
        .store
        .list_environments(project_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let responses: Vec<EnvironmentResponse> = environments
        .into_iter()
        .map(|env| EnvironmentResponse {
            id: env.id.to_string(),
            name: env.name,
            slug: env.slug,
            color: env.color,
            sort_order: env.sort_order,
            created_at: env.created_at.to_rfc3339(),
            updated_at: env.updated_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(responses))
}
