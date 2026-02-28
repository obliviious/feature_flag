use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::auth::api_keys;
use crate::state::AppState;

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
        key_type: String, // "server" or "client"
    },
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
    } else if auth_header.starts_with("srv_") || auth_header.starts_with("cli_") {
        let key_hash = api_keys::hash_key(auth_header);
        let sdk_key = state
            .store
            .get_sdk_key_by_hash(&key_hash)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::UNAUTHORIZED)?;

        // Update last used timestamp (fire and forget)
        let store = state.store.clone();
        let key_id = sdk_key.id;
        tokio::spawn(async move {
            let _ = store.update_sdk_key_last_used(key_id).await;
        });

        AuthInfo::SdkKey {
            key_id: sdk_key.id,
            environment_id: sdk_key.environment_id,
            key_type: sdk_key.key_type,
        }
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    req.extensions_mut().insert(auth_info);
    Ok(next.run(req).await)
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

    let key_hash = api_keys::hash_key(auth_header);
    let sdk_key = state
        .store
        .get_sdk_key_by_hash(&key_hash)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let store = state.store.clone();
    let key_id = sdk_key.id;
    tokio::spawn(async move {
        let _ = store.update_sdk_key_last_used(key_id).await;
    });

    let auth_info = AuthInfo::SdkKey {
        key_id: sdk_key.id,
        environment_id: sdk_key.environment_id,
        key_type: sdk_key.key_type,
    };

    req.extensions_mut().insert(auth_info);
    Ok(next.run(req).await)
}
