# @flagforge/sdk-js

JavaScript/TypeScript SDK for [FlagForge](https://github.com/obliviious/feature_flag) — feature flag evaluation with local (server) or remote (client) modes and real-time config streaming.

For React apps, use [`@flagforge/sdk-react`](https://www.npmjs.com/package/@flagforge/sdk-react) instead.

## Install

```bash
npm install @flagforge/sdk-js
# or
pnpm add @flagforge/sdk-js
# or
yarn add @flagforge/sdk-js
```

You need a running [FlagForge server](https://github.com/obliviious/feature_flag) and an SDK key for your environment.

## Quick start

### Server-side (Node.js) — local evaluation

Use a **server key** (`srv_...`). The SDK downloads flag config and evaluates locally (fast, no per-flag HTTP calls).

```typescript
import { FlagForgeClient } from "@flagforge/sdk-js";

const client = new FlagForgeClient({
  serverKey: process.env.FLAGFORGE_SERVER_KEY!,
  baseUrl: "http://localhost:8080",
  context: { targetingKey: "user-123" },
  streaming: true, // SSE updates (default for server keys)
});

await client.init();

const result = await client.evaluate("new-checkout", {
  targetingKey: "user-123",
  attributes: { plan: "pro" },
});

console.log(result.value);  // true | false | string | number | object
console.log(result.reason); // why that value was chosen
```

### Client-side (browser) — remote evaluation

Use a **client key** (`cli_...`). Evaluation runs on the FlagForge server; rules are not shipped to the client.

```typescript
import { FlagForgeClient } from "@flagforge/sdk-js";

const client = new FlagForgeClient({
  clientKey: "cli_your_key_here",
  baseUrl: "http://localhost:8080",
});

await client.init();

const enabled = await client.getBooleanValue("new-checkout", false, {
  targetingKey: "user-123",
});
```

## Configuration

```typescript
interface FlagForgeConfig {
  serverKey?: string;           // srv_... — Node.js / trusted servers only
  clientKey?: string;           // cli_... — browsers / untrusted clients
  baseUrl?: string;             // default: http://localhost:8080
  context?: EvaluationContext;  // default context for all evaluations
  streaming?: boolean;          // SSE updates (default: true for server keys)
  pollingInterval?: number;     // fallback poll interval in ms (default: 30000)
  heartbeatIntervalMs?: number; // SDK heartbeat (default: 30000)
  sdkInstanceId?: string;       // stable instance id for connection tracking
  runtime?: string;             // e.g. node, browser, edge
  sdkVersion?: string;          // sent with heartbeat (default: package version)
  rateLimitMaxRetries?: number; // retries on HTTP 429 (default: 3)
  onRateLimited?: (info: { retryAfterMs: number; attempt: number }) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onUpdate?: (config: FlagsConfig) => void;
}
```

## Evaluation

```typescript
// Single flag
const result = await client.evaluate("flag-key", context, defaultValue);

// Typed helpers
const bool = await client.getBooleanValue("flag-key", false, context);
const str = await client.getStringValue("flag-key", "default", context);
const num = await client.getNumberValue("flag-key", 0, context);

// Batch
const results = await client.evaluateBatch(
  [
    { flagKey: "feature-a", defaultValue: false },
    { flagKey: "feature-b", defaultValue: "control" },
  ],
  context,
);
```

**Evaluation context:**

```typescript
interface EvaluationContext {
  targetingKey?: string;              // user id for overrides / rollouts
  attributes?: Record<string, unknown>;
}
```

**Evaluation result:**

```typescript
interface EvaluationResult {
  flagKey: string;
  value: unknown;
  variantKey?: string;
  reason: EvaluationReason;
}
```

## Real-time updates (server keys)

With `streaming: true`, the client subscribes to SSE config changes and re-evaluates automatically when flags change.

The server sends **delta updates** (`config_delta` events) when only a few flags changed, and falls back to a full `config` event when needed (e.g. subscriber lag or version mismatch). The SDK:

- Validates `from_version` against the local snapshot; fetches full config on mismatch
- Deduplicates events using monotonic `seq` numbers
- Resets sequence tracking after a full config reload

```typescript
const client = new FlagForgeClient({
  serverKey: "srv_...",
  baseUrl: "http://localhost:8080",
  streaming: true,
  sdkInstanceId: "my-service-pod-1", // optional — for heartbeat visibility
  runtime: "node",
  onUpdate: (config) => {
    console.log("Config version:", config.version);
  },
});

await client.init();
```

### Heartbeat (connection visibility)

All SDK keys send periodic heartbeats to `POST /api/v1/heartbeat` so the control plane can show active SDK instances. Heartbeats are best-effort and never block evaluation.

### Rate limiting

Evaluation and config endpoints may return HTTP **429** when per-SDK-key limits are exceeded. The SDK retries with backoff (honoring `Retry-After` when present):

```typescript
const client = new FlagForgeClient({
  serverKey: "srv_...",
  rateLimitMaxRetries: 3,
  onRateLimited: ({ retryAfterMs, attempt }) => {
    console.warn(`Rate limited, retry ${attempt} in ${retryAfterMs}ms`);
  },
});
```

## Next.js

| Environment | Key | Package |
|-------------|-----|---------|
| Client components | `cli_...` | `@flagforge/sdk-react` (recommended) or this package |
| Server Components / API routes | `srv_...` | `@flagforge/sdk-js` with server-only env vars |

Never put `srv_...` keys in `NEXT_PUBLIC_*` variables.

## API endpoints used

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/v1/flags-config` | SDK key |
| `POST` | `/api/v1/evaluate` | SDK key |
| `POST` | `/api/v1/evaluate/batch` | SDK key |
| `GET` | `/api/v1/stream` | SDK key (server keys) — `config` + `config_delta` SSE events |
| `POST` | `/api/v1/heartbeat` | SDK key |

## Standalone evaluator

For testing or offline evaluation with a config snapshot:

```typescript
import { Evaluator } from "@flagforge/sdk-js";

const evaluator = new Evaluator();
evaluator.update(flagsConfig);

const result = evaluator.evaluate("my-flag", { targetingKey: "user-1" });
```

## Related

- [`@flagforge/sdk-react`](https://www.npmjs.com/package/@flagforge/sdk-react) — React Provider + hooks
- [FlagForge repository](https://github.com/obliviious/feature_flag)

## License

MIT
