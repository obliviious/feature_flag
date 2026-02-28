/**
 * MurmurHash3 (32-bit) — deterministic hashing for percentage rollouts.
 * Matches the Rust eval-core implementation exactly.
 */
export function murmurhash3(key: Uint8Array, seed: number): number {
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const len = key.length;
  let h1 = seed >>> 0;

  // Body — process 4-byte chunks
  const nBlocks = Math.floor(len / 4);
  for (let i = 0; i < nBlocks; i++) {
    const offset = i * 4;
    let k =
      key[offset] |
      (key[offset + 1] << 8) |
      (key[offset + 2] << 16) |
      (key[offset + 3] << 24);

    k = Math.imul(k, c1) >>> 0;
    k = ((k << 15) | (k >>> 17)) >>> 0;
    k = Math.imul(k, c2) >>> 0;

    h1 = (h1 ^ k) >>> 0;
    h1 = ((h1 << 13) | (h1 >>> 19)) >>> 0;
    h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
  }

  // Tail — handle remaining bytes
  const tailOffset = nBlocks * 4;
  let k1 = 0;
  const tailLen = len & 3;

  if (tailLen >= 3) k1 ^= key[tailOffset + 2] << 16;
  if (tailLen >= 2) k1 ^= key[tailOffset + 1] << 8;
  if (tailLen >= 1) {
    k1 ^= key[tailOffset];
    k1 = Math.imul(k1, c1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = Math.imul(k1, c2) >>> 0;
    h1 = (h1 ^ k1) >>> 0;
  }

  // Finalization mix
  h1 = (h1 ^ len) >>> 0;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b) >>> 0;
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35) >>> 0;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

/**
 * Compute the bucket (0..10000) for a given flag key and targeting key.
 */
export function bucket(flagKey: string, targetingKey: string): number {
  const input = `${flagKey}/${targetingKey}`;
  const encoder = new TextEncoder();
  const hash = murmurhash3(encoder.encode(input), 0);
  return hash % 10000;
}
