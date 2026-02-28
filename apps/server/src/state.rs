use std::sync::Arc;

use crate::auth::jwt::JwksCache;
use crate::broadcaster::Broadcaster;
use crate::config::Config;
use crate::store::{PostgresStore, RedisStore};

/// Shared application state passed to all Axum handlers.
#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub store: PostgresStore,
    pub redis: Option<RedisStore>,
    pub jwks: Arc<JwksCache>,
    pub broadcaster: Broadcaster,
}
