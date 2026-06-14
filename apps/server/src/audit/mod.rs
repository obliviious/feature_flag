use std::net::IpAddr;

use axum::extract::Request;
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ActorType {
    User,
    Sdk,
    System,
}

impl ActorType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Sdk => "sdk",
            Self::System => "system",
        }
    }
}

#[derive(Debug, Clone)]
pub struct AuditContext {
    pub actor_id: Option<Uuid>,
    pub actor_email: Option<String>,
    pub actor_name: Option<String>,
    pub actor_type: ActorType,
    pub ip_address: Option<IpAddr>,
    pub user_agent: Option<String>,
    pub request_id: Uuid,
}

impl AuditContext {
    pub fn system(operation: &str) -> Self {
        Self {
            actor_id: None,
            actor_email: None,
            actor_name: Some(format!("system:{operation}")),
            actor_type: ActorType::System,
            ip_address: None,
            user_agent: None,
            request_id: Uuid::new_v4(),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum AuditSeverity {
    Info,
    Warning,
    Critical,
}

impl AuditSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Info => "info",
            Self::Warning => "warning",
            Self::Critical => "critical",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum AuditAction {
    FlagCreated,
    FlagUpdated,
    FlagDeleted,
    FlagToggled,
    FlagLifecycleUpdated,
    SegmentCreated,
    EnvironmentCreated,
    SdkKeyCreated,
    SdkKeyRevoked,
    ManagementKeyCreated,
    ManagementKeyRevoked,
    ProjectCreated,
}

impl AuditAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FlagCreated => "flag_created",
            Self::FlagUpdated => "flag_updated",
            Self::FlagDeleted => "flag_deleted",
            Self::FlagToggled => "flag_toggled",
            Self::FlagLifecycleUpdated => "flag_lifecycle_updated",
            Self::SegmentCreated => "segment_created",
            Self::EnvironmentCreated => "environment_created",
            Self::SdkKeyCreated => "sdk_key_created",
            Self::SdkKeyRevoked => "sdk_key_revoked",
            Self::ManagementKeyCreated => "management_key_created",
            Self::ManagementKeyRevoked => "management_key_revoked",
            Self::ProjectCreated => "project_created",
        }
    }

    pub fn severity(&self) -> AuditSeverity {
        match self {
            Self::SdkKeyRevoked | Self::FlagDeleted | Self::ManagementKeyRevoked => {
                AuditSeverity::Critical
            }
            Self::FlagToggled => AuditSeverity::Warning,
            _ => AuditSeverity::Info,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct FieldChange {
    pub field: String,
    pub before: serde_json::Value,
    pub after: serde_json::Value,
    pub kind: String,
}

pub fn compute_diff(before: &serde_json::Value, after: &serde_json::Value) -> serde_json::Value {
    let changes = diff_values("", before, after);
    serde_json::json!({
        "changes": changes,
        "change_count": changes.len(),
    })
}

fn diff_values(
    path: &str,
    before: &serde_json::Value,
    after: &serde_json::Value,
) -> Vec<FieldChange> {
    use serde_json::Value;

    let mut changes = Vec::new();
    match (before, after) {
        (Value::Object(b), Value::Object(a)) => {
            for (key, b_val) in b {
                let field_path = if path.is_empty() {
                    key.clone()
                } else {
                    format!("{path}.{key}")
                };
                match a.get(key) {
                    None => changes.push(FieldChange {
                        field: field_path,
                        before: b_val.clone(),
                        after: Value::Null,
                        kind: "removed".to_string(),
                    }),
                    Some(a_val) if a_val != b_val => {
                        if b_val.is_object() && a_val.is_object() {
                            changes.extend(diff_values(&field_path, b_val, a_val));
                        } else {
                            changes.push(FieldChange {
                                field: field_path,
                                before: b_val.clone(),
                                after: a_val.clone(),
                                kind: "modified".to_string(),
                            });
                        }
                    }
                    _ => {}
                }
            }
            for (key, a_val) in a {
                if !b.contains_key(key) {
                    let field_path = if path.is_empty() {
                        key.clone()
                    } else {
                        format!("{path}.{key}")
                    };
                    changes.push(FieldChange {
                        field: field_path,
                        before: Value::Null,
                        after: a_val.clone(),
                        kind: "added".to_string(),
                    });
                }
            }
        }
        (b, a) if b != a => {
            changes.push(FieldChange {
                field: path.to_string(),
                before: b.clone(),
                after: a.clone(),
                kind: "modified".to_string(),
            });
        }
        _ => {}
    }
    changes
}

pub fn extract_ip(req: &Request) -> Option<IpAddr> {
    if let Some(cf_ip) = req.headers().get("CF-Connecting-IP") {
        if let Ok(ip) = cf_ip.to_str().unwrap_or("").parse() {
            return Some(ip);
        }
    }
    if let Some(forwarded) = req.headers().get("X-Forwarded-For") {
        if let Some(first) = forwarded.to_str().unwrap_or("").split(',').next() {
            if let Ok(ip) = first.trim().parse() {
                return Some(ip);
            }
        }
    }
    None
}
