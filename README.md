# FlagForge

Open-source feature flag platform with a Rust API server, Next.js dashboard, and JavaScript/React SDKs. Manage flags, segments, and environments from a web UI; evaluate them in your apps with local or remote evaluation and real-time config updates.

## Architecture

```
┌─────────────────┐     JWT (Clerk)      ┌──────────────────┐
│   apps/web      │ ───────────────────► │  flagforge-server │
│   (Next.js)     │   /api/proxy → REST  │  (Rust / Axum)    │
└─────────────────┘                      └────────┬─────────┘
                                                  │
         SDK key auth                             │
┌─────────────────┐     evaluate / stream       │
│  sdks/js        │ ◄─────────────────────────────┤
│  sdks/react     │                               │
└─────────────────┘                      ┌────────┴─────────┐
                                         │  SQLite           │
                                         │  Redis (optional) │
                                         └───────────────────┘
```

| Component | Description |
|-----------|-------------|
| **`apps/server`** | REST API: management (JWT), evaluation (SDK keys), SSE streaming, heartbeats, audit log |
| **`apps/web`** | Marketing site + dashboard UI; proxies API calls to the backend |
| **`packages/eval-core`** | Shared Rust evaluation engine (targeting rules, rollouts, segments) |
| **`sdks/js`** | TypeScript SDK — local eval (server keys) or remote eval (client keys) + SSE deltas |
| **`sdks/react`** | React Provider and hooks built on `@flagforge/sdk-js` |
| **`packages/shared-types`** | Shared TypeScript types for API payloads |

### Request flows

**Dashboard (management)** — User signs in via Clerk → browser calls `/api/proxy/...` on the Next app → proxy forwards to the Rust server with a Clerk JWT → CRUD on flags, segments, environments, SDK keys; changes are persisted to SQLite, cached in Redis, and broadcast over SSE.

**Application (evaluation)** — Your app uses an SDK key (`srv_...` or `cli_...`) → server validates the key (Redis + in-memory cache, DB fallback) → `/evaluate`, `/flags-config`, `/stream`, or `/heartbeat`. Server-side SDKs download config and evaluate locally; client-side SDKs call the server so targeting rules never leave the backend.

## Features

- **Boolean, string, number, and JSON flags** with per-environment enable/disable
- **Segments and targeting rules** evaluated by a deterministic Rust core (`eval-core`)
- **SDK keys** — server keys for local evaluation, client keys for remote evaluation
- **Real-time updates** — Redis pub/sub + SSE; incremental `config_delta` with sequence numbers
- **Redis caching** — MessagePack flag config, SDK auth cache, rate limiting, connection heartbeats
- **Resilience** — Redis circuit breaker and in-process config snapshot when cache is unavailable
- **Audit log** — enriched entries (actor, IP, diffs, severity) for management actions
- **Clerk authentication** for dashboard users (JWT verified via JWKS)

## Prerequisites

- **Rust** (stable toolchain)
- **Node.js** 18+ and **pnpm** 9+
- **Redis** 7+ (optional; server degrades gracefully without it)
- **Clerk** account for dashboard auth

No separate database server is required — the API uses **SQLite** (a local file, created automatically on first run).

## Quick start

### Option A — Docker Compose (backend + Redis)

From the repo root:

```bash
export CLERK_DOMAIN=your-app.clerk.accounts.dev
docker compose -f deploy/docker-compose.yml up --build
```

The API listens on **http://localhost:8080**. SQLite data is stored in a Docker volume (`sqlite_data`). Verify:

```bash
curl http://localhost:8080/health
```

### Option B — Run services locally

**1. (Optional) Start Redis** for caching, pub/sub, and rate limiting:

```bash
docker compose -f deploy/docker-compose.yml up redis -d
```

**2. Configure the server**

Copy the example env file and edit values:

```bash
cp .env.example apps/server/.env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite connection string (default: `sqlite://flagforge.db?mode=rwc`) |
| `CLERK_DOMAIN` | Clerk JWT issuer domain (e.g. `your-app.clerk.accounts.dev`) |

