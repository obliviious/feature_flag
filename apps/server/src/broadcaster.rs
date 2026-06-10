use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use uuid::Uuid;

/// Event published when a flag config changes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigChangeEvent {
    #[serde(default)]
    pub seq: i64,
    pub environment_id: Uuid,
    pub version: i64,
    #[serde(default)]
    pub full_reload: bool,
    #[serde(default)]
    pub changed_flags: Vec<String>,
    #[serde(default)]
    pub deleted_flags: Vec<String>,
}

/// Fan-out broadcaster backed by a tokio broadcast channel.
#[derive(Clone)]
pub struct Broadcaster {
    sender: broadcast::Sender<ConfigChangeEvent>,
}

impl Broadcaster {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    /// Subscribe to config change events.
    pub fn subscribe(&self) -> broadcast::Receiver<ConfigChangeEvent> {
        self.sender.subscribe()
    }

    /// Send a config change event to all subscribers.
    pub fn send(&self, event: ConfigChangeEvent) {
        // Ignore error — means no active receivers
        let _ = self.sender.send(event);
    }
}
