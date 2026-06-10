# @flagforge/sdk-react

React SDK for [FlagForge](https://github.com/obliviious/feature_flag) — a `Provider` plus hooks for feature flag evaluation with real-time updates.

Built on top of [`@flagforge/sdk-js`](https://www.npmjs.com/package/@flagforge/sdk-js).

## Install

```bash
npm install @flagforge/sdk-react @flagforge/sdk-js
# or
pnpm add @flagforge/sdk-react @flagforge/sdk-js
# or
yarn add @flagforge/sdk-react @flagforge/sdk-js
```

**Peer dependencies:** React 17+, `@flagforge/sdk-js` >= 0.1.0

You also need a running [FlagForge server](https://github.com/obliviious/feature_flag) and an SDK key for your environment.

## Quick start (Next.js App Router)

### 1. Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_FLAGFORGE_API_URL=http://localhost:8080
NEXT_PUBLIC_FLAGFORGE_CLIENT_KEY=cli_your_key_here
```

Use a **client key** (`cli_...`) in the browser. Never expose a **server key** (`srv_...`) in frontend code.

### 2. Provider (client component)

```tsx
// components/flagforge-provider.tsx
"use client";

import { FlagForgeProvider } from "@flagforge/sdk-react";
import type { ReactNode } from "react";

export function AppFlagForgeProvider({ children }: { children: ReactNode }) {
  return (
    <FlagForgeProvider
      config={{
        clientKey: process.env.NEXT_PUBLIC_FLAGFORGE_CLIENT_KEY!,
        baseUrl: process.env.NEXT_PUBLIC_FLAGFORGE_API_URL!,
        streaming: false,
      }}
    >
      {children}
    </FlagForgeProvider>
  );
}
```

### 3. Wrap your app

```tsx
// app/layout.tsx
import { AppFlagForgeProvider } from "@/components/flagforge-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppFlagForgeProvider>{children}</AppFlagForgeProvider>
      </body>
    </html>
  );
}
```

### 4. Use a flag

```tsx
"use client";

import { useBooleanFlag } from "@flagforge/sdk-react";

export function CheckoutFeature() {
  const { value: enabled, loading, reason } = useBooleanFlag(
    "new-checkout",
    false,
    {
      targetingKey: "user-123",
      attributes: { plan: "pro", country: "US" },
    },
  );

  if (loading) return null;

  return enabled ? <div>New checkout enabled</div> : <div>Old checkout</div>;
}
```

## API

### `<FlagForgeProvider>`

Wraps your app and initializes the FlagForge client.

```tsx
<FlagForgeProvider
  config={{
    clientKey: "cli_...",           // browser / untrusted environments
    // serverKey: "srv_...",        // Node.js only — do not use in browser
    baseUrl: "http://localhost:8080",
    streaming: false,               // client keys use remote evaluation
    pollingInterval: 30_000,
    heartbeatIntervalMs: 30_000,    // optional — connection tracking
    sdkInstanceId: "web-app-1",     // optional — stable instance id
    runtime: "browser",             // optional — sent with heartbeat
    context: {                      // optional default evaluation context
      targetingKey: "user-123",
      attributes: { plan: "pro" },
    },
  }}
  onReady={() => console.log("SDK ready")}
  onError={(err) => console.error(err)}
  onUpdate={(config) => console.log("Config updated", config.version)}
>
  {children}
</FlagForgeProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `config` | `FlagForgeConfig` (without lifecycle callbacks) | SDK configuration |
| `onReady` | `() => void` | Called when initial config is loaded |
| `onError` | `(error: Error) => void` | Called on SDK errors |
| `onUpdate` | `(config: FlagsConfig) => void` | Called when flag config changes |
| `children` | `ReactNode` | App content |

### Hooks

All flag hooks return `{ value, reason, loading }`.

| Hook | Signature | Description |
|------|-----------|-------------|
| `useBooleanFlag` | `(key, defaultValue, context?)` | Boolean flag |
| `useStringFlag` | `(key, defaultValue, context?)` | String flag |
| `useNumberFlag` | `(key, defaultValue, context?)` | Number flag |
| `useJsonFlag` | `(key, defaultValue, context?)` | JSON flag |
| `useFlag` | `(key, defaultValue?, context?)` | Generic / unknown value |
| `useFlagForge` | `()` | Access `{ client, isReady, error, updateCount }` |

**Evaluation context** (optional third argument):

```ts
{
  targetingKey?: string;              // user id for overrides / rollouts
  attributes?: Record<string, unknown>; // e.g. plan, country, version
}
```

### Example: typed hooks

```tsx
"use client";

import {
  useBooleanFlag,
  useStringFlag,
  useNumberFlag,
  useJsonFlag,
} from "@flagforge/sdk-react";

function FeatureFlags() {
  const checkout = useBooleanFlag("new-checkout", false);
  const theme = useStringFlag("ui-theme", "light");
  const maxItems = useNumberFlag("cart-max-items", 10);
  const config = useJsonFlag<{ beta: boolean }>("experiments", { beta: false });

  // ...
}
```

### Example: direct client access

```tsx
"use client";

import { useFlagForge } from "@flagforge/sdk-react";

function Status() {
  const { isReady, error } = useFlagForge();

  if (error) return <p>FlagForge error: {error.message}</p>;
  if (!isReady) return <p>Loading flags…</p>;
  return <p>Flags ready</p>;
}
```

## Client key vs server key

| Key type | Prefix | Where to use | Behavior |
|----------|--------|--------------|----------|
| **Client** | `cli_` | Browser, React client components | Remote evaluation via API — targeting rules stay on the server |
| **Server** | `srv_` | Node.js, API routes, SSR | Downloads config + evaluates locally; **never** expose in frontend |

For Next.js:

- **Client components** → `clientKey` + `NEXT_PUBLIC_*` env vars
- **Server Components / Route Handlers** → use `@flagforge/sdk-js` with `serverKey` (server-only env, no `NEXT_PUBLIC_`)

## Plain React (Vite, CRA, etc.)

Same pattern: wrap your root with `FlagForgeProvider` and use hooks in child components. Any component using hooks must run on the client (no SSR hooks without a client boundary).

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FlagForgeProvider } from "@flagforge/sdk-react";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FlagForgeProvider
      config={{
        clientKey: import.meta.env.VITE_FLAGFORGE_CLIENT_KEY,
        baseUrl: import.meta.env.VITE_FLAGFORGE_API_URL,
      }}
    >
      <App />
    </FlagForgeProvider>
  </StrictMode>,
);
```

## Troubleshooting

| Problem | Likely cause |
|---------|----------------|
| Hook throws “must be used within FlagForgeProvider” | Component is outside `<FlagForgeProvider>` |
| Next.js error about hooks in Server Components | Add `"use client"` to the file |
| Flag always returns default | Wrong flag key, API URL, or invalid SDK key |
| HTTP 429 errors | Per-SDK-key rate limit — SDK retries automatically; reduce request volume |
| Browser blocks requests | HTTPS site calling `http://` API (mixed content) |
| Full config visible in network tab with `srv_` key | You used a server key in the browser — switch to `cli_` |

## Verify your API

```bash
curl -X POST http://localhost:8080/api/v1/evaluate \
  -H "Authorization: cli_your_key" \
  -H "Content-Type: application/json" \
  -d '{"flagKey":"new-checkout","context":{"targetingKey":"user-123"}}'
```

## Related

- [`@flagforge/sdk-js`](https://www.npmjs.com/package/@flagforge/sdk-js) — core TypeScript SDK
- [FlagForge repository](https://github.com/obliviious/feature_flag)

## License

MIT
