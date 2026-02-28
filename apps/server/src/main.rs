mod api;
mod auth;
mod broadcaster;
mod config;
mod state;
mod store;

use std::sync::Arc;

use axum::{
    middleware as axum_mw,
    routing::{get, patch, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{fmt, EnvFilter};
use axum::http::Request;

use crate::api::middleware::auth::{require_auth, require_sdk_key};
use crate::api::routes::*;
use crate::auth::jwt::JwksCache;
use crate::broadcaster::{Broadcaster, ConfigChangeEvent};
use crate::config::Config;
use crate::state::AppState;
use crate::store::{PostgresStore, RedisStore};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = Config::from_env();

    // Initialize tracing
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new(&config.log_level)),
        )
        .init();

    tracing::info!("Starting FlagForge server v{}", env!("CARGO_PKG_VERSION"));

    // Connect to PostgreSQL
    let store = PostgresStore::new(&config.database_url).await?;
    store.run_migrations().await?;
    tracing::info!("Database connected and migrations applied");

    // Connect to Redis (optional — graceful degradation)
    let redis = match RedisStore::new(&config.redis_url).await {
        Ok(r) => {
            tracing::info!("Redis connected");
            Some(r)
        }
        Err(e) => {
            tracing::warn!("Redis unavailable (running without cache): {e}");
            None
        }
    };

    // Initialize Clerk JWKS cache
    let jwks = Arc::new(JwksCache::new(&config.clerk_domain));
    jwks.refresh().await?;
    tracing::info!("JWKS cache initialized");

    // Spawn hourly JWKS refresh
    {
        let jwks = jwks.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
            interval.tick().await; // skip immediate tick
            loop {
                interval.tick().await;
                if let Err(e) = jwks.refresh().await {
                    tracing::error!("JWKS refresh failed: {e}");
                }
            }
        });
    }

    // Create broadcaster
    let broadcaster = Broadcaster::new(256);

    // Spawn Redis Pub/Sub subscriber → broadcaster bridge
    if let Some(ref redis) = redis {
        let client = redis.client().clone();
        let broadcaster = broadcaster.clone();
        tokio::spawn(async move {
            loop {
                match subscribe_redis_changes(&client, &broadcaster).await {
                    Ok(()) => {
                        tracing::info!("Redis subscriber ended, reconnecting...");
                    }
                    Err(e) => {
                        tracing::error!("Redis subscriber error: {e}, reconnecting in 5s...");
                        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    }
                }
            }
        });
    }

    let state = AppState {
        config: config.clone(),
        store,
        redis,
        jwks,
        broadcaster,
    };

    // Build router
    let app = Router::new()
        // Public endpoints
        .route("/health", get(health::health_check))
        .route("/api/v1/setup", post(setup::setup))
        // Projects API (JWT auth, top-level)
        .nest(
            "/api/v1",
            projects_routes().layer(axum_mw::from_fn_with_state(state.clone(), require_auth)),
        )
        // Management API (JWT auth)
        .nest(
            "/api/v1/projects/{project_id}",
            management_routes().layer(axum_mw::from_fn_with_state(state.clone(), require_auth)),
        )
        // Evaluation API (SDK key auth)
        .nest(
            "/api/v1",
            evaluation_routes().layer(axum_mw::from_fn_with_state(state.clone(), require_sdk_key)),
        )
        // Global middleware
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &Request<_>| {
                    tracing::info_span!(
                        "http_request",
                        method = %request.method(),
                        uri = %request.uri(),
                    )
                })
                .on_response(
                    |response: &axum::http::Response<_>, latency: std::time::Duration, _span: &tracing::Span| {
                        tracing::info!(
                            status = %response.status(),
                            latency_ms = latency.as_millis(),
                            "response"
                        );
                    },
                )
                .on_request(|request: &Request<_>, _span: &tracing::Span| {
                    tracing::info!(
                        method = %request.method(),
                        path = %request.uri(),
                        "request"
                    );
                }),
        )
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    let addr = config.addr();
    tracing::info!("Listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Subscribe to Redis `flagforge:config_changes` channel and forward to broadcaster.
async fn subscribe_redis_changes(
    client: &redis::Client,
    broadcaster: &Broadcaster,
) -> anyhow::Result<()> {
    let mut pubsub = client.get_async_pubsub().await?;
    pubsub.subscribe("flagforge:config_changes").await?;
    tracing::info!("Redis Pub/Sub subscriber connected");

    loop {
        let msg: redis::Msg = tokio_stream::StreamExt::next(&mut pubsub.on_message())
            .await
            .ok_or_else(|| anyhow::anyhow!("Redis Pub/Sub stream ended"))?;

        let payload: String = msg.get_payload()?;
        match serde_json::from_str::<ConfigChangeEvent>(&payload) {
            Ok(event) => {
                broadcaster.send(event);
            }
            Err(e) => {
                tracing::warn!("Invalid config change payload: {e}");
            }
        }
    }
}

fn projects_routes() -> Router<AppState> {
    Router::new()
        .route("/projects", get(projects::list_projects))
        .route("/projects/{project_id}", get(projects::get_project))
}

fn management_routes() -> Router<AppState> {
    Router::new()
        .route("/flags", post(flags::create_flag).get(flags::list_flags))
        .route(
            "/flags/{flag_key}",
            get(flags::get_flag)
                .put(flags::update_flag)
                .delete(flags::delete_flag),
        )
        .route("/flags/{flag_key}/toggle", patch(flags::toggle_flag))
        .route(
            "/segments",
            post(segments::create_segment).get(segments::list_segments),
        )
        .route("/segments/{segment_id}", get(segments::get_segment))
        .route(
            "/environments",
            get(environments::list_environments).post(environments::create_environment),
        )
        .route(
            "/sdk-keys",
            get(sdk_keys::list_sdk_keys).post(sdk_keys::create_sdk_key),
        )
        .route("/sdk-keys/{key_id}/revoke", post(sdk_keys::revoke_sdk_key))
        .route("/audit-log", get(audit_log::list_audit_log))
}

fn evaluation_routes() -> Router<AppState> {
    Router::new()
        .route("/evaluate", post(evaluate::evaluate))
        .route("/evaluate/batch", post(evaluate::evaluate_batch))
        .route("/flags-config", get(evaluate::flags_config))
        .route("/stream", get(crate::api::routes::stream::stream))
}
