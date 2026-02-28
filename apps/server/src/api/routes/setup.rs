use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

use crate::auth::api_keys;
use crate::state::AppState;

/// Bootstrap request — creates an org, project, and default environments.
/// Only used for initial setup (Phase 1 — no dashboard).
#[derive(Debug, Deserialize)]
pub struct SetupRequest {
    pub org_name: String,
    pub org_slug: String,
    pub project_name: String,
    pub project_slug: String,
}

#[derive(Debug, Serialize)]
pub struct SetupResponse {
    pub organization_id: String,
    pub project_id: String,
    pub environments: Vec<EnvironmentInfo>,
}

#[derive(Debug, Serialize)]
pub struct EnvironmentInfo {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub server_key: String,
    pub client_key: String,
}

pub async fn setup(
    State(state): State<AppState>,
    Json(req): Json<SetupRequest>,
) -> Result<(StatusCode, Json<SetupResponse>), (StatusCode, Json<serde_json::Value>)> {
    let org = state
        .store
        .create_organization(&req.org_name, &req.org_slug)
        .await
        .map_err(|e| {
            (
                StatusCode::CONFLICT,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
        })?;

    let project = state
        .store
        .create_project(org.id, &req.project_name, &req.project_slug, None)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
        })?;

    let env_configs = [
        ("Development", "development", "#22c55e"),
        ("Staging", "staging", "#eab308"),
        ("Production", "production", "#ef4444"),
    ];

    let mut environments = Vec::new();

    for (name, slug, color) in &env_configs {
        let env = state
            .store
            .create_environment(project.id, name, slug, Some(color))
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
            })?;

        // Generate SDK keys
        let (server_key, server_hash, server_prefix) = api_keys::generate_sdk_key("srv_");
        let (client_key, client_hash, client_prefix) = api_keys::generate_sdk_key("cli_");

        state
            .store
            .create_sdk_key(env.id, &format!("{name} Server Key"), "server", &server_hash, &server_prefix)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
            })?;

        state
            .store
            .create_sdk_key(env.id, &format!("{name} Client Key"), "client", &client_hash, &client_prefix)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
            })?;

        environments.push(EnvironmentInfo {
            id: env.id.to_string(),
            name: name.to_string(),
            slug: slug.to_string(),
            server_key,
            client_key,
        });
    }

    Ok((
        StatusCode::CREATED,
        Json(SetupResponse {
            organization_id: org.id.to_string(),
            project_id: project.id.to_string(),
            environments,
        }),
    ))
}
