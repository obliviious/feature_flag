export interface BlogPost {
  slug: string;
  title: string;
  tag: string;
  date: string;
  readTime: string;
  excerpt: string;
  content: string;
}

const posts: BlogPost[] = [
  {
    slug: "messagepack-redis-caching",
    title: "Why We Replaced JSON with MessagePack in Redis — and Cut Payload Size by 40%",
    tag: "Engineering",
    date: "May 2026",
    readTime: "7 min read",
    excerpt:
      "Every flag evaluation hit Redis. Serialisation overhead was adding up. Here's how we moved from JSON to MessagePack for config caching and why it matters at scale.",
    content: `
## The problem with JSON in a hot cache

FlagForge's evaluation path looks deceptively simple:

1. SDK sends a config snapshot request.
2. Server checks Redis for a cached \`FlagsConfig\`.
3. If miss → build from SQLite → write to Redis → return.
4. If hit → deserialise → return.

Step 4 was innocent until we put numbers on it. A typical project with 50 flags, 3 environments, and a few rollout rules serialises to **~14 KB of JSON**. That's fine for one request. At 5,000 evaluations per second it's 70 MB/s of data that every server process deserialises on every cache hit.

JSON deserialisation is not free. It allocates strings, parses Unicode escapes, walks braces — all on the hot path.

---

## Choosing MessagePack

We evaluated three alternatives:

| Format | Size vs JSON | Schema required | Rust ecosystem |
|--------|-------------|-----------------|----------------|
| MessagePack | −40 to −60% | No | ✅ \`rmp-serde\` |
| CBOR | −30 to −50% | No | ✅ \`ciborium\` |
| Protobuf | −60 to −75% | Yes (proto files) | ✅ \`prost\` |
| JSON | baseline | No | N/A |

Protobuf wins on size but requires a separate schema file kept in sync with Rust types. MessagePack gives us **schema-free binary serialisation** — we annotate existing structs with \`#[derive(Serialize, Deserialize)]\` and \`rmp-serde\` handles the rest.

---

## Implementation

The change was surgical. Our \`RedisStore\` exposed two functions:

\`\`\`rust
pub async fn cache_flags_config(&self, env_id: Uuid, data: &[u8]) -> Result<()>
pub async fn get_cached_flags_config(&self, env_id: Uuid) -> Result<Option<Vec<u8>>>
\`\`\`

Previously both operated on JSON strings. The callers in \`evaluate.rs\` now:

\`\`\`rust
// Serialise to MessagePack
let bytes = rmp_serde::to_vec_named(&config)
    .map_err(|e| anyhow::anyhow!("msgpack serialise: {e}"))?;
redis.cache_flags_config(env_id, &bytes).await?;

// Deserialise with JSON fallback for in-place migration
match rmp_serde::from_slice::<FlagsConfig>(&bytes) {
    Ok(cfg) => cfg,
    Err(_) => serde_json::from_slice(&bytes)?, // old JSON entries still work
}
\`\`\`

The fallback lets old Redis entries (JSON) drain naturally without a cache flush or downtime.

---

## Results on a 50-flag project

| Metric | JSON | MessagePack | Delta |
|--------|------|-------------|-------|
| Cached payload size | 13.8 KB | 8.1 KB | **−41%** |
| Deserialise time (p99) | 210 µs | 95 µs | **−55%** |
| Redis bandwidth (5k rps) | ~69 MB/s | ~41 MB/s | **−41%** |

Smaller payloads also improve Redis pipeline efficiency — more messages fit in a single network round trip.

---

## The circuit breaker companion

Switching to MessagePack surfaced a second concern: what happens when Redis itself goes down? We don't want every evaluation to fall back to SQLite and hammer the database.

We built a **Redis circuit breaker** alongside the MessagePack change:

- **CLOSED** → normal operation, all requests go to Redis.
- **OPEN** → Redis is presumed down; requests go to an in-process \`local_cache\` (per-environment \`FlagsConfig\` snapshots held in a \`RwLock<HashMap>\`).
- **HALF-OPEN** → a probe request tests Redis. If it succeeds, circuit closes; if it fails, exponential backoff extends.

\`\`\`rust
pub fn allow_request(&mut self) -> bool {
    match self.state {
        CircuitState::Closed => true,
        CircuitState::Open => {
            let now = Instant::now();
            if now >= self.next_probe_at {
                self.state = CircuitState::HalfOpen;
                true
            } else {
                false
            }
        }
        CircuitState::HalfOpen => false,
    }
}
\`\`\`

The combination means flag evaluation is resilient to full Redis outages — SDKs keep getting responses from the local snapshot without any visible degradation.

---

## Key takeaways

- **Binary formats are cheap to adopt in Rust.** \`rmp-serde\` is a drop-in for \`serde_json\`.
- **Add a JSON fallback** when migrating a live cache to avoid a cold-start flush.
- **Measure payload size** before optimising. Our 40% reduction came almost for free.
- **Pair caching improvements with resilience.** A faster cache path is useless if it becomes a single point of failure.
`,
  },

  {
    slug: "circuit-breaker-local-evaluation",
    title: "Never Miss a Flag Evaluation: Circuit Breakers and In-Process Caching",
    tag: "Architecture",
    date: "May 2026",
    readTime: "9 min read",
    excerpt:
      "Redis going down should not mean your users stop seeing feature flags. We describe the circuit breaker pattern and local in-memory snapshot cache we built to make evaluation resilient.",
    content: `
## What breaks when Redis breaks

FlagForge uses Redis for three things:

1. **Config snapshot cache** — avoid re-building flag configs from SQLite on every evaluation.
2. **SDK key auth cache** — avoid repeated DB lookups for key validation.
3. **Pub/Sub** — propagate flag changes to server processes via SSE.

If Redis disappears:

- Cache misses drive every evaluation request to SQLite. A busy server doing 2,000 rps would issue 2,000 SQLite reads per second — a load it was never designed to sustain.
- Pub/Sub breaks, so SSE subscribers stop receiving change events and serve stale configs until they reconnect.

Neither is acceptable. We need **graceful degradation**.

---

## Layer 1: The circuit breaker

A circuit breaker sits in front of every Redis call:

\`\`\`
              ┌─────────────────────┐
request ─────►│  CircuitBreaker     │──── CLOSED ────► Redis
              │                     │
              │  OPEN  ─────────────┼──────────────► local_cache
              │                     │
              │  HALF-OPEN ─────────┼───── probe ──► Redis
              └─────────────────────┘
\`\`\`

**State transitions:**

| From | To | Trigger |
|------|----|---------|
| CLOSED | OPEN | N consecutive Redis failures |
| OPEN | HALF-OPEN | Backoff timer expires |
| HALF-OPEN | CLOSED | Probe succeeds |
| HALF-OPEN | OPEN | Probe fails → exponential backoff |

Backoff starts at 2 seconds and doubles each failed probe up to 60 seconds (configurable via \`REDIS_CB_INITIAL_BACKOFF_SECS\` / \`REDIS_CB_MAX_BACKOFF_SECS\`).

\`\`\`rust
pub struct RedisCircuitBreaker {
    state: CircuitState,
    failures: u32,
    threshold: u32,
    next_probe_at: Instant,
    backoff: Duration,
    max_backoff: Duration,
}

impl RedisCircuitBreaker {
    pub fn on_failure(&mut self) {
        self.failures += 1;
        if self.failures >= self.threshold {
            self.state = CircuitState::Open;
            self.next_probe_at = Instant::now() + self.backoff;
            self.backoff = (self.backoff * 2).min(self.max_backoff);
        }
    }

    pub fn on_success(&mut self) {
        self.state = CircuitState::Closed;
        self.failures = 0;
        self.backoff = Duration::from_secs(2); // reset
    }
}
\`\`\`

---

## Layer 2: The local snapshot cache

When the circuit is open, we can't use Redis. The fallback is an in-process \`HashMap\` of recently built \`FlagsConfig\` values, keyed by environment UUID.

\`\`\`rust
pub struct CachedConfig {
    config: eval_core::FlagsConfig,
    cached_at: Instant,
}

// In AppState:
local_cache: Arc<RwLock<HashMap<Uuid, CachedConfig>>>
\`\`\`

Evaluation reads this cache when Redis is unavailable:

\`\`\`rust
async fn get_flags_config(state: &AppState, env_id: Uuid) -> FlagsConfig {
    let breaker_allows = {
        let mut cb = state.redis_circuit_breaker.lock().await;
        cb.allow_request()
    };

    if breaker_allows {
        if let Some(ref redis) = state.redis {
            match redis.get_cached_flags_config(env_id).await {
                Ok(Some(bytes)) => {
                    // deserialise, update local cache, return
                    let cfg = rmp_serde::from_slice(&bytes)?;
                    state.update_local_cache(env_id, cfg.clone()).await;
                    state.redis_circuit_breaker.lock().await.on_success();
                    return cfg;
                }
                Err(e) => {
                    state.redis_circuit_breaker.lock().await.on_failure();
                    tracing::warn!("Redis error: {e}");
                }
                _ => {}
            }
        }
    }

    // Fallback: serve local snapshot
    if let Some(cached) = state.get_local_cache(env_id).await {
        return cached;
    }

    // Last resort: rebuild from SQLite
    let config = state.store.build_flags_config(project_id, env_id).await?;
    state.update_local_cache(env_id, config.clone()).await;
    config
}
\`\`\`

**Important:** the local cache is never invalidated unless the process restarts or Redis comes back. During a Redis outage, SDKs get slightly stale configs. That is intentional — stale flags are better than evaluation failures.

---

## Layer 3: SDK-side resilience

The server-side JS SDK (using a **server key**) downloads the full \`FlagsConfig\` at startup and evaluates entirely in memory:

\`\`\`
SDK process
├── local FlagsConfig snapshot
├── SSE connection → receives config / config_delta events
└── evaluate() → zero network calls, zero Redis calls
\`\`\`

Even if the FlagForge server goes completely offline, an already-initialised SDK keeps evaluating from its last snapshot. The SDK reconnects with exponential backoff (1s → 2s → 4s … max 30s).

This is why we call it **local evaluation** — the critical path never leaves the SDK process.

---

## Alerting when the circuit opens

When the circuit transitions to OPEN we emit a webhook alert (configurable via \`REDIS_DOWN_ALERT_WEBHOOK\`):

\`\`\`rust
async fn send_redis_down_alert(state: &AppState) {
    let Some(ref url) = state.config.redis_down_alert_webhook else { return };
    let _ = reqwest::Client::new()
        .post(url)
        .json(&serde_json::json!({
            "event": "redis_circuit_open",
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }))
        .send()
        .await;
}
\`\`\`

Plug this into PagerDuty, Slack, or any webhook receiver to get notified immediately.

---

## Summary

| Scenario | What serves flag evaluations |
|----------|------------------------------|
| Redis healthy | Redis MessagePack cache |
| Redis slow / flaky | Circuit breaker trips → local snapshot |
| Redis fully down | Local snapshot (may be slightly stale) |
| FlagForge server down | SDK's own in-memory snapshot |

Four layers of fallback mean a flag evaluation returns a valid value in essentially every failure scenario.
`,
  },

  {
    slug: "sse-delta-streaming-heartbeats",
    title: "Real-Time Feature Flags at Scale: SSE Deltas, Sequence Numbers, and SDK Heartbeats",
    tag: "Engineering",
    date: "Jun 2026",
    readTime: "10 min read",
    excerpt:
      "Streaming full config blobs on every change doesn't scale. We rebuilt our SSE pipeline with delta patches, monotonic sequence numbers for idempotency, and a heartbeat system for connection observability.",
    content: `
## The naive approach: full config on every change

Our first SSE implementation was straightforward:

1. A flag changes in the database.
2. Server publishes a Redis Pub/Sub message.
3. Every subscribed SSE connection reads the new full \`FlagsConfig\` and sends it to the SDK.
4. SDK discards its old snapshot and applies the new one.

This works fine for a handful of SDKs with small configs. The problem arrives when you have:

- **1,000 SDK instances** connected
- **50 flags** (≈ 14 KB per config)
- **A flag toggles** — perhaps 50 times per day

Each toggle pushes **14 KB × 1,000 = 14 MB** of data. 50 toggles = **700 MB/day** just for config syncs. And every SDK must parse the full blob, compare every flag, and update its evaluator — even if one boolean changed.

---

## Delta updates: only send what changed

Instead of the full config, the server now emits a \`config_delta\` event:

\`\`\`json
{
  "event": "config_delta",
  "data": {
    "seq": 1749,
    "from_version": 42,
    "to_version": 43,
    "changed_flags": {
      "new-checkout": { "key": "new-checkout", "flag_type": "boolean", ... }
    },
    "deleted_flags": []
  }
}
\`\`\`

The SDK applies the patch in-place:

\`\`\`typescript
function applyConfigDelta(current: FlagsConfig, delta: ConfigDelta): ApplyDeltaResult {
  if (!current) return { ok: false, reason: "no_current_config" };
  if (delta.from_version !== current.version) {
    return { ok: false, reason: "version_mismatch" };
  }

  const nextFlags = { ...current.flags, ...changedTransformed.flags };
  for (const key of delta.deleted_flags ?? []) {
    delete nextFlags[key];
  }

  return { ok: true, config: { ...current, flags: nextFlags, version: delta.to_version } };
}
\`\`\`

When a single flag changes, the delta is typically **500–800 bytes** instead of 14 KB — a **≥94% reduction**.

---

## When to fall back to a full config

Deltas are not always applicable. The server sends a full \`config\` event when:

| Condition | Reason |
|-----------|--------|
| SSE subscriber lagged (missed messages) | Can't reconstruct intermediate state |
| \`full_reload: true\` in the pub/sub message | Bulk change — segment edit, environment add |
| \`from_version\` mismatch on the server | SDK version jumped — apply full snapshot |

The SDK also detects mismatches independently. If \`delta.from_version !== currentConfig.version\`, it discards the delta and fetches the full config:

\`\`\`typescript
const applied = await this.applyDeltaOrReload(raw);
// internally: on version_mismatch → fetchFlagsConfig()
\`\`\`

This guarantees correctness regardless of network reordering or missed events.

---

## Monotonic sequence numbers for idempotency

SSE over HTTP has a known failure mode: on reconnect, the client may receive events it already applied. Without deduplication this corrupts state.

We added a monotonic \`seq\` number generated from a Redis atomic counter:

\`\`\`rust
pub async fn next_config_change_seq(&self) -> Result<i64> {
    let seq: i64 = self.conn()?.incr("flagforge:config_seq", 1).await?;
    Ok(seq)
}
\`\`\`

The SDK tracks applied sequences in a bounded ring buffer:

\`\`\`typescript
private appliedSeqs = new Set<number>();
private appliedSeqQueue: number[] = [];
private readonly maxAppliedSeqs = 1000;

private trackAppliedSeq(seq: number): void {
  this.appliedSeqs.add(seq);
  this.appliedSeqQueue.push(seq);
  while (this.appliedSeqQueue.length > this.maxAppliedSeqs) {
    const oldest = this.appliedSeqQueue.shift();
    if (oldest !== undefined) this.appliedSeqs.delete(oldest);
  }
}
\`\`\`

Before applying any \`config_delta\`:

\`\`\`typescript
if (typeof raw.seq === "number" && raw.seq > 0) {
  if (this.hasAppliedSeq(raw.seq)) continue; // duplicate — skip
}
\`\`\`

The 1,000-entry buffer covers reconnection windows of several minutes at high change rates. The ring buffer purges the oldest entry whenever it's full, bounding memory at O(1000 entries).

---

## SDK heartbeats for observability

With thousands of SDK instances, you want to know:

- How many SDKs are connected per environment?
- Which SDK versions are deployed?
- Are any environments orphaned (no SDKs receiving updates)?

The SDK sends periodic heartbeats to \`POST /api/v1/heartbeat\`:

\`\`\`typescript
private async sendHeartbeat(): Promise<void> {
  await fetch(\`\${this.config.baseUrl}/api/v1/heartbeat\`, {
    method: "POST",
    headers: { Authorization: this.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sdk_instance_id: this.sdkInstanceId,
      sdk_version: SDK_VERSION,
      runtime: detectRuntime(), // "node" | "browser" | "edge"
    }),
  });
}
\`\`\`

The server stores heartbeats in a Redis ZSET keyed by environment:

\`\`\`
ZADD flagforge:sdk_connections:{env_id} {timestamp} {json_payload}
\`\`\`

This gives O(log n) insertion and O(log n + k) range queries. Stale connections (no heartbeat in 5 minutes) are pruned on every heartbeat:

\`\`\`rust
let stale_before = now - 300; // 5 minutes
redis.cleanup_stale_sdk_connections(env_id, stale_before).await?;
\`\`\`

The management dashboard queries \`GET /api/v1/projects/{id}/sdk-connections\` to display live connection counts, SDK versions, and runtimes per environment — all derived purely from the ZSET.

---

## End-to-end flow for a flag change

\`\`\`
Dashboard toggle
  │
  ▼
PUT /flags/{key}/toggle
  │  increment config_version
  │  invalidate Redis config cache
  │  publish Redis Pub/Sub: { seq, env_id, version, changed_flags: ["new-checkout"] }
  │
  ▼
Redis Pub/Sub subscriber (server process)
  │  receives message → writes to in-memory broadcaster channel
  │
  ▼
SSE stream handler (per-connection goroutine)
  │  receives event from broadcaster
  │  config.version == change_event.version? → emit config_delta
  │  else → emit full config
  │
  ▼
SDK (client)
  │  receives config_delta event
  │  seq already seen? → skip
  │  from_version matches? → apply patch
  │  else → fetch full config
  │
  ▼
Evaluator updated in memory
  new flag value available in <100ms from dashboard action
\`\`\`

---

## Numbers

| Metric | Before (full config) | After (delta) |
|--------|---------------------|---------------|
| Bytes per flag change (1 flag / 50 total) | ~14 KB | ~600 B |
| Data transferred per day (50 changes, 1k SDKs) | ~700 MB | ~30 MB |
| SDK parse time per update | ~210 µs | ~15 µs |
| Duplicate protection | None | Seq ring buffer |
| Connection visibility | None | Redis ZSET + heartbeat |

The delta system makes FlagForge practical to run at scale without a content delivery network or edge caching layer.
`,
  },
];

export function getAllPosts(): BlogPost[] {
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
