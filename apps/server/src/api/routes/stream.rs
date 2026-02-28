use axum::{
    extract::State,
    http::StatusCode,
    response::sse::{Event, Sse},
    Extension, Json,
};
use std::convert::Infallible;
use tokio_stream::Stream;

use crate::api::middleware::auth::AuthInfo;
use crate::broadcaster::ConfigChangeEvent;
use crate::state::AppState;

type ApiError = (StatusCode, Json<serde_json::Value>);

/// SSE stream endpoint — broadcast-driven push with initial config.
pub async fn stream(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthInfo>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ApiError> {
    let (project_id, environment_id) = match &auth {
        AuthInfo::SdkKey {
            environment_id, ..
        } => {
            let env = sqlx::query_as::<_, crate::store::models::EnvironmentRow>(
                "SELECT * FROM environments WHERE id = $1",
            )
            .bind(environment_id)
            .fetch_optional(state.store.pool())
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": e.to_string() })),
                )
            })?
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({ "error": "Environment not found" })),
                )
            })?;
            (env.project_id, *environment_id)
        }
        _ => {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({ "error": "Stream requires SDK key auth" })),
            ));
        }
    };

    let mut rx = state.broadcaster.subscribe();

    let stream = async_stream::stream! {
        // Send initial full config immediately
        match state.store.build_flags_config(project_id, environment_id).await {
            Ok(config) => {
                let data = serde_json::to_string(&config).unwrap_or_default();
                yield Ok::<_, Infallible>(Event::default().event("config").data(data));
            }
            Err(e) => {
                tracing::error!("Failed to build initial config: {e}");
                yield Ok(Event::default().event("error").data("Failed to load config"));
                return;
            }
        }

        loop {
            use tokio::sync::broadcast::error::RecvError;

            let should_send_full_config = match rx.recv().await {
                Ok(ConfigChangeEvent { environment_id: eid, .. }) => {
                    eid == environment_id
                }
                Err(RecvError::Lagged(n)) => {
                    tracing::warn!("SSE subscriber lagged by {n} messages, sending full refresh");
                    true
                }
                Err(RecvError::Closed) => {
                    break;
                }
            };

            if should_send_full_config {
                match state.store.build_flags_config(project_id, environment_id).await {
                    Ok(config) => {
                        let data = serde_json::to_string(&config).unwrap_or_default();
                        yield Ok(Event::default().event("config").data(data));
                    }
                    Err(e) => {
                        tracing::error!("Failed to build config on change: {e}");
                    }
                }
            }
        }
    };

    Ok(Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(std::time::Duration::from_secs(15))
            .text("keepalive"),
    ))
}
