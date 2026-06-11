"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

const JS_INSTALL = `npm install @flagforge/sdk-js
# or
pnpm add @flagforge/sdk-js`;

const JS_SERVER = `import { FlagForgeClient } from "@flagforge/sdk-js";

const client = new FlagForgeClient({
  serverKey: process.env.FLAGFORGE_SERVER_KEY!,
  baseUrl: "http://localhost:8080",
  streaming: true, // SSE delta updates
});

await client.init();

// Typed helpers — zero network calls after init
const enabled = await client.getBooleanValue("new-checkout", false, {
  targetingKey: "user-123",
  attributes: { plan: "pro", country: "US" },
});`;

const JS_CLIENT = `import { FlagForgeClient } from "@flagforge/sdk-js";

// Client key for browsers — rules stay on the server
const client = new FlagForgeClient({
  clientKey: "cli_your_key_here",
  baseUrl: "http://localhost:8080",
});

await client.init();

const value = await client.getNumberValue("price-multiplier", 1.0, {
  targetingKey: "user-123",
});`;

const REACT_INSTALL = `npm install @flagforge/sdk-react @flagforge/sdk-js
# or
pnpm add @flagforge/sdk-react @flagforge/sdk-js`;

const REACT_PROVIDER = `// components/flagforge-provider.tsx
"use client";

import { FlagForgeProvider } from "@flagforge/sdk-react";

export function AppFlagForgeProvider({ children }) {
  return (
    <FlagForgeProvider
      config={{
        clientKey: process.env.NEXT_PUBLIC_FLAGFORGE_CLIENT_KEY!,
        baseUrl: process.env.NEXT_PUBLIC_FLAGFORGE_API_URL!,
      }}
    >
      {children}
    </FlagForgeProvider>
  );
}`;

const REACT_HOOKS = `"use client";

import {
  useBooleanFlag,
  useStringFlag,
  useNumberFlag,
} from "@flagforge/sdk-react";

export function CheckoutButton() {
  const { value: newCheckout, loading } =
    useBooleanFlag("new-checkout", false, {
      targetingKey: "user-123",
      attributes: { plan: "pro" },
    });

  const theme    = useStringFlag("ui-theme", "light");
  const maxItems = useNumberFlag("cart-max-items", 10);

  if (loading) return null;
  return newCheckout ? <NewCheckout /> : <OldCheckout />;
}`;

interface Tab {
  id: string;
  label: string;
  code: string;
}

const jsTabs: Tab[] = [
  { id: "server", label: "Server (Node.js)", code: JS_SERVER },
  { id: "client", label: "Browser / Client", code: JS_CLIENT },
];

const reactTabs: Tab[] = [
  { id: "provider", label: "Provider", code: REACT_PROVIDER },
  { id: "hooks", label: "Hooks", code: REACT_HOOKS },
];

function CodeBlock({ code, install }: { code: string; install: string }) {
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="font-mono text-xs leading-relaxed">
      {/* Install line */}
      <div className="flex items-center justify-between border-b border-[#252320] px-4 py-2.5">
        <span className="text-text-muted/50 text-[10px] uppercase tracking-widest">Install</span>
        <button
          onClick={() => copy(install.split("\n")[0].replace("npm install ", "").replace("npm i ", ""))}
          className="text-[10px] text-text-muted hover:text-accent-red transition-colors"
        >
          {copied ? "Copied!" : "Copy npm"}
        </button>
      </div>
      <pre className="px-4 py-3 text-accent-red/80 border-b border-[#252320] overflow-x-auto whitespace-pre">
        {install}
      </pre>

      {/* Code */}
      <pre className="px-4 py-4 text-[#a8a090] overflow-x-auto whitespace-pre leading-6">
        {code}
      </pre>
    </div>
  );
}

