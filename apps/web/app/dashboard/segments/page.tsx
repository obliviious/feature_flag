"use client";

const segments = [
  { id: "1", name: "Enterprise Users", matchType: "all", constraints: 3, usedBy: 4, updated: "1 day ago" },
  { id: "2", name: "Beta Testers", matchType: "any", constraints: 2, usedBy: 6, updated: "2 days ago" },
  { id: "3", name: "US West Coast", matchType: "all", constraints: 1, usedBy: 2, updated: "5 days ago" },
  { id: "4", name: "Mobile Users", matchType: "all", constraints: 2, usedBy: 3, updated: "1 week ago" },
  { id: "5", name: "Free Tier", matchType: "all", constraints: 1, usedBy: 1, updated: "2 weeks ago" },
];

const constraintExamples = [
  { attr: "plan", op: "eq", val: "enterprise" },
  { attr: "verified", op: "eq", val: "true" },
  { attr: "company_size", op: "gte", val: "100" },
];

export default function SegmentsPage() {
  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl mb-1">Segments</h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            Reusable user groups for targeting rules
          </p>
        </div>
        <button className="font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="white" strokeWidth="1.5" /><line x1="1" y1="6" x2="11" y2="6" stroke="white" strokeWidth="1.5" /></svg>
          Create Segment
        </button>
      </div>

      {/* Segments list */}
      <div className="border border-border">
        <div className="grid grid-cols-[1fr_90px_80px_80px_90px] px-5 py-2.5 border-b border-border bg-bg-card min-w-[550px]">
          {["Segment", "Match", "Rules", "Used By", "Updated"].map((h) => (
            <span key={h} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border">
          {segments.map((seg) => (
            <div key={seg.id} className="grid grid-cols-[1fr_90px_80px_80px_90px] px-5 py-4 hover:bg-bg-card/50 transition-colors cursor-pointer group items-center min-w-[550px]">
              <div>
                <div className="font-mono text-[0.7rem] text-text-primary group-hover:text-accent-red transition-colors">{seg.name}</div>
              </div>
              <span className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 w-fit ${
                seg.matchType === "all" ? "text-blue-400/70 border border-blue-400/20 bg-blue-400/[0.04]" : "text-amber-400/70 border border-amber-400/20 bg-amber-400/[0.04]"
              }`}>
                {seg.matchType}
              </span>
              <span className="font-mono text-[0.6rem] text-text-secondary">{seg.constraints}</span>
              <span className="font-mono text-[0.6rem] text-text-secondary">{seg.usedBy} flags</span>
              <span className="font-mono text-[0.5rem] text-text-muted/60">{seg.updated}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segment detail preview */}
      <div className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card flex items-center justify-between">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            Enterprise Users — Constraints
          </span>
          <span className="font-mono text-[0.5rem] text-accent-red uppercase tracking-wider">Match ALL</span>
        </div>
        <div className="divide-y divide-border">
          {constraintExamples.map((c, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-[0.5rem] text-text-muted/40 w-5">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-mono text-[0.65rem] text-accent-red bg-accent-red/[0.06] px-2 py-0.5 border border-accent-red/15">
                {c.attr}
              </span>
              <span className="font-mono text-[0.55rem] text-text-muted uppercase">{c.op}</span>
              <span className="font-mono text-[0.65rem] text-text-primary bg-bg-card px-2 py-0.5 border border-border">
                {c.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
