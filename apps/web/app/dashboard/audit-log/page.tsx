"use client";

const logs = [
  { id: "1", action: "flag.toggled", actor: "sarah@techscale.io", target: "new-checkout-flow", detail: "Enabled in production", env: "Production", timestamp: "2026-02-28 14:32:01" },
  { id: "2", action: "flag.created", actor: "marcus@dataflow.io", target: "ai-recommendations", detail: "Created with 2 variants", env: "All", timestamp: "2026-02-28 13:15:44" },
  { id: "3", action: "segment.updated", actor: "sarah@techscale.io", target: "Enterprise Users", detail: "Added company_size constraint", env: "—", timestamp: "2026-02-28 11:02:18" },
  { id: "4", action: "sdk_key.created", actor: "aiko@cloudpeak.io", target: "srv_k8x...e2f", detail: "Server key for production", env: "Production", timestamp: "2026-02-28 08:45:33" },
  { id: "5", action: "flag.updated", actor: "marcus@dataflow.io", target: "pricing-experiment", detail: "Updated targeting rules", env: "Staging", timestamp: "2026-02-27 22:11:07" },
  { id: "6", action: "flag.toggled", actor: "sarah@techscale.io", target: "dark-mode-v2", detail: "Disabled in production", env: "Production", timestamp: "2026-02-27 19:44:52" },
  { id: "7", action: "flag.archived", actor: "marcus@dataflow.io", target: "legacy-payment-flow", detail: "Archived — no longer in use", env: "All", timestamp: "2026-02-27 16:20:11" },
  { id: "8", action: "environment.created", actor: "sarah@techscale.io", target: "Staging", detail: "New environment created", env: "—", timestamp: "2026-02-26 10:05:39" },
  { id: "9", action: "flag.toggled", actor: "aiko@cloudpeak.io", target: "rate-limiting-v2", detail: "Enabled in all environments", env: "All", timestamp: "2026-02-26 08:30:22" },
  { id: "10", action: "flag.created", actor: "sarah@techscale.io", target: "multivariate-cta", detail: "Created with 3 variants", env: "All", timestamp: "2026-02-25 14:55:08" },
];

function actionColor(action: string) {
  if (action.includes("toggled")) return "text-amber-400/70 border-amber-400/20 bg-amber-400/[0.04]";
  if (action.includes("created")) return "text-green-400/70 border-green-400/20 bg-green-400/[0.04]";
  if (action.includes("updated")) return "text-blue-400/70 border-blue-400/20 bg-blue-400/[0.04]";
  if (action.includes("archived")) return "text-text-muted/70 border-border bg-bg-card";
  return "text-text-muted border-border bg-bg-card";
}

export default function AuditLogPage() {
  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      <div>
        <h1 className="font-serif text-2xl mb-1">Audit Log</h1>
        <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
          Complete history of every action taken in this project
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {["All", "Flags", "Segments", "SDK Keys", "Environments"].map((f, i) => (
          <button
            key={f}
            className={`font-mono text-[0.55rem] uppercase tracking-wider px-3 py-1.5 border transition-colors ${
              i === 0
                ? "border-accent-red/30 text-accent-red bg-accent-red/[0.05]"
                : "border-border text-text-muted hover:text-text-secondary hover:border-border-lighter"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="border border-border">
        <div className="grid grid-cols-[130px_100px_1fr_100px_160px] min-w-[700px] px-5 py-2.5 border-b border-border bg-bg-card">
          {["Action", "Actor", "Details", "Environment", "Timestamp"].map((h) => (
            <span key={h} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border min-w-[700px]">
          {logs.map((log) => (
            <div key={log.id} className="grid grid-cols-[130px_100px_1fr_100px_160px] px-5 py-3 hover:bg-bg-card/30 transition-colors items-center">
              <span className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 border w-fit ${actionColor(log.action)}`}>
                {log.action}
              </span>
              <span className="font-mono text-[0.55rem] text-text-secondary truncate pr-2">
                {log.actor.split("@")[0]}
              </span>
              <div className="pr-4">
                <span className="font-mono text-[0.6rem] text-text-primary">{log.target}</span>
                <span className="font-mono text-[0.5rem] text-text-muted ml-2">{log.detail}</span>
              </div>
              <span className="font-mono text-[0.5rem] text-text-muted">{log.env}</span>
              <span className="font-mono text-[0.5rem] text-text-muted/50">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