function SDKCard({
  name,
  npmUrl,
  version,
  description,
  install,
  tabs,
  features,
  badge,
}: {
  name: string;
  npmUrl: string;
  version: string;
  description: string;
  install: string;
  tabs: Tab[];
  features: string[];
  badge: string;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="bg-bg-primary border border-border flex flex-col">
      {/* Card header */}
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <div className="flex items-start justify-between mb-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-label-xs text-accent-red uppercase tracking-wider">
                {badge}
              </span>
            </div>
            <h3 className="font-serif text-xl text-text-primary">{name}</h3>
          </div>
          <a
            href={npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 border border-border px-2.5 py-1.5 hover:border-accent-red/50 transition-colors group"
          >
            {/* npm icon */}
            <svg width="14" height="14" viewBox="0 0 780 250" fill="none" className="flex-shrink-0">
              <rect width="250" height="250" fill="#CB3837"/>
              <rect x="80" y="80" width="240" height="90" fill="white"/>
              <rect x="160" y="80" width="80" height="90" fill="#CB3837"/>
              <rect x="530" y="80" width="250" height="170" fill="#CB3837"/>
              <rect x="610" y="80" width="80" height="90" fill="white"/>
            </svg>
            <span className="font-mono text-[10px] text-text-muted group-hover:text-accent-red transition-colors">
              v{version}
            </span>
          </a>
        </div>

        <p className="text-text-secondary text-sm leading-relaxed mb-4">{description}</p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-1.5">
          {features.map((f) => (
            <span
              key={f}
              className="font-mono text-[10px] px-2 py-0.5 bg-bg-card border border-border text-text-muted"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-mono text-[10px] uppercase tracking-wider px-4 py-2.5 border-r border-border transition-colors ${
              activeTab === tab.id
                ? "bg-accent-red/10 text-accent-red border-b-2 border-b-accent-red -mb-px"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code */}
      <div className="bg-[#0f0e0c] flex-1 overflow-hidden">
        <CodeBlock code={current.code} install={install} />
      </div>

      {/* Footer link */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <a
          href={npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="red-link"
        >
          View on npm {">>>"}
        </a>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
          <span className="font-mono text-[10px] text-text-muted">MIT License · 0 deps</span>
        </div>
      </div>
    </div>
  );
}

export default function SDKSection() {
  return (
    <section className="relative py-24 md:py-32 border-b border-border">
      <div className="absolute inset-0 grid-dots pointer-events-none opacity-20" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <ScrollReveal>
            <div className="label-badge mb-8">SDKs</div>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <h2 className="font-serif text-display-md max-w-2xl mb-5">
              Two packages. Every environment.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={2}>
            <p className="text-text-secondary text-lg max-w-2xl leading-relaxed">
              Install the right SDK for your runtime — a zero-dependency core for
              Node.js, edge functions, and plain TypeScript; and a React wrapper
              with hooks that update automatically when flags change.
            </p>
          </ScrollReveal>
        </div>

        {/* SDK cards */}
        <ScrollReveal delay={1}>
          <div className="grid lg:grid-cols-2 gap-px bg-border">
            <SDKCard
              name="@flagforge/sdk-js"
              npmUrl="https://www.npmjs.com/package/@flagforge/sdk-js"
              version="0.3.0"
              description="Core JavaScript / TypeScript SDK. Works in Node.js, edge runtimes, and the browser. Two evaluation modes: local (server key downloads config + evaluates in-process) and remote (client key evaluates on the server)."
              install={JS_INSTALL}
              tabs={jsTabs}
              features={[
                "Zero dependencies",
                "Local evaluation",
                "SSE delta streaming",
                "Rate-limit retry",
                "Heartbeat tracking",
                "TypeScript-first",
              ]}
              badge="JavaScript / TypeScript"
            />

            <SDKCard
              name="@flagforge/sdk-react"
              npmUrl="https://www.npmjs.com/package/@flagforge/sdk-react"
              version="0.2.0"
              description="React Provider + hooks built on top of sdk-js. Wrap your app once, then call typed hooks anywhere. Re-renders automatically when flags change via SSE. Peer dep: React ≥ 17."
              install={REACT_INSTALL}
              tabs={reactTabs}
              features={[
                "FlagForgeProvider",
                "useBooleanFlag",
                "useStringFlag",
                "useNumberFlag",
                "useJsonFlag",
                "Auto re-render on change",
              ]}
              badge="React"
            />
          </div>
        </ScrollReveal>

        {/* Bottom comparison table */}
        <ScrollReveal delay={2}>
          <div className="mt-px bg-border">
            <div className="bg-bg-primary p-6 md:p-8">
              <div className="font-mono text-label-xs text-text-muted uppercase tracking-wider mb-6">
                Which key type to use
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-mono text-[10px] uppercase tracking-wider text-text-muted pb-3 pr-8">
                        Environment
                      </th>
                      <th className="text-left font-mono text-[10px] uppercase tracking-wider text-text-muted pb-3 pr-8">
                        Key type
                      </th>
                      <th className="text-left font-mono text-[10px] uppercase tracking-wider text-text-muted pb-3 pr-8">
                        Package
                      </th>
                      <th className="text-left font-mono text-[10px] uppercase tracking-wider text-text-muted pb-3">
                        Behavior
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    {[
                      {
                        env: "Node.js / API routes / SSR",
                        key: "srv_…",
                        pkg: "@flagforge/sdk-js",
                        behavior: "Downloads config · evaluates locally · SSE streaming",
                      },
                      {
                        env: "Browser / React client components",
                        key: "cli_…",
                        pkg: "@flagforge/sdk-react",
                        behavior: "Remote eval on server · targeting rules never shipped",
                      },
                      {
                        env: "Edge functions (Cloudflare, Vercel)",
                        key: "srv_…",
                        pkg: "@flagforge/sdk-js",
                        behavior: "Local eval · no per-request network round-trip",
                      },
                      {
                        env: "Browser (plain TS, no React)",
                        key: "cli_…",
                        pkg: "@flagforge/sdk-js",
                        behavior: "Remote eval via clientKey · zero config shipped to browser",
                      },
                    ].map((row) => (
                      <tr key={row.env} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-8 text-text-primary font-medium">{row.env}</td>
                        <td className="py-3 pr-8">
                          <code className="font-mono text-xs text-accent-red/80 bg-accent-red/5 border border-accent-red/20 px-1.5 py-0.5">
                            {row.key}
                          </code>
                        </td>
                        <td className="py-3 pr-8">
                          <code className="font-mono text-xs text-text-muted">{row.pkg}</code>
                        </td>
                        <td className="py-3 text-text-secondary text-sm">{row.behavior}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex items-center gap-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#790f11" strokeWidth="1.2"/>
                  <path d="M7 6v4M7 4.5v.5" stroke="#790f11" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span className="font-mono text-[10px] text-text-muted">
                  Never put <code className="text-accent-red/80">srv_…</code> keys in{" "}
                  <code className="text-text-secondary">NEXT_PUBLIC_*</code> variables or client-side bundles.
                  Use <code className="text-accent-red/80">cli_…</code> keys for all browser-facing code.
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
