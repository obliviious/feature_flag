"use client";

import { useState } from "react";

const keys = [
  { id: "1", prefix: "srv_k8x", type: "Server", env: "Production", created: "Jan 15, 2026", lastUsed: "2 min ago", active: true },
  { id: "2", prefix: "cli_m3p", type: "Client", env: "Production", created: "Jan 15, 2026", lastUsed: "5 min ago", active: true },
  { id: "3", prefix: "srv_r7w", type: "Server", env: "Staging", created: "Jan 20, 2026", lastUsed: "1 hr ago", active: true },
  { id: "4", prefix: "cli_t2q", type: "Client", env: "Staging", created: "Jan 20, 2026", lastUsed: "3 hrs ago", active: true },
  { id: "5", prefix: "srv_a1b", type: "Server", env: "Development", created: "Jan 10, 2026", lastUsed: "1 day ago", active: true },
];

export default function SDKKeysPage() {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl mb-1">SDK Keys</h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            Authentication keys for server and client SDKs
          </p>
        </div>
        <button className="font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="white" strokeWidth="1.5" /><line x1="1" y1="6" x2="11" y2="6" stroke="white" strokeWidth="1.5" /></svg>
          Generate Key
        </button>
      </div>

      {/* Info banner */}
      <div className="border border-border-lighter bg-bg-card px-5 py-3 flex items-start gap-3">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
          <circle cx="7" cy="7" r="6" stroke="#790f11" strokeWidth="1" />
          <line x1="7" y1="4" x2="7" y2="8" stroke="#790f11" strokeWidth="1.2" />
          <circle cx="7" cy="10" r="0.8" fill="#790f11" />
        </svg>
        <p className="font-mono text-[0.55rem] text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Server keys (srv_)</strong> have full access and should never be exposed to clients.{" "}
          <strong className="text-text-primary">Client keys (cli_)</strong> are safe for browser/mobile use and only allow read-only evaluation.
        </p>
      </div>

      {/* Keys table */}
      <div className="border border-border overflow-x-auto">
        <div className="grid grid-cols-[1fr_80px_110px_110px_100px_60px] min-w-[600px] px-5 py-2.5 border-b border-border bg-bg-card">
          {["Key", "Type", "Environment", "Created", "Last Used", ""].map((h) => (
            <span key={h} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border min-w-[600px]">
          {keys.map((k) => (
            <div key={k.id} className="grid grid-cols-[1fr_80px_110px_110px_100px_60px] px-5 py-3 hover:bg-bg-card/50 transition-colors items-center">
              {/* Key */}
              <div className="flex items-center gap-2">
                <div className="font-mono text-[0.7rem] text-text-primary bg-bg-card border border-border px-2.5 py-1">
                  {revealedKey === k.id
                    ? `${k.prefix}${"x".repeat(24)}...e2f`
                    : `${k.prefix}${"•".repeat(20)}`}
                </div>
                <button
                  onClick={() => setRevealedKey(revealedKey === k.id ? null : k.id)}
                  className="text-text-muted hover:text-text-secondary transition-colors p-1"
                  title={revealedKey === k.id ? "Hide" : "Reveal"}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    {revealedKey === k.id ? (
                      <>
                        <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1" />
                        <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1" />
                      </>
                    ) : (
                      <>
                        <ellipse cx="7" cy="7" rx="5.5" ry="3.5" stroke="currentColor" strokeWidth="1" />
                        <circle cx="7" cy="7" r="1.5" fill="currentColor" />
                      </>
                    )}
                  </svg>
                </button>
              </div>

              {/* Type */}
              <span className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 w-fit ${
                k.type === "Server"
                  ? "text-accent-red border border-accent-red/20 bg-accent-red/[0.04]"
                  : "text-blue-400/70 border border-blue-400/20 bg-blue-400/[0.04]"
              }`}>
                {k.type}
              </span>

              {/* Environment */}
              <span className="font-mono text-[0.6rem] text-text-secondary">{k.env}</span>

              {/* Created */}
              <span className="font-mono text-[0.5rem] text-text-muted">{k.created}</span>

              {/* Last used */}
              <span className="font-mono text-[0.5rem] text-text-muted/60">{k.lastUsed}</span>

              {/* Actions */}
              <button className="font-mono text-[0.5rem] text-accent-red/60 hover:text-accent-red transition-colors uppercase tracking-wider">
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
