use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::state::AppState;
use crate::store::sqlite::CodeRefInput;

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

// ============================================================
// Request / Response types
// ============================================================

#[derive(Debug, Deserialize)]
pub struct StaleFlagsQuery {
    #[serde(default = "default_threshold")]
    pub threshold_days: i64,
}

fn default_threshold() -> i64 {
    90
}

#[derive(Debug, Serialize)]
pub struct StaleFlagSummary {
    pub id: String,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub flag_type: String,
    pub owner_email: Option<String>,
    pub owner_name: Option<String>,
    pub lifecycle_status: String,
    pub stale_threshold_days: Option<i32>,
    pub created_at: String,
    pub last_activity_at: Option<String>,
    pub staleness_days: i64,
    pub code_ref_count: i64,
}

#[derive(Debug, Serialize)]
pub struct CodeReferenceResponse {
    pub id: String,
    pub flag_id: String,
    pub repo: Option<String>,
    pub branch: Option<String>,
    pub commit_sha: Option<String>,
    pub file_path: String,
    pub line_number: Option<i32>,
    pub snippet: Option<String>,
    pub scanned_at: String,
}

#[derive(Debug, Deserialize)]
pub struct IngestCodeRefsRequest {
    pub refs: Vec<CodeRefInput>,
    /// Branch these refs belong to (can also be embedded per-ref; this is the top-level default).
    pub branch: Option<String>,
}

// ============================================================
// Handlers
// ============================================================

/// GET /api/v1/projects/{project_id}/lifecycle/stale?threshold_days=90
pub async fn get_stale_flags(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
    Query(query): Query<StaleFlagsQuery>,
) -> Result<Json<Vec<StaleFlagSummary>>, ApiError> {
    let rows = state
        .store
        .get_stale_flags(project_id, query.threshold_days)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let summaries = rows
        .into_iter()
        .map(|r| StaleFlagSummary {
            id: r.id.to_string(),
            key: r.key,
            name: r.name,
            description: r.description,
            flag_type: r.flag_type,
            owner_email: r.owner_email,
            owner_name: r.owner_name,
            lifecycle_status: r.lifecycle_status,
            stale_threshold_days: r.stale_threshold_days,
            created_at: r.created_at.to_rfc3339(),
            last_activity_at: r.last_activity_at.map(|t| t.to_rfc3339()),
            staleness_days: r.staleness_days,
            code_ref_count: r.code_ref_count,
        })
        .collect();

    Ok(Json(summaries))
}

/// POST /api/v1/projects/{project_id}/flags/{flag_key}/code-refs
pub async fn ingest_code_refs(
    State(state): State<AppState>,
    Path((project_id, flag_key)): Path<(Uuid, String)>,
    Extension(_auth): Extension<AuthInfo>,
    Json(req): Json<IngestCodeRefsRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let flag = state
        .store
        .get_flag_by_key(project_id, &flag_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag not found"))?;

    // Allow per-ref branch override; fall back to top-level branch field.
    let mut resolved_refs: Vec<CodeRefInput> = req
        .refs
        .into_iter()
        .map(|mut r| {
            if r.branch.is_none() {
                r.branch = req.branch.clone();
            }
            r
        })
        .collect();

    // Determine the effective branch for the delete-then-insert upsert.
    let effective_branch = resolved_refs
        .first()
        .and_then(|r| r.branch.clone())
        .or(req.branch.clone());

    // Ensure all refs have the branch set consistently before the upsert.
    for r in &mut resolved_refs {
        if r.branch.is_none() {
            r.branch = effective_branch.clone();
        }
    }

    let count = resolved_refs.len();
    state
        .store
        .upsert_code_references(flag.id, project_id, effective_branch.as_deref(), &resolved_refs)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    Ok(Json(serde_json::json!({
        "flag_key": flag_key,
        "refs_ingested": count,
        "branch": effective_branch,
    })))
}

/// GET /api/v1/projects/{project_id}/flags/{flag_key}/code-refs
pub async fn get_code_refs(
    State(state): State<AppState>,
    Path((project_id, flag_key)): Path<(Uuid, String)>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<Vec<CodeReferenceResponse>>, ApiError> {
    let flag = state
        .store
        .get_flag_by_key(project_id, &flag_key)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Flag not found"))?;

    let refs = state
        .store
        .get_code_references(flag.id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let response = refs
        .into_iter()
        .map(|r| CodeReferenceResponse {
            id: r.id.to_string(),
            flag_id: r.flag_id.to_string(),
            repo: r.repo,
            branch: r.branch,
            commit_sha: r.commit_sha,
            file_path: r.file_path,
            line_number: r.line_number,
            snippet: r.snippet,
            scanned_at: r.scanned_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}
