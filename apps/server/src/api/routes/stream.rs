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

#[derive(serde::Serialize)]
struct ConfigDeltaEvent {
    seq: i64,
    environment_id: uuid::Uuid,
    from_version: i64,
    to_version: i64,
    changed_flags: std::collections::HashMap<String, eval_core::FlagConfig>,
    deleted_flags: Vec<String>,
}

/// SSE stream endpoint — broadcast-driven push with initial config.
pub async fn stream(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthInfo>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ApiError> {
    let (project_id, environment_id) = match &auth {
        AuthInfo::SdkKey {
            environment_id,
            project_id,
            ..
        } => (*project_id, *environment_id),
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

            let maybe_event = match rx.recv().await {
                Ok(event) => {
                    if event.environment_id == environment_id {
                        Some(event)
                    } else {
                        None
                    }
                }
                Err(RecvError::Lagged(n)) => {
                    tracing::warn!("SSE subscriber lagged by {n} messages, sending full refresh");
                    Some(ConfigChangeEvent {
                        seq: 0,
                        environment_id,
                        version: 0,
                        full_reload: true,
                        changed_flags: Vec::new(),
                        deleted_flags: Vec::new(),
                    })
                }
                Err(RecvError::Closed) => {
                    break;
                }
            };

            if let Some(change_event) = maybe_event {
                match state.store.build_flags_config(project_id, environment_id).await {
                    Ok(config) => {
                        if !change_event.full_reload
                            && (!change_event.changed_flags.is_empty() || !change_event.deleted_flags.is_empty())
                            && config.version == change_event.version
                        {
                            let mut changed = std::collections::HashMap::new();
                            for key in &change_event.changed_flags {
                                if let Some(flag_cfg) = config.flags.get(key) {
                                    changed.insert(key.clone(), flag_cfg.clone());
                                }
                            }

                            let delta = ConfigDeltaEvent {
                                seq: change_event.seq,
                                environment_id,
                                from_version: change_event.version.saturating_sub(1),
                                to_version: change_event.version,
                                changed_flags: changed,
                                deleted_flags: change_event.deleted_flags.clone(),
                            };
                            let data = serde_json::to_string(&delta).unwrap_or_default();
                            yield Ok(Event::default().event("config_delta").data(data));
                        } else {
                            let data = serde_json::to_string(&config).unwrap_or_default();
                            yield Ok(Event::default().event("config").data(data));
                        }
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
