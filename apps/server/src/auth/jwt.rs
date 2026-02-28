use anyhow::{anyhow, Result};
use jsonwebtoken::{decode, decode_header, jwk::JwkSet, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Serialize, Deserialize)]
pub struct ClerkClaims {
    pub sub: String,
    pub email: Option<String>,
    pub org_id: Option<String>,
    pub exp: usize,
    pub iat: usize,
    pub iss: Option<String>,
}

/// Caches JWKS keys fetched from Clerk's well-known endpoint.
#[derive(Clone)]
pub struct JwksCache {
    clerk_domain: String,
    keys: Arc<RwLock<HashMap<String, DecodingKey>>>,
    http: reqwest::Client,
}

impl JwksCache {
    pub fn new(clerk_domain: &str) -> Self {
        Self {
            clerk_domain: clerk_domain.to_string(),
            keys: Arc::new(RwLock::new(HashMap::new())),
            http: reqwest::Client::new(),
        }
    }

    /// Fetch JWKS from Clerk and update the cache.
    pub async fn refresh(&self) -> Result<()> {
        let url = format!(
            "https://{}/.well-known/jwks.json",
            self.clerk_domain
        );

        let jwks: JwkSet = self.http.get(&url).send().await?.json().await?;

        let mut new_keys = HashMap::new();
        for jwk in &jwks.keys {
            if let Some(kid) = &jwk.common.key_id {
                match DecodingKey::from_jwk(jwk) {
                    Ok(key) => {
                        new_keys.insert(kid.clone(), key);
                    }
                    Err(e) => {
                        tracing::warn!("Skipping JWK kid={kid}: {e}");
                    }
                }
            }
        }

        if new_keys.is_empty() {
            return Err(anyhow!("No valid keys found in JWKS response"));
        }

        let mut cache = self.keys.write().await;
        *cache = new_keys;

        tracing::debug!("JWKS cache refreshed with {} keys", cache.len());
        Ok(())
    }

    /// Verify a Clerk-issued JWT token.
    pub async fn verify_token(&self, token: &str) -> Result<ClerkClaims> {
        let header = decode_header(token)?;
        let kid = header.kid.ok_or_else(|| anyhow!("Token missing kid header"))?;

        // Try cached key first
        let key = {
            let cache = self.keys.read().await;
            cache.get(&kid).cloned()
        };

        let key = match key {
            Some(k) => k,
            None => {
                // Key not in cache — refresh and retry
                self.refresh().await?;
                let cache = self.keys.read().await;
                cache
                    .get(&kid)
                    .cloned()
                    .ok_or_else(|| anyhow!("Unknown kid: {kid}"))?
            }
        };

        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&[format!("https://{}", self.clerk_domain)]);

        let token_data = decode::<ClerkClaims>(token, &key, &validation)?;
        Ok(token_data.claims)
    }
}
