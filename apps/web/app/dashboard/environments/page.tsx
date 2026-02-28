"use client";

const environments = [
  { name: "Production", slug: "production", flags: 12, keys: 2, version: 47, color: "#790f11", status: "active" },
  { name: "Staging", slug: "staging", flags: 12, keys: 1, version: 52, color: "#e8a84c", status: "active" },
  { name: "Development", slug: "development", flags: 12, keys: 1, version: 89, color: "#4caf50", status: "active" },
];

export default function EnvironmentsPage() {
  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl mb-1">Environments</h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            Isolated deployment targets with independent flag states
          </p>
        </div>
        <button className="font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 border border-border-lighter text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" /><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" /></svg>
          Add Environment
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-border">
        {environments.map((env) => (
          <div key={env.slug} className="bg-bg-primary p-6 hover:bg-bg-card/50 transition-colors cursor-pointer group">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: env.color }} />
              <h2 className="font-serif text-lg text-text-primary group-hover:text-accent-red transition-colors">
                {env.name}
              </h2>
            </div>

            {/* Slug */}
            <div className="font-mono text-[0.6rem] text-text-muted bg-bg-card border border-border px-2.5 py-1.5 mb-5 inline-block">
              {env.slug}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Flags", val: env.flags },
                { label: "SDK Keys", val: env.keys },
                { label: "Version", val: env.version },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-serif text-lg text-text-primary">{s.val}</div>
                  <div className="font-mono text-[0.45rem] text-text-muted uppercase tracking-[0.16em]">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                SSE streaming active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Environment config comparison */}
      <div className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            Flag State Comparison
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">Flag</th>
                {environments.map((env) => (
                  <th key={env.slug} className="text-center px-4 py-2.5 font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: env.color }} />
                      {env.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {["new-checkout-flow", "dark-mode-v2", "pricing-experiment", "ai-recommendations", "new-onboarding"].map((flag) => (
                <tr key={flag} className="hover:bg-bg-card/30 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-[0.6rem] text-text-primary">{flag}</td>
                  {[true, true, true].map((_, i) => {
                    const on = Math.random() > 0.35;
                    return (
                      <td key={i} className="text-center px-4 py-2.5">
                        <span className={`inline-block font-mono text-[0.5rem] uppercase tracking-wider px-2 py-0.5 ${
                          on ? "text-green-500 bg-green-500/[0.06] border border-green-500/20" : "text-text-muted/50 bg-bg-card border border-border"
                        }`}>
                          {on ? "ON" : "OFF"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
