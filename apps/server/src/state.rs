use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::auth::jwt::JwksCache;
use crate::broadcaster::Broadcaster;
use crate::config::Config;
use crate::store::redis::CachedSdkAuth;
use crate::store::{RedisStore, SqliteStore};
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

#[derive(Clone)]
pub struct CachedConfig {
    pub config: eval_core::FlagsConfig,
    pub _updated_at: Instant,
}

#[derive(Clone)]
pub enum LocalSdkAuthValue {
    Positive(CachedSdkAuth),
    Negative,
}

#[derive(Clone)]
pub struct LocalSdkAuthCacheEntry {
    pub value: LocalSdkAuthValue,
    pub expires_at: Instant,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

#[derive(Debug)]
pub struct RedisCircuitBreaker {
    state: CircuitState,
    next_retry_at: Instant,
    current_backoff: Duration,
    initial_backoff: Duration,
    max_backoff: Duration,
}

impl RedisCircuitBreaker {
    pub fn new(initial_backoff: Duration, max_backoff: Duration) -> Self {
        Self {
            state: CircuitState::Closed,
            next_retry_at: Instant::now(),
            current_backoff: initial_backoff,
            initial_backoff,
            max_backoff,
        }
    }

    /// Returns true if a Redis call should be attempted now.
    pub fn allow_request(&mut self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                if Instant::now() >= self.next_retry_at {
                    self.state = CircuitState::HalfOpen;
                    true
                } else {
                    false
                }
            }
            CircuitState::HalfOpen => true,
        }
    }

    pub fn on_success(&mut self) {
        self.state = CircuitState::Closed;
        self.current_backoff = self.initial_backoff;
        self.next_retry_at = Instant::now();
    }

    /// Returns true if transition entered OPEN from non-OPEN state.
    pub fn on_failure(&mut self) -> bool {
        let transitioned_to_open = self.state != CircuitState::Open;
        self.state = CircuitState::Open;
        self.next_retry_at = Instant::now() + self.current_backoff;
        self.current_backoff = (self.current_backoff * 2).min(self.max_backoff);
        transitioned_to_open
    }

    pub fn is_open(&self) -> bool {
        self.state == CircuitState::Open
    }
}

/// Shared application state passed to all Axum handlers.
#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub store: SqliteStore,
    pub redis: Option<RedisStore>,
    pub jwks: Arc<JwksCache>,
    pub broadcaster: Broadcaster,
    pub local_cache: Arc<RwLock<HashMap<Uuid, CachedConfig>>>,
    pub sdk_auth_local_cache: Arc<RwLock<HashMap<String, LocalSdkAuthCacheEntry>>>,
    pub redis_circuit_breaker: Arc<Mutex<RedisCircuitBreaker>>,
}

impl AppState {
    pub async fn get_local_config(&self, environment_id: Uuid) -> Option<eval_core::FlagsConfig> {
        let cache = self.local_cache.read().await;
        cache.get(&environment_id).map(|c| c.config.clone())
    }

    pub async fn set_local_config(&self, environment_id: Uuid, config: eval_core::FlagsConfig) {
        let mut cache = self.local_cache.write().await;
        cache.insert(
            environment_id,
            CachedConfig {
                config,
                _updated_at: Instant::now(),
            },
        );
    }

    pub async fn get_local_sdk_auth(&self, key_hash: &str) -> Option<LocalSdkAuthValue> {
        let mut cache = self.sdk_auth_local_cache.write().await;
        let now = Instant::now();
        match cache.get(key_hash) {
            Some(entry) if entry.expires_at > now => Some(entry.value.clone()),
            Some(_) => {
                cache.remove(key_hash);
                None
            }
            None => None,
        }
    }

    pub async fn set_local_sdk_auth_positive(
        &self,
        key_hash: String,
        auth: CachedSdkAuth,
        ttl: Duration,
    ) {
        let mut cache = self.sdk_auth_local_cache.write().await;
        cache.insert(
            key_hash,
            LocalSdkAuthCacheEntry {
                value: LocalSdkAuthValue::Positive(auth),
                expires_at: Instant::now() + ttl,
            },
        );
    }

    pub async fn set_local_sdk_auth_negative(&self, key_hash: String, ttl: Duration) {
        let mut cache = self.sdk_auth_local_cache.write().await;
        cache.insert(
            key_hash,
            LocalSdkAuthCacheEntry {
                value: LocalSdkAuthValue::Negative,
                expires_at: Instant::now() + ttl,
            },
        );
    }

    pub async fn invalidate_local_sdk_auth(&self, key_hash: &str) {
        let mut cache = self.sdk_auth_local_cache.write().await;
        cache.remove(key_hash);
    }

    pub async fn redis_allow_request(&self) -> bool {
        let mut cb = self.redis_circuit_breaker.lock().await;
        cb.allow_request()
    }

    pub async fn redis_mark_success(&self) {
        let mut cb = self.redis_circuit_breaker.lock().await;
        cb.on_success();
    }

    pub async fn redis_mark_failure(&self) -> bool {
        let mut cb = self.redis_circuit_breaker.lock().await;
        cb.on_failure()
    }

    pub async fn redis_is_open(&self) -> bool {
        let cb = self.redis_circuit_breaker.lock().await;
        cb.is_open()
    }
}
