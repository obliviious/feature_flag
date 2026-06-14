use axum::{
    extract::{Extension, Path, Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::FromRow;
use std::time::Duration;
use uuid::Uuid;

use crate::auth::api_keys;
use crate::state::{AppState, LocalSdkAuthValue};
use crate::store::redis::{CachedSdkAuth, SdkAuthCacheLookup};

/// Extracts and stores the authenticated entity info.
#[derive(Debug, Clone)]
pub enum AuthInfo {
    Jwt {
        user_id: String,
        email: Option<String>,
        org_id: Option<String>,
    },
    SdkKey {
        key_id: Uuid,
        environment_id: Uuid,
        project_id: Uuid,
        key_type: String, // "server" or "client"
    },
    /// Project-scoped management key for CI/CD (`mgmt_` prefix).
    ManagementKey {
        key_id: Uuid,
        project_id: Uuid,
        name: String,
    },
}

#[derive(Debug, Clone, FromRow)]
struct SdkKeyAuthRow {
    id: Uuid,
    environment_id: Uuid,
    project_id: Uuid,
    key_type: String,
}

async fn resolve_management_auth(state: &AppState, auth_header: &str) -> Result<AuthInfo, StatusCode> {
    let key_hash = api_keys::hash_key(auth_header);
    let row = state
        .store
        .resolve_management_api_key(&key_hash)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let store = state.store.clone();
    let key_id = row.id;
    tokio::spawn(async move {
        let _ = store.update_management_api_key_last_used(key_id).await;
    });

    Ok(AuthInfo::ManagementKey {
        key_id: row.id,
        project_id: row.project_id,
        name: row.name,
    })
}

async fn resolve_sdk_auth(state: &AppState, auth_header: &str) -> Result<AuthInfo, StatusCode> {
    let key_hash = api_keys::hash_key(auth_header);
    let positive_ttl = Duration::from_secs(300);
    let negative_ttl = Duration::from_secs(60);

    // L1: in-process cache (fastest, also works when Redis+DB are degraded)
    if let Some(local) = state.get_local_sdk_auth(&key_hash).await {
        match local {
            LocalSdkAuthValue::Positive(cached) => {
                let store = state.store.clone();
                let key_id = cached.key_id;
                tokio::spawn(async move {
                    let _ = store.update_sdk_key_last_used(key_id).await;
                });
                return Ok(AuthInfo::SdkKey {
                    key_id: cached.key_id,
                    environment_id: cached.environment_id,
                    project_id: cached.project_id,
                    key_type: cached.key_type,
                });
            }
            LocalSdkAuthValue::Negative => {
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

    // L2: Redis cache (single GET; no separate exists/check race window)
    if let Some(ref redis) = state.redis {
        if let Ok(lookup) = redis.get_cached_sdk_auth(&key_hash).await {
            match lookup {
                SdkAuthCacheLookup::Hit(cached) => {
                    state
                        .set_local_sdk_auth_positive(key_hash.clone(), cached.clone(), positive_ttl)
                        .await;

                    let store = state.store.clone();
                    let key_id = cached.key_id;
                    tokio::spawn(async move {
                        let _ = store.update_sdk_key_last_used(key_id).await;
                    });

                    return Ok(AuthInfo::SdkKey {
                        key_id: cached.key_id,
                        environment_id: cached.environment_id,
                        project_id: cached.project_id,
                        key_type: cached.key_type,
                    });
                }
                SdkAuthCacheLookup::Negative => {
                    state
                        .set_local_sdk_auth_negative(key_hash.clone(), negative_ttl)
                        .await;
                    return Err(StatusCode::UNAUTHORIZED);
                }
                SdkAuthCacheLookup::Miss => {}
            }
        }
    }

    // Cache miss: validate from DB and warm cache.
    let sdk_key = sqlx::query_as::<_, SdkKeyAuthRow>(
        "SELECT sk.id, sk.environment_id, e.project_id, sk.key_type
         FROM sdk_keys sk
         JOIN environments e ON e.id = sk.environment_id
         WHERE sk.key_hash = ? AND sk.revoked_at IS NULL",
    )
    .bind(&key_hash)
    .fetch_optional(state.store.pool())
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or_else(|| {
        let key_hash_clone = key_hash.clone();
        let state = state.clone();
        tokio::spawn(async move {
            state
                .set_local_sdk_auth_negative(key_hash_clone.clone(), negative_ttl)
                .await;
            if let Some(redis) = &state.redis {
                let _ = redis.cache_sdk_auth_negative(&key_hash_clone).await;
            }
        });
        StatusCode::UNAUTHORIZED
    })?;

    if let Some(ref redis) = state.redis {
        let cached = CachedSdkAuth {
            key_id: sdk_key.id,
            environment_id: sdk_key.environment_id,
            project_id: sdk_key.project_id,
            key_type: sdk_key.key_type.clone(),
        };
        let _ = redis.cache_sdk_auth(&key_hash, &cached).await;
        state
            .set_local_sdk_auth_positive(key_hash.clone(), cached, positive_ttl)
            .await;
    } else {
        state
            .set_local_sdk_auth_positive(
                key_hash.clone(),
                CachedSdkAuth {
                    key_id: sdk_key.id,
                    environment_id: sdk_key.environment_id,
                    project_id: sdk_key.project_id,
                    key_type: sdk_key.key_type.clone(),
                },
                positive_ttl,
            )
            .await;
    }

    let store = state.store.clone();
    let key_id = sdk_key.id;
    tokio::spawn(async move {
        let _ = store.update_sdk_key_last_used(key_id).await;
    });

    Ok(AuthInfo::SdkKey {
        key_id: sdk_key.id,
        environment_id: sdk_key.environment_id,
        project_id: sdk_key.project_id,
        key_type: sdk_key.key_type,
    })
}

async fn apply_sdk_rate_limit(state: &AppState, key_id: Uuid) -> Result<(), StatusCode> {
    let limit = state.config.sdk_eval_rate_limit_per_minute;
    if limit == 0 {
        return Ok(());
    }

    let Some(ref redis) = state.redis else {
        // Fail-open when Redis is unavailable so eval traffic is not hard down.
        return Ok(());
    };

    let now = Utc::now().timestamp();
    let minute_bucket = now / 60;
    let ttl_secs = 90;
    let count = redis
        .increment_sdk_rate_limit_counter(key_id, minute_bucket, ttl_secs)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if count > limit {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    Ok(())
}

/// Middleware: require JWT or SDK key authentication.
pub async fn require_auth(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let auth_info = if auth_header.starts_with("Bearer ") {
        let token = &auth_header[7..];
        let claims = state
            .jwks
            .verify_token(token)
            .await
            .map_err(|_| StatusCode::UNAUTHORIZED)?;
        AuthInfo::Jwt {
            user_id: claims.sub,
            email: claims.email,
            org_id: claims.org_id,
        }
    } else if auth_header.starts_with("mgmt_") {
        resolve_management_auth(&state, auth_header).await?
    } else if auth_header.starts_with("srv_") || auth_header.starts_with("cli_") {
        resolve_sdk_auth(&state, auth_header).await?
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    req.extensions_mut().insert(auth_info);
    Ok(next.run(req).await)
}

/// Extract `project_id` from nested management routes without consuming other path params.
#[derive(Debug, Deserialize)]
pub(crate) struct ProjectIdPath {
    project_id: Uuid,
}

/// Ensures management API keys can only access their own project.
pub async fn require_project_scope(
    Extension(auth): Extension<AuthInfo>,
    Path(ProjectIdPath { project_id }): Path<ProjectIdPath>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if let AuthInfo::ManagementKey {
        project_id: allowed, ..
    } = &auth
    {
        if *allowed != project_id {
            return Err(StatusCode::FORBIDDEN);
        }
    }
    Ok(next.run(req).await)
}

/// Management key mutations require a human dashboard session (Clerk JWT).
pub fn require_dashboard_user(auth: &AuthInfo) -> Result<(), StatusCode> {
    match auth {
        AuthInfo::Jwt { .. } => Ok(()),
        _ => Err(StatusCode::FORBIDDEN),
    }
}

/// Middleware: require SDK key authentication only.
pub async fn require_sdk_key(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("srv_") && !auth_header.starts_with("cli_") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let auth_info = resolve_sdk_auth(&state, auth_header).await?;
    if let AuthInfo::SdkKey { key_id, .. } = &auth_info {
        apply_sdk_rate_limit(&state, *key_id).await?;
    }

    req.extensions_mut().insert(auth_info);
    Ok(next.run(req).await)
}
