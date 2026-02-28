use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::state::AppState;
use eval_core::{EvaluationContext, EvaluationResult, Evaluator};

#[derive(Debug, Deserialize)]
pub struct EvaluateRequest {
    pub flag_key: String,
    pub context: EvaluationContext,
    #[serde(default)]
    pub default_value: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct EvaluateBatchRequest {
    pub flags: Vec<EvaluateRequest>,
    #[serde(default)]
    pub context: EvaluationContext,
}

type ApiError = (StatusCode, Json<serde_json::Value>);

fn err(status: StatusCode, msg: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": msg })))
}

/// Evaluate a single flag (SDK-facing endpoint).
pub async fn evaluate(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthInfo>,
    Json(req): Json<EvaluateRequest>,
) -> Result<Json<EvaluationResult>, ApiError> {
    let (project_id, environment_id) = resolve_sdk_context(&auth, &state).await?;

    let config = get_flags_config(&state, project_id, environment_id).await?;
    let evaluator = Evaluator::new(config);
    let result = evaluator.evaluate(&req.flag_key, &req.context, &req.default_value);

    Ok(Json(result))
}

/// Evaluate multiple flags in a single request.
pub async fn evaluate_batch(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthInfo>,
    Json(req): Json<EvaluateBatchRequest>,
) -> Result<Json<Vec<EvaluationResult>>, ApiError> {
    let (project_id, environment_id) = resolve_sdk_context(&auth, &state).await?;

    let config = get_flags_config(&state, project_id, environment_id).await?;
    let evaluator = Evaluator::new(config);

    let results: Vec<EvaluationResult> = req
        .flags
        .iter()
        .map(|flag_req| {
            let ctx = if flag_req.context.targeting_key.is_some() {
                &flag_req.context
            } else {
                &req.context
            };
            evaluator.evaluate(&flag_req.flag_key, ctx, &flag_req.default_value)
        })
        .collect();

    Ok(Json(results))
}

/// Return the full flags config (for server SDKs doing local evaluation).
pub async fn flags_config(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthInfo>,
) -> Result<Json<eval_core::FlagsConfig>, ApiError> {
    let (project_id, environment_id) = resolve_sdk_context(&auth, &state).await?;
    let config = get_flags_config(&state, project_id, environment_id).await?;
    Ok(Json(config))
}

async fn resolve_sdk_context(
    auth: &AuthInfo,
    state: &AppState,
) -> Result<(Uuid, Uuid), ApiError> {
    match auth {
        AuthInfo::SdkKey {
            environment_id, ..
        } => {
            // Look up the project via environment
            let environments = sqlx::query_as::<_, crate::store::models::EnvironmentRow>(
                "SELECT * FROM environments WHERE id = $1",
            )
            .bind(environment_id)
            .fetch_optional(state.store.pool())
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
            .ok_or_else(|| err(StatusCode::NOT_FOUND, "Environment not found"))?;

            Ok((environments.project_id, *environment_id))
        }
        _ => Err(err(
            StatusCode::FORBIDDEN,
            "Evaluation requires an SDK key",
        )),
    }
}

async fn get_flags_config(
    state: &AppState,
    project_id: Uuid,
    environment_id: Uuid,
) -> Result<eval_core::FlagsConfig, ApiError> {
    // Try Redis cache first
    if let Some(ref redis) = state.redis {
        if let Ok(Some(cached)) = redis.get_cached_flags_config(environment_id).await {
            if let Ok(config) = serde_json::from_str(&cached) {
                return Ok(config);
            }
        }
    }

    // Cache miss — build from DB
    let config = state
        .store
        .build_flags_config(project_id, environment_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    // Store in cache
    if let Some(ref redis) = state.redis {
        if let Ok(json) = serde_json::to_string(&config) {
            let _ = redis.cache_flags_config(environment_id, &json).await;
        }
    }

    Ok(config)
}
