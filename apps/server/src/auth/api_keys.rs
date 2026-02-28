use rand::Rng;
use sha2::{Digest, Sha256};

/// Generate a new SDK key with the given prefix ("srv_" or "cli_").
pub fn generate_sdk_key(prefix: &str) -> (String, String, String) {
    let random_bytes: Vec<u8> = (0..32).map(|_| rand::thread_rng().gen()).collect();
    let key_body = hex::encode(&random_bytes);
    let full_key = format!("{prefix}{key_body}");
    let key_prefix = format!("{}{}", prefix, &key_body[..8]);
    let key_hash = hash_key(&full_key);
    (full_key, key_hash, key_prefix)
}

/// Hash an SDK key for secure storage.
pub fn hash_key(key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    hex::encode(hasher.finalize())
}
