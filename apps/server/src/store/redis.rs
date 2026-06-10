use anyhow::Result;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Redis cache and pub/sub layer for FlagForge.
#[derive(Clone)]
pub struct RedisStore {
    client: redis::Client,
    conn: redis::aio::ConnectionManager,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedSdkAuth {
    pub key_id: Uuid,
    pub environment_id: Uuid,
    pub project_id: Uuid,
    pub key_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedSdkAuthEnvelope {
    found: bool,
    auth: Option<CachedSdkAuth>,
}

pub enum SdkAuthCacheLookup {
    Hit(CachedSdkAuth),
    Negative,
    Miss,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SdkConnectionInfo {
    pub sdk_instance_id: String,
    pub sdk_version: String,
    pub key_type: String,
    pub runtime: String,
    pub last_heartbeat_ts: i64,
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
        config_bytes: &[u8],
    ) -> Result<()> {
        let key = format!("flagforge:config:{environment_id}");
        let mut conn = self.conn.clone();
        conn.set_ex::<_, _, ()>(&key, config_bytes, 300).await?; // 5 min TTL
        Ok(())
    }

    /// Get cached flags config bytes for an environment.
    pub async fn get_cached_flags_config(
        &self,
        environment_id: Uuid,
    ) -> Result<Option<Vec<u8>>> {
        let key = format!("flagforge:config:{environment_id}");
        let mut conn = self.conn.clone();
        let result: Option<Vec<u8>> = conn.get(&key).await?;
        Ok(result)
    }

    /// Cache SDK key auth mapping for fast validation.
    pub async fn cache_sdk_auth(&self, key_hash: &str, auth: &CachedSdkAuth) -> Result<()> {
        let key = format!("flagforge:sdk_key:{key_hash}");
        let value = serde_json::to_string(&CachedSdkAuthEnvelope {
            found: true,
            auth: Some(auth.clone()),
        })?;
        let mut conn = self.conn.clone();
        conn.set_ex::<_, _, ()>(&key, value, 300).await?; // 5 min TTL
        Ok(())
    }

    /// Cache a negative SDK auth lookup to protect DB from invalid-key floods.
    pub async fn cache_sdk_auth_negative(&self, key_hash: &str) -> Result<()> {
        let key = format!("flagforge:sdk_key:{key_hash}");
        let value = serde_json::to_string(&CachedSdkAuthEnvelope {
            found: false,
            auth: None,
        })?;
        let mut conn = self.conn.clone();
        conn.set_ex::<_, _, ()>(&key, value, 60).await?; // short TTL for negatives
        Ok(())
    }

    /// Get cached SDK key auth mapping.
    pub async fn get_cached_sdk_auth(&self, key_hash: &str) -> Result<SdkAuthCacheLookup> {
        let key = format!("flagforge:sdk_key:{key_hash}");
        let mut conn = self.conn.clone();
        let result: Option<String> = conn.get(&key).await?;
        match result {
            Some(raw) => {
                // Backward compatible: support both new envelope and old direct-object format.
                if let Ok(env) = serde_json::from_str::<CachedSdkAuthEnvelope>(&raw) {
                    if env.found {
                        if let Some(auth) = env.auth {
                            return Ok(SdkAuthCacheLookup::Hit(auth));
                        }
                        return Ok(SdkAuthCacheLookup::Miss);
                    }
                    return Ok(SdkAuthCacheLookup::Negative);
                }
                if let Ok(auth) = serde_json::from_str::<CachedSdkAuth>(&raw) {
                    return Ok(SdkAuthCacheLookup::Hit(auth));
                }
                Ok(SdkAuthCacheLookup::Miss)
            }
            None => Ok(SdkAuthCacheLookup::Miss),
        }
    }

    /// Invalidate cached SDK key auth mapping (e.g. on rotation/revoke).
    pub async fn invalidate_sdk_auth(&self, key_hash: &str) -> Result<()> {
        let key = format!("flagforge:sdk_key:{key_hash}");
        let mut conn = self.conn.clone();
        conn.del::<_, ()>(&key).await?;
        Ok(())
    }

    /// Record SDK heartbeat in a sorted set keyed by environment.
    pub async fn record_sdk_heartbeat(
        &self,
        environment_id: Uuid,
        timestamp_secs: i64,
        sdk_instance_id: &str,
        sdk_version: &str,
        key_type: &str,
        runtime: &str,
    ) -> Result<()> {
        let key = format!("flagforge:sdk_connections:{environment_id}");
        let member = format!("{sdk_instance_id}:{sdk_version}:{key_type}:{runtime}");
        let mut conn = self.conn.clone();
        redis::cmd("ZADD")
            .arg(&key)
            .arg(timestamp_secs)
            .arg(member)
            .query_async::<()>(&mut conn)
            .await?;
        Ok(())
    }

    /// Remove stale SDK heartbeat entries older than stale_before_secs.
    pub async fn cleanup_stale_sdk_connections(
        &self,
        environment_id: Uuid,
        stale_before_secs: i64,
    ) -> Result<()> {
        let key = format!("flagforge:sdk_connections:{environment_id}");
        let mut conn = self.conn.clone();
        redis::cmd("ZREMRANGEBYSCORE")
            .arg(&key)
            .arg("-inf")
            .arg(stale_before_secs)
            .query_async::<()>(&mut conn)
            .await?;
        Ok(())
    }

    /// List active SDK heartbeat entries newer than active_since_secs.
    pub async fn list_active_sdk_connections(
        &self,
        environment_id: Uuid,
        active_since_secs: i64,
    ) -> Result<Vec<SdkConnectionInfo>> {
        let key = format!("flagforge:sdk_connections:{environment_id}");
        let mut conn = self.conn.clone();
        let rows: Vec<(String, i64)> = redis::cmd("ZRANGEBYSCORE")
            .arg(&key)
            .arg(active_since_secs)
            .arg("+inf")
            .arg("WITHSCORES")
            .query_async(&mut conn)
            .await?;

        let mut out = Vec::with_capacity(rows.len());
        for (member, score) in rows {
            let mut parts = member.splitn(4, ':');
            let sdk_instance_id = parts.next().unwrap_or_default().to_string();
            let sdk_version = parts.next().unwrap_or("unknown").to_string();
            let key_type = parts.next().unwrap_or("unknown").to_string();
            let runtime = parts.next().unwrap_or("unknown").to_string();

            out.push(SdkConnectionInfo {
                sdk_instance_id,
                sdk_version,
                key_type,
                runtime,
                last_heartbeat_ts: score,
            });
        }
        Ok(out)
    }

    /// Increment per-SDK-key rate limit counter for the given minute bucket.
    pub async fn increment_sdk_rate_limit_counter(
        &self,
        key_id: Uuid,
        minute_bucket: i64,
        ttl_secs: i64,
    ) -> Result<u32> {
        let key = format!("flagforge:ratelimit:sdk:{key_id}:{minute_bucket}");
        let mut conn = self.conn.clone();
        let count: u32 = conn.incr(&key, 1).await?;
        if count == 1 {
            conn.expire::<_, ()>(&key, ttl_secs).await?;
        }
        Ok(count)
    }

    /// Invalidate cached config for an environment.
    pub async fn invalidate_config(&self, environment_id: Uuid) -> Result<()> {
        let key = format!("flagforge:config:{environment_id}");
        let mut conn = self.conn.clone();
        conn.del::<_, ()>(&key).await?;
        Ok(())
    }

    /// Publish a config change event to Redis Pub/Sub.
    pub async fn next_config_change_seq(&self) -> Result<i64> {
        let key = "flagforge:config_change_seq";
        let mut conn = self.conn.clone();
        let seq: i64 = conn.incr(key, 1).await?;
        Ok(seq)
    }

    /// Publish a config change event to Redis Pub/Sub.
    pub async fn publish_config_change(
        &self,
        seq: i64,
        environment_id: Uuid,
        version: i64,
        full_reload: bool,
        changed_flags: &[String],
        deleted_flags: &[String],
    ) -> Result<()> {
        let channel = "flagforge:config_changes";
        let payload = serde_json::json!({
            "seq": seq,
            "environment_id": environment_id,
            "version": version,
            "full_reload": full_reload,
            "changed_flags": changed_flags,
            "deleted_flags": deleted_flags,
        });
        let mut conn = self.conn.clone();
        conn.publish::<_, _, ()>(channel, payload.to_string())
            .await?;
        Ok(())
    }
}