Optional variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8080` | Listen port |
| `LOG_LEVEL` | `info` | Tracing filter |
| `SDK_EVAL_RATE_LIMIT_PER_MINUTE` | `0` | Per-key rate limit (`0` = disabled) |
| `REDIS_CB_INITIAL_BACKOFF_SECS` | `2` | Circuit breaker initial backoff |
| `REDIS_CB_MAX_BACKOFF_SECS` | `60` | Circuit breaker max backoff |
| `REDIS_DOWN_ALERT_WEBHOOK` | — | Webhook URL when Redis breaker opens |

**3. Start the API server**

```bash
cargo run -p flagforge-server
```

Migrations run automatically on startup.

**4. Start the web dashboard**

```bash
cd apps/web
pnpm install
cp .env.local.example .env.local
# Add Clerk keys to .env.local and set:
# BACKEND_URL=http://localhost:8080
pnpm dev
```

Open **http://localhost:3000**. Sign in and complete initial setup from the dashboard (or call `POST /api/v1/setup`).

## Repository layout

```
feature_flag/
├── apps/
│   ├── server/          # Rust API (flagforge-server)
│   └── web/             # Next.js dashboard + marketing site
├── packages/
│   ├── eval-core/       # Rust flag evaluation engine
│   └── shared-types/    # TypeScript shared types
├── sdks/
│   ├── js/              # @flagforge/sdk-js
│   └── react/           # @flagforge/sdk-react
├── deploy/
│   └── docker-compose.yml
├── Cargo.toml           # Rust workspace
├── package.json         # Root scripts (Turbo)
└── pnpm-workspace.yaml  # JS workspace packages
```

## API overview

### Public

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/setup` | Initial org/project bootstrap |

### Management (Clerk JWT — `Authorization: Bearer <token>`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects` | List projects |
| `GET/POST` | `/api/v1/projects/{id}/flags` | List / create flags |
| `PUT/PATCH/DELETE` | `/api/v1/projects/{id}/flags/{key}` | Update / toggle / delete |
| `GET/POST` | `/api/v1/projects/{id}/segments` | Segments |
| `GET/POST` | `/api/v1/projects/{id}/environments` | Environments |
| `GET/POST` | `/api/v1/projects/{id}/sdk-keys` | SDK keys |
| `POST` | `/api/v1/projects/{id}/sdk-keys/{id}/revoke` | Revoke key |
| `GET` | `/api/v1/projects/{id}/sdk-connections` | Active SDK connections |
| `GET` | `/api/v1/projects/{id}/audit-log` | Audit log (filterable) |

### Evaluation (SDK key — `Authorization: srv_...` or `cli_...`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/evaluate` | Evaluate a single flag |
| `POST` | `/api/v1/evaluate/batch` | Batch evaluation |
| `GET` | `/api/v1/flags-config` | Full flag config snapshot |
| `GET` | `/api/v1/stream` | SSE config updates |
| `POST` | `/api/v1/heartbeat` | SDK connection heartbeat |

## SDK usage

### JavaScript / TypeScript

```bash
cd sdks/js
pnpm install && pnpm build
```

```typescript
import { FlagForgeClient } from "@flagforge/sdk-js";

// Server-side: local evaluation + SSE streaming
const client = new FlagForgeClient({
  serverKey: "srv_...",
  baseUrl: "http://localhost:8080",
  context: { userId: "user-123" },
});

await client.waitForReady();
const enabled = client.evaluate("my-feature-flag");
```

Use `clientKey` instead of `serverKey` in browsers or untrusted environments — evaluation runs on the server.

### React

```bash
cd sdks/react
pnpm install && pnpm build
```

```tsx
import { FlagForgeProvider, useBooleanFlag } from "@flagforge/sdk-react";

function App() {
  return (
    <FlagForgeProvider
      config={{ serverKey: "srv_...", baseUrl: "http://localhost:8080" }}
    >
      <MyComponent />
    </FlagForgeProvider>
  );
}

function MyComponent() {
  const { value, loading } = useBooleanFlag("my-feature-flag");
  if (loading) return null;
  return value ? <NewUI /> : <OldUI />;
}
```

## Development

### Rust

```bash
cargo check -p flagforge-server
cargo test -p eval-core
cargo fmt
```

### JavaScript (monorepo)

From the repo root (SDK packages in the pnpm workspace):

```bash
pnpm install
pnpm build      # build all workspace packages
pnpm test       # run package tests
```

The web app is under `apps/web` and is run separately:

```bash
cd apps/web && pnpm dev
```

### Tests

```bash
# eval-core + server unit tests
cargo test

# JS SDK
cd sdks/js && pnpm test

# React SDK
cd sdks/react && pnpm test
```

## License

MIT — see workspace `Cargo.toml` and individual package manifests.
