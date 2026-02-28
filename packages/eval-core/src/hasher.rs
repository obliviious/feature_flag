/// MurmurHash3 (32-bit) implementation for deterministic percentage rollouts.
///
/// Produces a value in 0..10000 (basis points) for 0.01% granularity bucketing.
/// Uses the same algorithm as LaunchDarkly and other feature flag systems.
pub fn murmurhash3(key: &[u8], seed: u32) -> u32 {
    let c1: u32 = 0xcc9e2d51;
    let c2: u32 = 0x1b873593;

    let len = key.len();
    let mut h1 = seed;

    // Body — process 4-byte chunks
    let n_blocks = len / 4;
    for i in 0..n_blocks {
        let offset = i * 4;
        let k = u32::from_le_bytes([
            key[offset],
            key[offset + 1],
            key[offset + 2],
            key[offset + 3],
        ]);

        let mut k1 = k;
        k1 = k1.wrapping_mul(c1);
        k1 = k1.rotate_left(15);
        k1 = k1.wrapping_mul(c2);

        h1 ^= k1;
        h1 = h1.rotate_left(13);
        h1 = h1.wrapping_mul(5).wrapping_add(0xe6546b64);
    }

    // Tail — handle remaining bytes
    let tail_offset = n_blocks * 4;
    let mut k1: u32 = 0;

    let tail_len = len & 3;
    if tail_len >= 3 {
        k1 ^= (key[tail_offset + 2] as u32) << 16;
    }
    if tail_len >= 2 {
        k1 ^= (key[tail_offset + 1] as u32) << 8;
    }
    if tail_len >= 1 {
        k1 ^= key[tail_offset] as u32;
        k1 = k1.wrapping_mul(c1);
        k1 = k1.rotate_left(15);
        k1 = k1.wrapping_mul(c2);
        h1 ^= k1;
    }

    // Finalization mix
    h1 ^= len as u32;
    h1 ^= h1 >> 16;
    h1 = h1.wrapping_mul(0x85ebca6b);
    h1 ^= h1 >> 13;
    h1 = h1.wrapping_mul(0xc2b2ae35);
    h1 ^= h1 >> 16;

    h1
}

/// Compute the bucket (0..10000) for a given flag key and targeting key.
///
/// The hash input is `"{flag_key}/{targeting_key}"` to ensure different flags
/// produce different bucket assignments for the same user.
pub fn bucket(flag_key: &str, targeting_key: &str) -> i32 {
    let input = format!("{flag_key}/{targeting_key}");
    let hash = murmurhash3(input.as_bytes(), 0);
    (hash % 10000) as i32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_murmurhash3_known_values() {
        // Empty string with seed 0
        assert_eq!(murmurhash3(b"", 0), 0);
        // Known values for deterministic verification
        let h1 = murmurhash3(b"hello", 0);
        let h2 = murmurhash3(b"hello", 0);
        assert_eq!(h1, h2, "Same input must produce same hash");

        let h3 = murmurhash3(b"hello", 1);
        assert_ne!(h1, h3, "Different seed should produce different hash");
    }

    #[test]
    fn test_bucket_range() {
        for i in 0..1000 {
            let b = bucket("test-flag", &format!("user-{i}"));
            assert!((0..10000).contains(&b), "Bucket {b} out of range");
        }
    }

    #[test]
    fn test_bucket_deterministic() {
        let b1 = bucket("my-flag", "user-123");
        let b2 = bucket("my-flag", "user-123");
        assert_eq!(b1, b2);
    }

    #[test]
    fn test_bucket_different_flags() {
        let b1 = bucket("flag-a", "user-123");
        let b2 = bucket("flag-b", "user-123");
        // Different flags should (usually) produce different buckets
        // This isn't guaranteed but is overwhelmingly likely
        assert_ne!(b1, b2);
    }

    #[test]
    fn test_uniform_distribution() {
        let mut counts = [0u32; 10];
        let n = 100_000;
        for i in 0..n {
            let b = bucket("rollout-flag", &format!("user-{i}"));
            counts[(b / 1000) as usize] += 1;
        }
        // Each decile should have roughly 10% — allow 2% tolerance
        for (i, &count) in counts.iter().enumerate() {
            let pct = (count as f64 / n as f64) * 100.0;
            assert!(
                (8.0..12.0).contains(&pct),
                "Decile {i} has {pct:.1}% — distribution is not uniform"
            );
        }
    }
}
