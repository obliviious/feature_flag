import { describe, it, expect } from "vitest";
import { murmurhash3, bucket } from "../hasher";

describe("murmurhash3", () => {
  it("produces 0 for empty input with seed 0", () => {
    expect(murmurhash3(new Uint8Array(0), 0)).toBe(0);
  });

  it("is deterministic", () => {
    const input = new TextEncoder().encode("hello");
    const h1 = murmurhash3(input, 0);
    const h2 = murmurhash3(input, 0);
    expect(h1).toBe(h2);
  });

  it("produces different output for different seeds", () => {
    const input = new TextEncoder().encode("hello");
    const h1 = murmurhash3(input, 0);
    const h2 = murmurhash3(input, 1);
    expect(h1).not.toBe(h2);
  });
});

describe("bucket", () => {
  it("produces values in [0, 10000)", () => {
    for (let i = 0; i < 1000; i++) {
      const b = bucket("test-flag", `user-${i}`);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(10000);
    }
  });

  it("is deterministic", () => {
    const b1 = bucket("my-flag", "user-123");
    const b2 = bucket("my-flag", "user-123");
    expect(b1).toBe(b2);
  });

  it("produces different buckets for different flags", () => {
    const b1 = bucket("flag-a", "user-123");
    const b2 = bucket("flag-b", "user-123");
    expect(b1).not.toBe(b2);
  });

  it("has roughly uniform distribution", () => {
    const counts = new Array(10).fill(0);
    const n = 100000;

    for (let i = 0; i < n; i++) {
      const b = bucket("rollout-flag", `user-${i}`);
      counts[Math.floor(b / 1000)]++;
    }

    for (let i = 0; i < 10; i++) {
      const pct = (counts[i] / n) * 100;
      expect(pct).toBeGreaterThan(8);
      expect(pct).toBeLessThan(12);
    }
  });
});
