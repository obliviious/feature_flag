use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;

use crate::state::AppState;

pub async fn health_check(State(state): State<AppState>) -> (StatusCode, Json<serde_json::Value>) {
    let db_ok = sqlx::query("SELECT 1")
        .execute(state.store.pool())
        .await
        .is_ok();

    let status = if db_ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (
        status,
        Json(json!({
            "status": if db_ok { "healthy" } else { "degraded" },
            "version": env!("CARGO_PKG_VERSION"),
            "database": if db_ok { "connected" } else { "disconnected" },
        })),
    )
}
