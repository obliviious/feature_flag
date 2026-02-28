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
pub struct CreateSegmentRequest {
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default = "default_match_type")]
    pub match_type: String,
    #[serde(default)]
    pub constraints: Vec<ConstraintInput>,
}

fn default_match_type() -> String {
    "all".to_string()
}

#[derive(Debug, Deserialize)]
pub struct ConstraintInput {
    pub attribute: String,
    pub operator: String,
    pub values: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct SegmentResponse {
    pub id: String,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub match_type: String,
    pub constraints: Vec<ConstraintResponse>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ConstraintResponse {
    pub id: String,
    pub attribute: String,
    pub operator: String,
    pub values: Vec<String>,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

pub async fn create_segment(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
    Json(req): Json<CreateSegmentRequest>,
) -> Result<(StatusCode, Json<SegmentResponse>), ApiError> {
    let segment = state
        .store
        .create_segment(
            project_id,
            &req.key,
            &req.name,
            req.description.as_deref(),
            &req.match_type,
        )
        .await
        .map_err(|e| err(StatusCode::CONFLICT, &e.to_string()))?;

    let mut constraint_responses = Vec::new();
    for (i, c) in req.constraints.iter().enumerate() {
        let constraint = state
            .store
            .create_segment_constraint(
                segment.id,
                &c.attribute,
                &c.operator,
                &c.values,
                i as i32,
            )
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

        constraint_responses.push(ConstraintResponse {
            id: constraint.id.to_string(),
            attribute: constraint.attribute,
            operator: constraint.operator,
            values: constraint.values,
        });
    }

    let _ = state
        .store
        .create_audit_log(
            project_id,
            None,
            "segment_created",
            "segment",
            Some(segment.id),
            None,
            None,
        )
        .await;

    Ok((
        StatusCode::CREATED,
        Json(SegmentResponse {
            id: segment.id.to_string(),
            key: segment.key,
            name: segment.name,
            description: segment.description,
            match_type: segment.match_type,
            constraints: constraint_responses,
            created_at: segment.created_at.to_rfc3339(),
            updated_at: segment.updated_at.to_rfc3339(),
        }),
    ))
}

pub async fn list_segments(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<Vec<SegmentResponse>>, ApiError> {
    let segments = state
        .store
        .list_segments(project_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let mut responses = Vec::new();
    for seg in segments {
        let constraints = state
            .store
            .get_segment_constraints(seg.id)
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

        responses.push(SegmentResponse {
            id: seg.id.to_string(),
            key: seg.key,
            name: seg.name,
            description: seg.description,
            match_type: seg.match_type,
            constraints: constraints
                .into_iter()
                .map(|c| ConstraintResponse {
                    id: c.id.to_string(),
                    attribute: c.attribute,
                    operator: c.operator,
                    values: c.values,
                })
                .collect(),
            created_at: seg.created_at.to_rfc3339(),
            updated_at: seg.updated_at.to_rfc3339(),
        });
    }

    Ok(Json(responses))
}

pub async fn get_segment(
    State(state): State<AppState>,
    Path((_project_id, segment_id)): Path<(Uuid, Uuid)>,
    Extension(_auth): Extension<AuthInfo>,
) -> Result<Json<SegmentResponse>, ApiError> {
    let segment = state
        .store
        .get_segment(segment_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Segment not found"))?;

    let constraints = state
        .store
        .get_segment_constraints(segment.id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    Ok(Json(SegmentResponse {
        id: segment.id.to_string(),
        key: segment.key,
        name: segment.name,
        description: segment.description,
        match_type: segment.match_type,
        constraints: constraints
            .into_iter()
            .map(|c| ConstraintResponse {
                id: c.id.to_string(),
                attribute: c.attribute,
                operator: c.operator,
                values: c.values,
            })
            .collect(),
        created_at: segment.created_at.to_rfc3339(),
        updated_at: segment.updated_at.to_rfc3339(),
    }))
}
