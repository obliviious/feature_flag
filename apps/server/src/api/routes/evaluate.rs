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
    let (project_id, environment_id) = resolve_sdk_context(&auth)?;

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
    let (project_id, environment_id) = resolve_sdk_context(&auth)?;

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
    let (project_id, environment_id) = resolve_sdk_context(&auth)?;
    let config = get_flags_config(&state, project_id, environment_id).await?;
    Ok(Json(config))
    
}

fn resolve_sdk_context(auth: &AuthInfo) -> Result<(Uuid, Uuid), ApiError> {
    match auth {
        AuthInfo::SdkKey {
            environment_id,
            project_id,
            ..
        } => Ok((*project_id, *environment_id)),
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
    // Try Redis cache first when circuit breaker allows.
    if let Some(ref redis) = state.redis {
        if state.redis_allow_request().await {
            match redis.get_cached_flags_config(environment_id).await {
                Ok(Some(cached)) => {
                    // Prefer MessagePack; fall back to JSON bytes during rollout.
                    if let Ok(config) = rmp_serde::from_slice::<eval_core::FlagsConfig>(&cached) {
                        state.redis_mark_success().await;
                        state.set_local_config(environment_id, config.clone()).await;
                        return Ok(config);
                    }
                    if let Ok(cached_json) = std::str::from_utf8(&cached) {
                        if let Ok(config) =
                            serde_json::from_str::<eval_core::FlagsConfig>(cached_json)
                        {
                            state.redis_mark_success().await;
                            state.set_local_config(environment_id, config.clone()).await;
                            return Ok(config);
                        }
                    }
                    state.redis_mark_success().await;
                }
                Ok(None) => {
                    state.redis_mark_success().await;
                }
                Err(e) => {
                    let transitioned = state.redis_mark_failure().await;
                    tracing::warn!("Redis get_cached_flags_config failed: {e}");
                    if transitioned {
                        tracing::error!("Redis circuit breaker opened");
                        send_redis_down_alert(state, "redis_get_failed");
                    }
                    if let Some(local) = state.get_local_config(environment_id).await {
                        return Ok(local);
                    }
                }
            }
        } else if let Some(local) = state.get_local_config(environment_id).await {
            return Ok(local);
        }
    }

    // If Redis is unavailable/open and local cache exists, use it before DB.
    if state.redis_is_open().await {
        if let Some(local) = state.get_local_config(environment_id).await {
            return Ok(local);
        }
    }

    // Build from DB (cold start or no local snapshot available)
    let config = state
        .store
        .build_flags_config(project_id, environment_id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    state.set_local_config(environment_id, config.clone()).await;

    // Store in Redis cache as MessagePack (best effort, circuit-breaker protected)
    if let Some(ref redis) = state.redis {
        if state.redis_allow_request().await {
            if let Ok(bytes) = rmp_serde::to_vec(&config) {
                if let Err(e) = redis.cache_flags_config(environment_id, &bytes).await {
                    let transitioned = state.redis_mark_failure().await;
                    tracing::warn!("Redis cache_flags_config failed: {e}");
                    if transitioned {
                        tracing::error!("Redis circuit breaker opened");
                        send_redis_down_alert(state, "redis_set_failed");
                    }
                } else {
                    state.redis_mark_success().await;
                }
            }
        }
    }
 
    Ok(config)
}

fn send_redis_down_alert(state: &AppState, reason: &str) {
    let Some(url) = state.config.redis_down_alert_webhook.clone() else {
        return;
    };

    let reason = reason.to_string();
    tokio::spawn(async move {
        let payload = serde_json::json!({
            "severity": "critical",
            "component": "redis_cache",
            "reason": reason,
            "message": "Redis circuit breaker opened; serving from local in-memory snapshots",
            "timestamp": chrono::Utc::now().to_rfc3339(),
        });
        let _ = reqwest::Client::new().post(url).json(&payload).send().await;
    });
}
