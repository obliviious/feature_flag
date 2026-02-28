use anyhow::Result;
use redis::AsyncCommands;
use uuid::Uuid;

/// Redis cache and pub/sub layer for FlagForge.
#[derive(Clone)]
pub struct RedisStore {
    client: redis::Client,
    conn: redis::aio::ConnectionManager,
}

impl RedisStore {
    pub async fn new(redis_url: &str) -> Result<Self> {
        let client = redis::Client::open(redis_url)?;
        let conn = redis::aio::ConnectionManager::new(client.clone()).await?;
        Ok(Self { client, conn })
    }

    pub fn client(&self) -> &redis::Client {
        &self.client
    }

    /// Cache the serialized flags config for an environment.
    pub async fn cache_flags_config(
        &self,
        environment_id: Uuid,
        config_json: &str,
    ) -> Result<()> {
        let key = format!("flagforge:config:{environment_id}");
        let mut conn = self.conn.clone();
        conn.set_ex::<_, _, ()>(&key, config_json, 300).await?; // 5 min TTL
        Ok(())
    }

    /// Get cached flags config for an environment.
    pub async fn get_cached_flags_config(
        &self,
        environment_id: Uuid,
    ) -> Result<Option<String>> {
        let key = format!("flagforge:config:{environment_id}");
        let mut conn = self.conn.clone();
        let result: Option<String> = conn.get(&key).await?;
        Ok(result)
    }

    /// Invalidate cached config for an environment.
    pub async fn invalidate_config(&self, environment_id: Uuid) -> Result<()> {
        let key = format!("flagforge:config:{environment_id}");
        let mut conn = self.conn.clone();
        conn.del::<_, ()>(&key).await?;
        Ok(())
    }

    /// Publish a config change event to Redis Pub/Sub.
    pub async fn publish_config_change(
        &self,
        environment_id: Uuid,
        version: i64,
    ) -> Result<()> {
        let channel = "flagforge:config_changes";
        let payload = serde_json::json!({
            "environment_id": environment_id,
            "version": version,
        });
        let mut conn = self.conn.clone();
        conn.publish::<_, _, ()>(channel, payload.to_string())
            .await?;
        Ok(())
    }
}
