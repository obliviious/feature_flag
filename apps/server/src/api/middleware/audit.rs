use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::api::middleware::auth::AuthInfo;
use crate::audit::{extract_ip, ActorType, AuditContext};

pub async fn audit_context_middleware(mut req: Request, next: Next) -> Response {
    let user_agent = req
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(ToString::to_string);

    let ctx = match req.extensions().get::<AuthInfo>() {
        Some(AuthInfo::Jwt {
            user_id,
            email,
            ..
        }) => AuditContext {
            actor_id: Uuid::parse_str(user_id).ok(),
            actor_email: email.clone(),
            actor_name: email.clone(),
            actor_type: ActorType::User,
            ip_address: extract_ip(&req),
            user_agent,
            request_id: Uuid::new_v4(),
        },
        Some(AuthInfo::SdkKey { key_id, .. }) => AuditContext {
            actor_id: Some(*key_id),
            actor_email: None,
            actor_name: Some(format!("sdk:{key_id}")),
            actor_type: ActorType::Sdk,
            ip_address: extract_ip(&req),
            user_agent,
            request_id: Uuid::new_v4(),
        },
        Some(AuthInfo::ManagementKey {
            key_id,
            name,
            ..
        }) => AuditContext {
            actor_id: Some(*key_id),
            actor_email: None,
            actor_name: Some(format!("mgmt:{name}")),
            actor_type: ActorType::System,
            ip_address: extract_ip(&req),
            user_agent,
            request_id: Uuid::new_v4(),
        },
        None => AuditContext {
            actor_id: None,
            actor_email: None,
            actor_name: Some("system:unauthenticated".to_string()),
            actor_type: ActorType::System,
            ip_address: extract_ip(&req),
            user_agent,
            request_id: Uuid::new_v4(),
        },
    };

    req.extensions_mut().insert(ctx);
    next.run(req).await
}
