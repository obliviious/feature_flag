"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ------------------------------------------------------------------ */
/*  Sidebar navigation structure                                       */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  slug: string;
  children?: { label: string; slug: string }[];
}

const sidebar: NavItem[] = [
  {
    label: "Getting Started",
    slug: "getting-started",
    children: [
      { label: "Introduction", slug: "introduction" },
      { label: "Quick Start", slug: "quick-start" },
      { label: "Self-Hosting", slug: "self-hosting" },
      { label: "Architecture", slug: "architecture" },
    ],
  },
  {
    label: "Core Concepts",
    slug: "concepts",
    children: [
      { label: "Flags", slug: "flags" },
      { label: "Environments", slug: "environments" },
      { label: "Variants", slug: "variants" },
      { label: "Targeting Rules", slug: "targeting-rules" },
      { label: "Segments", slug: "segments" },
      { label: "Overrides", slug: "overrides" },
    ],
  },
  {
    label: "SDKs",
    slug: "sdks",
    children: [
      { label: "TypeScript / Node", slug: "sdk-typescript" },
      { label: "Python", slug: "sdk-python" },
      { label: "Go", slug: "sdk-go" },
      { label: "React", slug: "sdk-react" },
      { label: "REST API", slug: "rest-api" },
    ],
  },
  {
    label: "Server",
    slug: "server",
    children: [
      { label: "Configuration", slug: "configuration" },
      { label: "Authentication", slug: "authentication" },
      { label: "SSE Streaming", slug: "sse-streaming" },
      { label: "Evaluation Engine", slug: "evaluation-engine" },
      { label: "Redis Pub/Sub", slug: "redis-pubsub" },
    ],
  },
  {
    label: "Management API",
    slug: "api",
    children: [
      { label: "Projects", slug: "api-projects" },
      { label: "Flags", slug: "api-flags" },
      { label: "Segments", slug: "api-segments" },
      { label: "Environments", slug: "api-environments" },
      { label: "SDK Keys", slug: "api-sdk-keys" },
      { label: "Management Keys", slug: "management-api-keys" },
    ],
  },
  {
    label: "Guides",
    slug: "guides",
    children: [
      { label: "Flag Lifecycle", slug: "flag-lifecycle" },
      { label: "Code Reference Scanning", slug: "code-reference-scanning" },
      { label: "Progressive Rollouts", slug: "progressive-rollouts" },
      { label: "A/B Testing", slug: "ab-testing" },
      { label: "Kill Switches", slug: "kill-switches" },
      { label: "Trunk-Based Development", slug: "trunk-based" },
      { label: "CI/CD Integration", slug: "cicd-integration" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Documentation content (keyed by slug)                              */
/* ------------------------------------------------------------------ */

const docs: Record<string, { title: string; content: React.ReactNode }> = {
  introduction: {
    title: "Introduction",
    content: (
      <>
        <p>
          FlagForge is an open-source feature flag platform built for modern
          engineering teams. It lets you decouple code deployment from feature
          releases, enabling progressive delivery, targeted rollouts, and
          instant rollbacks — all without redeploying.
        </p>

        <h3>Why FlagForge?</h3>
        <ul>
          <li>
            <strong>Real-time SSE streaming</strong> — flag changes push
            instantly to every connected SDK. No polling, no stale state.
          </li>
          <li>
            <strong>Rust evaluation engine</strong> — sub-millisecond flag
            evaluations with deterministic hashing for percentage rollouts.
          </li>
          <li>
            <strong>Granular targeting</strong> — segment users by any
            attribute, combine rules, and override individual users.
          </li>
          <li>
            <strong>Self-hosted &amp; open source</strong> — deploy on your
            own infrastructure under MIT license. No vendor lock-in.
          </li>
        </ul>

        <h3>Architecture Overview</h3>
        <p>
          FlagForge consists of three main components:
        </p>
        <div className="doc-diagram">
          <div className="doc-diagram-row">
            <DiagramBox label="Dashboard" sub="Next.js" />
            <DiagramArrow />
            <DiagramBox label="Server" sub="Rust / Axum" accent />
            <DiagramArrow />
            <DiagramBox label="SQLite" sub="Primary Store" />
          </div>
          <div className="flex justify-center my-2">
            <div className="w-px h-6 bg-border-lighter" />
          </div>
          <div className="doc-diagram-row">
            <DiagramBox label="SDK Clients" sub="TS / Python / Go" />
            <DiagramArrow label="SSE" />
            <DiagramBox label="Redis" sub="Pub/Sub + Cache" accent />
          </div>
        </div>

        <h3>Quick Links</h3>
        <ul>
          <li>
            <button className="text-accent-red hover:underline" onClick={() => {}}>
              Quick Start Guide →
            </button>
          </li>
          <li>
            <button className="text-accent-red hover:underline" onClick={() => {}}>
              API Reference →
            </button>
          </li>
          <li>
            <a href="https://github.com/flagforge/flagforge" target="_blank" rel="noopener noreferrer" className="text-accent-red hover:underline">
              GitHub Repository →
            </a>
          </li>
        </ul>
      </>
    ),
  },

  "quick-start": {
    title: "Quick Start",
    content: (
      <>
        <p>
          Get FlagForge running locally in under 5 minutes using Docker
          Compose.
        </p>

        <h3>Prerequisites</h3>
        <ul>
          <li>Docker &amp; Docker Compose installed</li>
          <li>A Clerk account (for management dashboard auth)</li>
        </ul>

        <h3>1. Clone the Repository</h3>
        <CodeBlock
          lang="bash"
          code={`git clone https://github.com/flagforge/flagforge.git
cd flagforge`}
        />

        <h3>2. Configure Environment</h3>
        <CodeBlock
          lang="bash"
          code={`cp .env.example .env
# Edit .env and set your CLERK_DOMAIN
# e.g. CLERK_DOMAIN=your-app.clerk.accounts.dev`}
        />

        <h3>3. Start Services</h3>
        <CodeBlock
          lang="bash"
          code={`cd deploy
docker compose up -d`}
        />
        <p>
          This starts Redis and the FlagForge server on port
          8080. SQLite data is stored in a Docker volume — no separate database container required.
        </p>

        <h3>4. Verify Health</h3>
        <CodeBlock
          lang="bash"
          code={`curl http://localhost:8080/health
# → {"status":"ok"}`}
        />

        <h3>5. Create Your First Flag</h3>
        <p>
          Use the management API (with a Clerk JWT) to create a project,
          environment, and your first feature flag:
        </p>
        <CodeBlock
          lang="bash"
          code={`# Create a flag
curl -X POST http://localhost:8080/api/v1/projects/{project_id}/flags \\
  -H "Authorization: Bearer <clerk-jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "new-checkout",
    "name": "New Checkout Flow",
    "flag_type": "boolean",
    "variants": [
      { "key": "on", "value": true },
      { "key": "off", "value": false }
    ],
    "default_variant_key": "off"
  }'`}
        />

        <h3>6. Evaluate from Your App</h3>
        <CodeBlock
          lang="typescript"
          code={`import { FlagForge } from '@flagforge/sdk';

const ff = new FlagForge({
  sdkKey: 'srv_your_key_here',
  streaming: true,
});

const result = await ff.evaluate({
  flagKey: 'new-checkout',
  context: { userId: 'user_123' },
});

console.log(result.enabled); // false (default)`}
        />
      </>
    ),
  },

  "self-hosting": {
    title: "Self-Hosting",
    content: (
      <>
        <p>
          FlagForge is designed for self-hosting. The server is a single Rust
          binary with SQLite (embedded) and optional Redis.
        </p>

        <h3>System Requirements</h3>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Minimum</th>
              <th>Recommended</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>CPU</td><td>1 core</td><td>2+ cores</td></tr>
            <tr><td>RAM</td><td>256 MB</td><td>512 MB+</td></tr>
            <tr><td>SQLite</td><td>3.35+</td><td>bundled</td></tr>
            <tr><td>Redis</td><td>6+</td><td>7+ (optional)</td></tr>
          </tbody>
        </table>

        <h3>Environment Variables</h3>
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>DATABASE_URL</code></td><td>No</td><td>SQLite connection string (default: <code>sqlite://flagforge.db?mode=rwc</code>)</td></tr>
            <tr><td><code>REDIS_URL</code></td><td>No</td><td>Redis connection string (defaults to localhost:6379)</td></tr>
            <tr><td><code>CLERK_DOMAIN</code></td><td>Yes</td><td>Your Clerk domain for JWT verification</td></tr>
            <tr><td><code>HOST</code></td><td>No</td><td>Bind address (default: 0.0.0.0)</td></tr>
            <tr><td><code>PORT</code></td><td>No</td><td>Listen port (default: 8080)</td></tr>
            <tr><td><code>LOG_LEVEL</code></td><td>No</td><td>Tracing level (default: info)</td></tr>
          </tbody>
        </table>

        <h3>Docker Deployment</h3>
        <CodeBlock
          lang="bash"
          code={`docker run -d \\
  -e DATABASE_URL=sqlite:///data/flagforge.db?mode=rwc \\
  -e REDIS_URL=redis://redis:6379 \\
  -e CLERK_DOMAIN=your-app.clerk.accounts.dev \\
  -v flagforge-data:/data \\
  -p 8080:8080 \\
  ghcr.io/flagforge/flagforge:latest`}
        />

        <h3>Kubernetes</h3>
        <p>
          Helm charts are available in the <code>deploy/helm/</code>{" "}
          directory. See the repo for full Kubernetes deployment
          instructions.
        </p>
      </>
    ),
  },

  architecture: {
    title: "Architecture",
    content: (
      <>
        <p>
          FlagForge follows a layered architecture with clear separation
          between the API layer, evaluation engine, and data stores.
        </p>

        <h3>Request Flow</h3>
        <ol>
          <li>
            <strong>SDK connects</strong> — authenticates with an SDK key
            (server <code>srv_</code> or client <code>cli_</code> prefix)
          </li>
          <li>
            <strong>SSE established</strong> — server pushes full flag config
            immediately, then streams updates
          </li>
          <li>
            <strong>Flag evaluated</strong> — the eval-core engine processes
            targeting rules, segments, and percentage rollouts locally
          </li>
          <li>
            <strong>Config changes</strong> — management API mutations
            publish to Redis Pub/Sub, which fans out to all SSE subscribers
          </li>
        </ol>

        <h3>Key Design Decisions</h3>
        <ul>
          <li>
            <strong>Rust + Axum</strong> — chosen for performance and memory
            safety. The server handles thousands of concurrent SSE
            connections efficiently.
          </li>
          <li>
            <strong>SSE over WebSockets</strong> — simpler protocol,
            auto-reconnect in browsers, works through HTTP proxies without
            special configuration.
          </li>
          <li>
            <strong>Redis Pub/Sub</strong> — decouples flag mutations from
            streaming. Multiple server instances stay in sync without shared
            state.
          </li>
          <li>
            <strong>Tokio broadcast channel</strong> — Redis messages fan
            out to in-process SSE subscribers with zero copying.
          </li>
        </ul>

        <h3>Evaluation Engine (eval-core)</h3>
        <p>
          The evaluation engine is a standalone Rust crate that can be
          embedded in any Rust application. It uses MurmurHash3 for
          deterministic percentage rollouts — the same user always gets the
          same variant.
        </p>
        <CodeBlock
          lang="rust"
          code={`// eval-core can be used standalone
use eval_core::{Evaluator, FlagsConfig, EvalContext};

let evaluator = Evaluator::new();
let result = evaluator.evaluate(
    &config,
    "new-checkout",
    &EvalContext {
        user_id: Some("user_123".into()),
        attributes: HashMap::new(),
    },
);`}
        />
      </>
    ),
  },

  flags: {
    title: "Flags",
    content: (
      <>
        <p>
          Flags are the core primitive in FlagForge. A flag represents a
          feature that can be toggled on/off and targeted to specific users.
        </p>

        <h3>Flag Properties</h3>
        <table>
          <thead>
            <tr><th>Property</th><th>Type</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>key</code></td><td>String</td><td>Unique identifier (e.g., <code>new-checkout</code>)</td></tr>
            <tr><td><code>name</code></td><td>String</td><td>Human-readable display name</td></tr>
            <tr><td><code>flag_type</code></td><td>String</td><td><code>boolean</code>, <code>string</code>, <code>number</code>, or <code>json</code></td></tr>
            <tr><td><code>variants</code></td><td>Array</td><td>Possible values the flag can return</td></tr>
            <tr><td><code>tags</code></td><td>Array</td><td>Labels for organization and filtering</td></tr>
            <tr><td><code>archived</code></td><td>Boolean</td><td>Soft-delete flag from active use</td></tr>
          </tbody>
        </table>

        <h3>Flag Types</h3>
        <p>
          While <code>boolean</code> is the most common, FlagForge supports
          multi-variate flags:
        </p>
        <CodeBlock
          lang="json"
          code={`{
  "key": "pricing-page",
  "flag_type": "string",
  "variants": [
    { "key": "control", "value": "original" },
    { "key": "variant-a", "value": "new-layout" },
    { "key": "variant-b", "value": "minimal" }
  ],
  "default_variant_key": "control"
}`}
        />

        <h3>Per-Environment State</h3>
        <p>
          Each flag has independent enabled/disabled state per environment.
          A flag can be on in <code>staging</code> but off in{" "}
          <code>production</code>. Toggling a flag in one environment never
          affects another.
        </p>
      </>
    ),
  },

  environments: {
    title: "Environments",
    content: (
      <>
        <p>
          Environments represent deployment targets like{" "}
          <code>development</code>, <code>staging</code>, and{" "}
          <code>production</code>. Each environment has its own SDK keys,
          flag states, and config versions.
        </p>
        <h3>Key Concepts</h3>
        <ul>
          <li>Every project starts with default environments</li>
          <li>SDK keys are scoped to a single environment</li>
          <li>Flag toggles, targeting rules, and overrides are per-environment</li>
          <li>Config versions are tracked independently for cache invalidation</li>
        </ul>
      </>
    ),
  },

  variants: {
    title: "Variants",
    content: (
      <>
        <p>
          Variants define the possible values a flag can return. Boolean
          flags typically have <code>on</code>/<code>off</code> variants,
          while multi-variate flags can have any number.
        </p>
        <h3>Variant Structure</h3>
        <CodeBlock
          lang="json"
          code={`{
  "key": "variant-a",
  "value": { "color": "#790f11", "layout": "grid" },
  "description": "Red theme with grid layout"
}`}
        />
        <p>
          Values can be any JSON type: boolean, string, number, object, or
          array.
        </p>
      </>
    ),
  },

  "targeting-rules": {
    title: "Targeting Rules",
    content: (
      <>
        <p>
          Targeting rules determine which variant a user sees based on their
          attributes. Rules are evaluated in priority order — the first
          matching rule wins.
        </p>
        <h3>Rule Components</h3>
        <ul>
          <li><strong>Segments</strong> — define user groups by attribute constraints</li>
          <li><strong>Distributions</strong> — percentage-based variant allocation within a rule</li>
          <li><strong>Priority</strong> — rules are evaluated top-to-bottom</li>
        </ul>
        <h3>Supported Operators</h3>
        <table>
          <thead><tr><th>Operator</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>eq</code> / <code>neq</code></td><td>Equals / not equals</td></tr>
            <tr><td><code>gt</code> / <code>gte</code> / <code>lt</code> / <code>lte</code></td><td>Numeric comparisons</td></tr>
            <tr><td><code>in</code> / <code>not_in</code></td><td>Set membership</td></tr>
            <tr><td><code>contains</code></td><td>String contains</td></tr>
            <tr><td><code>starts_with</code> / <code>ends_with</code></td><td>String prefix/suffix</td></tr>
            <tr><td><code>matches_regex</code></td><td>Regular expression match</td></tr>
            <tr><td><code>semver_*</code></td><td>Semantic version comparisons</td></tr>
          </tbody>
        </table>
      </>
    ),
  },

  segments: {
    title: "Segments",
    content: (
      <>
        <p>
          Segments are reusable groups of users defined by attribute
          constraints. They can be shared across multiple flags and targeting
          rules.
        </p>
        <CodeBlock
          lang="json"
          code={`{
  "name": "Enterprise Users",
  "match_type": "all",
  "constraints": [
    { "attribute": "plan", "operator": "eq", "value": "enterprise" },
    { "attribute": "verified", "operator": "eq", "value": true }
  ]
}`}
        />
        <h3>Match Types</h3>
        <ul>
          <li><code>all</code> — every constraint must match (AND)</li>
          <li><code>any</code> — at least one constraint must match (OR)</li>
        </ul>
      </>
    ),
  },

  overrides: {
    title: "Overrides",
    content: (
      <>
        <p>
          Overrides let you force a specific variant for individual users,
          bypassing all targeting rules. Useful for testing, QA, and
          customer support.
        </p>
        <CodeBlock
          lang="json"
          code={`{
  "flag_key": "new-checkout",
  "user_id": "user_123",
  "variant_key": "on"
}`}
        />
        <p>
          Overrides are evaluated before any targeting rules and always take
          precedence.
        </p>
      </>
    ),
  },

  "sdk-typescript": {
    title: "TypeScript / Node SDK",
    content: (
      <>
        <h3>Installation</h3>
        <CodeBlock lang="bash" code="npm install @flagforge/sdk" />

        <h3>Initialization</h3>
        <CodeBlock
          lang="typescript"
          code={`import { FlagForge } from '@flagforge/sdk';

const ff = new FlagForge({
  sdkKey: process.env.FLAGFORGE_SDK_KEY!,
  streaming: true, // enable SSE real-time updates
});

// Wait for initial config
await ff.ready();`}
        />

        <h3>Evaluating Flags</h3>
        <CodeBlock
          lang="typescript"
          code={`// Boolean check
const enabled = ff.isEnabled('new-checkout', {
  userId: user.id,
  attributes: { plan: user.plan },
});

// Get variant value
const variant = ff.evaluate('pricing-page', {
  userId: user.id,
  attributes: { country: user.country },
});
console.log(variant.value); // "new-layout"`}
        />

        <h3>React Integration</h3>
        <CodeBlock
          lang="tsx"
          code={`import { FlagForgeProvider, useFlag } from '@flagforge/react';

function App() {
  return (
    <FlagForgeProvider sdkKey={process.env.NEXT_PUBLIC_FF_KEY!}>
      <Checkout />
    </FlagForgeProvider>
  );
}

function Checkout() {
  const newCheckout = useFlag('new-checkout');
  return newCheckout ? <NewCheckout /> : <OldCheckout />;
}`}
        />
      </>
    ),
  },

  "sdk-python": {
    title: "Python SDK",
    content: (
      <>
        <h3>Installation</h3>
        <CodeBlock lang="bash" code="pip install flagforge" />

        <h3>Usage</h3>
        <CodeBlock
          lang="python"
          code={`from flagforge import FlagForge

ff = FlagForge(sdk_key="srv_your_key_here")

# Boolean evaluation
if ff.is_enabled("new-checkout", user_id="user_123"):
    show_new_checkout()

# Variant evaluation
variant = ff.evaluate(
    "pricing-page",
    user_id="user_123",
    attributes={"plan": "enterprise"},
)
print(variant.value)  # "new-layout"`}
        />
      </>
    ),
  },

  "sdk-go": {
    title: "Go SDK",
    content: (
      <>
        <h3>Installation</h3>
        <CodeBlock lang="bash" code="go get github.com/flagforge/flagforge-go" />

        <h3>Usage</h3>
        <CodeBlock
          lang="go"
          code={`package main

import ff "github.com/flagforge/flagforge-go"

func main() {
    client := ff.NewClient(ff.Config{
        SDKKey:    "srv_your_key_here",
        Streaming: true,
    })
    defer client.Close()

    enabled := client.IsEnabled("new-checkout", ff.Context{
        UserID: "user_123",
    })
}`}
        />
      </>
    ),
  },

  "sdk-react": {
    title: "React SDK",
    content: (
      <>
        <h3>Installation</h3>
        <CodeBlock lang="bash" code="npm install @flagforge/react" />
        <h3>Provider Setup</h3>
        <CodeBlock
          lang="tsx"
          code={`import { FlagForgeProvider } from '@flagforge/react';

export default function Layout({ children }) {
  return (
    <FlagForgeProvider
      sdkKey={process.env.NEXT_PUBLIC_FF_CLIENT_KEY!}
      user={{ id: user.id, attributes: { plan: user.plan } }}
    >
      {children}
    </FlagForgeProvider>
  );
}`}
        />
        <h3>Hooks</h3>
        <CodeBlock
          lang="tsx"
          code={`import { useFlag, useVariant } from '@flagforge/react';

function Component() {
  const isEnabled = useFlag('feature-x');
  const variant = useVariant('experiment-y');

  if (!isEnabled) return null;
  return <div>Variant: {variant.value}</div>;
}`}
        />
      </>
    ),
  },

  "rest-api": {
    title: "REST API",
    content: (
      <>
        <p>
          All SDKs communicate with the server via a simple REST + SSE API.
          You can also call the evaluation endpoint directly.
        </p>
        <h3>Evaluate a Flag</h3>
        <CodeBlock
          lang="bash"
          code={`curl -X POST http://localhost:8080/api/v1/evaluate \\
  -H "Authorization: srv_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "flag_key": "new-checkout",
    "context": { "user_id": "user_123" }
  }'`}
        />
        <h3>Get Full Config</h3>
        <CodeBlock
          lang="bash"
          code={`curl http://localhost:8080/api/v1/flags-config \\
  -H "Authorization: srv_your_key"`}
        />
        <h3>SSE Stream</h3>
        <CodeBlock
          lang="bash"
          code={`curl -N http://localhost:8080/api/v1/stream \\
  -H "Authorization: srv_your_key"
# → event: config
# → data: { ... full config ... }`}
        />
      </>
    ),
  },

  configuration: {
    title: "Server Configuration",
    content: (
      <>
        <p>The FlagForge server is configured entirely via environment variables.</p>
        <table>
          <thead><tr><th>Variable</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>DATABASE_URL</code></td><td><code>sqlite://flagforge.db?mode=rwc</code></td><td>SQLite database file path</td></tr>
            <tr><td><code>REDIS_URL</code></td><td><code>redis://127.0.0.1:6379</code></td><td>Redis for cache + pub/sub</td></tr>
            <tr><td><code>CLERK_DOMAIN</code></td><td>—</td><td>Clerk domain for management JWT auth (required)</td></tr>
            <tr><td><code>HOST</code></td><td><code>0.0.0.0</code></td><td>Server bind address</td></tr>
            <tr><td><code>PORT</code></td><td><code>8080</code></td><td>Server listen port</td></tr>
            <tr><td><code>LOG_LEVEL</code></td><td><code>info</code></td><td>Tracing filter (debug, info, warn, error)</td></tr>
          </tbody>
        </table>
      </>
    ),
  },

  authentication: {
    title: "Authentication",
    content: (
      <>
        <p>FlagForge uses three authentication mechanisms:</p>
        <h3>1. Clerk JWT (Dashboard users)</h3>
        <p>
          Human users sign in via Clerk. Management endpoints accept{" "}
          <code>Authorization: Bearer &lt;clerk-jwt&gt;</code>. The server
          validates tokens via Clerk&apos;s JWKS endpoint (RS256).
        </p>
        <h3>2. Management API keys (CI / automation) — recommended</h3>
        <p>
          Project-scoped keys with the <code>mgmt_</code> prefix for pipelines,
          scripts, and scanners. Create them in{" "}
          <strong>Dashboard → Settings → CI / Management Keys</strong>.
        </p>
        <CodeBlock
          lang="http"
          code={`Authorization: mgmt_xxxxxxxxxxxxxxxx
# No "Bearer" prefix — pass the raw key like SDK keys`}
        />
        <p>
          Each key is bound to one project. Revoke anytime from Settings.
          Use for code-reference scanning, flag toggles in deploy scripts, etc.
        </p>
        <h3>3. Clerk machine tokens (alternative)</h3>
        <p>
          If you already use{" "}
          <a href="https://clerk.com/docs/machine-auth/overview" className="text-accent-red">
            Clerk Machines / M2M
          </a>
          , you can mint a JWT and pass{" "}
          <code>Authorization: Bearer &lt;token&gt;</code> instead of an{" "}
          <code>mgmt_</code> key. This requires Clerk M2M setup in your Clerk
          dashboard and is optional for self-hosted FlagForge.
        </p>
        <h3>4. SDK Keys (Evaluation API)</h3>
        <p>
          Evaluation endpoints use SDK keys passed directly in the{" "}
          <code>Authorization</code> header (no &quot;Bearer&quot; prefix).
        </p>
        <ul>
          <li><code>srv_*</code> — server-side keys (full config + local eval)</li>
          <li><code>cli_*</code> — client-side keys (remote eval only)</li>
        </ul>
      </>
    ),
  },

  "sse-streaming": {
    title: "SSE Streaming",
    content: (
      <>
        <p>
          FlagForge uses Server-Sent Events (SSE) for real-time flag
          updates. When a flag changes, the new config is pushed to all
          connected SDK clients instantly.
        </p>
        <h3>Connection Flow</h3>
        <ol>
          <li>SDK connects to <code>GET /api/v1/stream</code> with SDK key auth</li>
          <li>Server immediately sends full flag config as the first event</li>
          <li>On any flag change, server pushes updated config</li>
          <li>15-second keepalive heartbeats maintain the connection</li>
        </ol>
        <h3>Event Format</h3>
        <CodeBlock
          lang="text"
          code={`event: config
data: {"flags":[...],"segments":[...],"version":42}

: keepalive`}
        />
        <h3>How Changes Propagate</h3>
        <p>
          Flag mutation → Redis Pub/Sub → Tokio broadcast channel → SSE
          push to all subscribers filtered by environment ID.
        </p>
      </>
    ),
  },

  "evaluation-engine": {
    title: "Evaluation Engine",
    content: (
      <>
        <p>
          The <code>eval-core</code> crate is a standalone Rust library that
          handles all flag evaluation logic. It&apos;s deterministic, fast,
          and thoroughly tested (23 tests).
        </p>
        <h3>Evaluation Order</h3>
        <ol>
          <li><strong>Overrides</strong> — check for user-specific overrides first</li>
          <li><strong>Enabled check</strong> — if flag is disabled, return default variant</li>
          <li><strong>Targeting rules</strong> — evaluate rules in priority order</li>
          <li><strong>Percentage rollout</strong> — MurmurHash3-based deterministic bucketing</li>
          <li><strong>Default</strong> — fall back to default variant</li>
        </ol>
      </>
    ),
  },

  "redis-pubsub": {
    title: "Redis Pub/Sub",
    content: (
      <>
        <p>
          Redis Pub/Sub enables real-time config change propagation across
          multiple server instances.
        </p>
        <h3>Channel</h3>
        <CodeBlock lang="text" code="flagforge:config_changes" />
        <h3>Message Format</h3>
        <CodeBlock
          lang="json"
          code={`{
  "environment_id": "550e8400-e29b-41d4-a716-446655440000",
  "version": 42
}`}
        />
        <p>
          When Redis is unavailable, the server degrades gracefully — SSE
          streaming still works within a single instance via the in-process
          broadcast channel.
        </p>
      </>
    ),
  },

  "progressive-rollouts": {
    title: "Progressive Rollouts",
    content: (
      <>
        <p>
          Progressive rollouts let you gradually release a feature to
          increasing percentages of users while monitoring for issues.
        </p>
        <h3>Strategy</h3>
        <ol>
          <li>Start at 1-5% — catch critical bugs with minimal blast radius</li>
          <li>Increase to 25% — validate performance at moderate scale</li>
          <li>Expand to 50% — A/B comparison with meaningful sample sizes</li>
          <li>Full rollout at 100% — confident release</li>
        </ol>
        <p>
          FlagForge uses MurmurHash3 for deterministic bucketing — the same
          user always stays in the same percentage bucket, ensuring a
          consistent experience.
        </p>
      </>
    ),
  },

  "ab-testing": {
    title: "A/B Testing",
    content: (
      <>
        <p>
          Use multi-variate flags with percentage distributions to run A/B
          tests. Combine with your analytics platform to measure results.
        </p>
        <CodeBlock
          lang="json"
          code={`{
  "flag_key": "checkout-experiment",
  "targeting_rules": [{
    "distributions": [
      { "variant_key": "control", "percentage": 50 },
      { "variant_key": "new-flow", "percentage": 50 }
    ]
  }]
}`}
        />
      </>
    ),
  },

  "kill-switches": {
    title: "Kill Switches",
    content: (
      <>
        <p>
          Every flag in FlagForge is a kill switch. Toggle any flag off
          instantly from the dashboard or API — the change streams to all
          connected SDKs in real time.
        </p>
        <CodeBlock
          lang="bash"
          code={`# Instant kill — disable a flag
curl -X PATCH \\
  http://localhost:8080/api/v1/projects/{id}/flags/broken-feature/toggle \\
  -H "Authorization: Bearer <jwt>" \\
  -d '{"enabled": false, "environment_id": "<env-id>"}'`}
        />
        <p>
          Recovery time is effectively zero — no redeploy, no cache
          invalidation, no waiting.
        </p>
      </>
    ),
  },

  "trunk-based": {
    title: "Trunk-Based Development",
    content: (
      <>
        <p>
          Feature flags enable trunk-based development by letting you merge
          incomplete features behind flags. Ship code continuously without
          long-lived feature branches.
        </p>
        <h3>Workflow</h3>
        <ol>
          <li>Create a flag for the new feature</li>
          <li>Wrap feature code with the flag check</li>
          <li>Merge to main — flag is off, feature is invisible</li>
          <li>Enable in staging for testing</li>
          <li>Progressive rollout to production</li>
          <li>Remove flag code once the feature is stable</li>
        </ol>
      </>
    ),
  },

  "cicd-integration": {
    title: "CI/CD Integration",
    content: (
      <>
        <p>
          Integrate FlagForge into CI/CD for automated flag management and
          code-reference scanning.
        </p>
        <h3>Management key setup</h3>
        <ol>
          <li>Open <strong>Dashboard → Settings → CI / Management Keys</strong></li>
          <li>Generate a key (shown once) and store it as <code>FLAGFORGE_MGMT_KEY</code></li>
          <li>Add <code>FLAGFORGE_API_URL</code> and <code>FLAGFORGE_PROJECT_ID</code> secrets</li>
        </ol>
        <h3>Code reference scanning</h3>
        <p>
          Run <code>scripts/scan-flag-refs.sh</code> from this repo on every push
          to keep the Lifecycle dashboard in sync with your codebase.
        </p>
        <CodeBlock
          lang="bash"
          code={`export FLAGFORGE_API=https://flags.example.com
export FLAGFORGE_PROJECT_ID=your-project-uuid
export FLAGFORGE_MGMT_KEY=mgmt_...
./scripts/scan-flag-refs.sh`}
        />
        <p>
          See <strong>Guides → Code Reference Scanning</strong> and{" "}
          <code>deploy/github-actions-scan-flag-refs.example.yml</code> for a full
          GitHub Actions workflow.
        </p>
        <h3>Toggle flags on deploy</h3>
        <CodeBlock
          lang="yaml"
          code={`# GitHub Actions — enable flag in staging after deploy
- name: Enable feature flag in staging
  env:
    FLAGFORGE_MGMT_KEY: \${{ secrets.FLAGFORGE_MGMT_KEY }}
  run: |
    curl -X PATCH \\
      $FLAGFORGE_API/api/v1/projects/$PROJECT_ID/flags/new-feature/toggle \\
      -H "Authorization: $FLAGFORGE_MGMT_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"enabled": true, "environment_id": "$STAGING_ENV_ID"}'`}
        />
      </>
    ),
  },

  "flag-lifecycle": {
    title: "Flag Lifecycle & Tech Debt",
    content: (
      <>
        <p>
          The <strong>Lifecycle</strong> dashboard finds flags that are still
          enabled but haven&apos;t been modified recently — a common source of
          flag debt.
        </p>
        <h3>Staleness detection</h3>
        <p>
          A flag is stale when it has had no audit activity (toggles, rule
          changes, overrides) for longer than the threshold (default 90 days),
          is enabled in at least one environment, and is not archived.
        </p>
        <h3>Lifecycle statuses</h3>
        <ul>
          <li><strong>active</strong> — normal operation</li>
          <li><strong>deprecated</strong> — marked for removal; team cleans up code</li>
          <li><strong>scheduled_cleanup</strong> — ready to archive</li>
        </ul>
        <h3>Ownership</h3>
        <p>
          Assign <code>owner_email</code> and <code>owner_name</code> so
          institutional knowledge survives engineer turnover.
        </p>
        <h3>API</h3>
        <CodeBlock
          lang="http"
          code={`GET  /api/v1/projects/{id}/lifecycle/stale?threshold_days=90
PATCH /api/v1/projects/{id}/flags/{key}/lifecycle
POST /api/v1/projects/{id}/flags/{key}/code-refs`}
        />
      </>
    ),
  },

  "code-reference-scanning": {
    title: "Code Reference Scanning",
    content: (
      <>
        <p>
          FlagForge stores where each flag appears in your source code. The
          scanner is <strong>not built in</strong> — you run ripgrep in CI and
          POST results to the ingest API.
        </p>
        <h3>How maintainers see references</h3>
        <ol>
          <li>CI runs <code>scripts/scan-flag-refs.sh</code> after each push</li>
          <li>Script greps for each flag key and POSTs matches</li>
          <li>Lifecycle dashboard shows ref counts and file paths per flag</li>
        </ol>
        <h3>Ingest API</h3>
        <CodeBlock
          lang="http"
          code={`POST /api/v1/projects/{project_id}/flags/{flag_key}/code-refs
Authorization: mgmt_...
Content-Type: application/json

{
  "branch": "main",
  "refs": [
    {
      "repo": "myorg/my-app",
      "commit_sha": "abc123",
      "file_path": "src/App.tsx",
      "line_number": 42,
      "snippet": "useBooleanFlag(\\"my-flag\\")"
    }
  ]
}`}
        />
        <p>
          Each POST replaces all refs for that flag + branch (idempotent).
          Sending an empty <code>refs</code> array clears refs for that branch.
        </p>
        <h3>Included script</h3>
        <CodeBlock
          lang="bash"
          code={`# Requires: rg, jq, curl
chmod +x scripts/scan-flag-refs.sh
export FLAGFORGE_API=https://your-server
export FLAGFORGE_PROJECT_ID=...
export FLAGFORGE_MGMT_KEY=mgmt_...
./scripts/scan-flag-refs.sh`}
        />
        <h3>GitHub Actions example</h3>
        <p>
          Copy <code>deploy/github-actions-scan-flag-refs.example.yml</code> into
          your app repo and set secrets: <code>FLAGFORGE_API_URL</code>,{" "}
          <code>FLAGFORGE_PROJECT_ID</code>, <code>FLAGFORGE_MGMT_KEY</code>.
        </p>
      </>
    ),
  },

  "management-api-keys": {
    title: "Management API Keys",
    content: (
      <>
        <p>
          <code>mgmt_</code> keys authenticate automation against the Management
          API without a Clerk session. They are project-scoped and revocable.
        </p>
        <h3>Create a key</h3>
        <ol>
          <li>Sign in to the dashboard</li>
          <li>Go to <strong>Settings → CI / Management Keys</strong></li>
          <li>Click <strong>Generate Key</strong> — copy the raw key immediately</li>
        </ol>
        <h3>Use in requests</h3>
        <CodeBlock
          lang="http"
          code={`GET /api/v1/projects/{project_id}/flags
Authorization: mgmt_xxxxxxxxxxxxxxxx`}
        />
        <h3>API endpoints</h3>
        <CodeBlock
          lang="http"
          code={`GET  /api/v1/projects/{id}/management-keys
POST /api/v1/projects/{id}/management-keys   { "name": "github-actions" }
POST /api/v1/projects/{id}/management-keys/{key_id}/revoke`}
        />
        <p>
          Creating and revoking keys requires a Clerk JWT (dashboard session).
          Using a key works for read/write management calls scoped to that project
          (flags, code refs, lifecycle, etc.).
        </p>
        <h3>Clerk M2M alternative</h3>
        <p>
          Teams on Clerk can use machine JWTs with{" "}
          <code>Authorization: Bearer &lt;token&gt;</code> instead. For
          self-hosted FlagForge, <code>mgmt_</code> keys are simpler — no Clerk
          billing or M2M configuration required.
        </p>
      </>
    ),
  },
};

/* ------------------------------------------------------------------ */
/*  Stub entries for API reference pages                                */
/* ------------------------------------------------------------------ */

for (const [slug, title] of [
  ["api-projects", "API: Projects"],
  ["api-flags", "API: Flags"],
  ["api-segments", "API: Segments"],
  ["api-environments", "API: Environments"],
  ["api-sdk-keys", "API: SDK Keys"],
] as const) {
  if (!docs[slug]) {
    docs[slug] = {
      title,
      content: (
        <p className="text-text-muted italic">
          Full API reference documentation coming soon. In the meantime,
          refer to the REST API page for endpoint examples.
        </p>
      ),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  const [activePage, setActivePage] = useState("introduction");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentDoc = docs[activePage] || {
    title: "Not Found",
    content: <p>This page hasn&apos;t been written yet.</p>,
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="flex pt-16">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 md:hidden w-12 h-12 bg-accent-red flex items-center justify-center shadow-lg"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="1.5" fill="white" />
            <rect x="2" y="9.5" width="16" height="1.5" fill="white" />
            <rect x="2" y="15" width="16" height="1.5" fill="white" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-72 bg-bg-secondary/80 backdrop-blur-md border-r border-border overflow-y-auto z-40 transition-transform md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="py-6 px-4">
            {sidebar.map((group) => (
              <div key={group.slug} className="mb-6">
                <div className="font-mono text-label-xs uppercase text-text-primary tracking-wider px-3 mb-2">
                  {group.label}
                </div>
                {group.children?.map((item) => (
                  <button
                    key={item.slug}
                    onClick={() => {
                      setActivePage(item.slug);
                      setSidebarOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 font-mono text-label-xs transition-colors ${
                      activePage === item.slug
                        ? "text-accent-red bg-accent-red/[0.06] border-l-2 border-accent-red -ml-[2px] pl-[14px]"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <article className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16 doc-content">
            {/* Breadcrumb */}
            <div className="font-mono text-label-xs text-text-muted mb-6 uppercase tracking-wider">
              Documentation{" "}
              <span className="text-border-lighter mx-1">/</span>{" "}
              {currentDoc.title}
            </div>

            <h1 className="font-serif text-display-md mb-8">
              {currentDoc.title}
            </h1>

            <div className="doc-prose">{currentDoc.content}</div>

            {/* Prev / Next navigation */}
            <div className="mt-16 pt-8 border-t border-border flex justify-between gap-4">
              <NavButton
                direction="prev"
                slug={activePage}
                onNavigate={setActivePage}
              />
              <NavButton
                direction="next"
                slug={activePage}
                onNavigate={setActivePage}
              />
            </div>
          </article>
        </div>
      </div>

      <Footer />

      {/* Doc prose styles */}
      <style jsx global>{`
        .doc-prose h3 {
          font-family: var(--font-serif), Georgia, serif;
          font-size: 1.25rem;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: #C1BCA9;
        }

        .doc-prose p {
          color: #999;
          line-height: 1.75;
          margin-bottom: 1rem;
          font-size: 0.925rem;
        }

        .doc-prose ul,
        .doc-prose ol {
          color: #999;
          margin-bottom: 1rem;
          padding-left: 1.5rem;
          font-size: 0.925rem;
          line-height: 1.75;
        }

        .doc-prose ul {
          list-style: none;
        }

        .doc-prose ul li::before {
          content: ">>>";
          color: #790f11;
          font-family: var(--font-mono), monospace;
          font-size: 0.6rem;
          margin-right: 0.5rem;
          opacity: 0.6;
        }

        .doc-prose ol {
          list-style: decimal;
        }

        .doc-prose ol li {
          margin-bottom: 0.25rem;
        }

        .doc-prose code {
          font-family: var(--font-mono), monospace;
          font-size: 0.8rem;
          background: #1e1c16;
          border: 1px solid #222;
          padding: 1px 5px;
          color: #790f11;
        }

        .doc-prose strong {
          color: #C1BCA9;
          font-weight: 600;
        }

        .doc-prose table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
        }

        .doc-prose th {
          font-family: var(--font-mono), monospace;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #777;
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid #2a2720;
          background: #1a1814;
        }

        .doc-prose td {
          padding: 8px 12px;
          border-bottom: 1px solid #2a2720;
          color: #999;
        }

        .doc-prose td code {
          font-size: 0.75rem;
        }

        .doc-diagram {
          background: #111;
          border: 1px solid #2a2720;
          padding: 2rem;
          margin: 1.5rem 0;
        }

        .doc-diagram-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
      `}</style>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper components                                                   */
/* ------------------------------------------------------------------ */

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="my-4 bg-[#111] border border-border overflow-x-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-card">
        <span className="font-mono text-label-xs text-text-muted uppercase">
          {lang}
        </span>
      </div>
      <pre className="px-4 py-4 font-mono text-[0.75rem] leading-6 text-text-secondary overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DiagramBox({
  label,
  sub,
  accent,
}: {
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`px-5 py-3 border text-center ${
        accent
          ? "border-accent-red/40 bg-accent-red/[0.05]"
          : "border-border-lighter bg-bg-card"
      }`}
    >
      <div className="font-mono text-label-xs text-text-primary uppercase">
        {label}
      </div>
      <div className="font-mono text-label-xs text-text-muted">{sub}</div>
    </div>
  );
}

function DiagramArrow({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-1 px-2">
      <div className="w-8 h-px bg-border-lighter" />
      {label && (
        <span className="font-mono text-label-xs text-text-muted">
          {label}
        </span>
      )}
      <span className="font-mono text-label-xs text-accent-red/50">
        {">>>"}
      </span>
    </div>
  );
}

function NavButton({
  direction,
  slug,
  onNavigate,
}: {
  direction: "prev" | "next";
  slug: string;
  onNavigate: (slug: string) => void;
}) {
  const allSlugs = sidebar.flatMap(
    (g) => g.children?.map((c) => c.slug) || []
  );
  const allLabels = sidebar.flatMap(
    (g) => g.children?.map((c) => c.label) || []
  );
  const idx = allSlugs.indexOf(slug);
  const targetIdx = direction === "prev" ? idx - 1 : idx + 1;

  if (targetIdx < 0 || targetIdx >= allSlugs.length) return <div />;

  return (
    <button
      onClick={() => onNavigate(allSlugs[targetIdx])}
      className={`flex flex-col gap-1 p-4 border border-border hover:border-border-lighter transition-colors max-w-[240px] ${
        direction === "next" ? "text-right ml-auto" : ""
      }`}
    >
      <span className="font-mono text-label-xs text-text-muted uppercase">
        {direction === "prev" ? "<<< Previous" : "Next >>>"}
      </span>
      <span className="font-mono text-label-xs text-text-primary uppercase">
        {allLabels[targetIdx]}
      </span>
    </button>
  );
}
