"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

const stats = [
  { label: "Total Flags", value: "12", change: "+3", trend: "up" },
  { label: "Environments", value: "3", change: "0", trend: "flat" },
  { label: "Evaluations (24h)", value: "48.2K", change: "+12%", trend: "up" },
  { label: "Avg Latency", value: "0.4ms", change: "-8%", trend: "down" },
];

const recentFlags = [
  { key: "new-checkout-flow", enabled: true, env: "Production", updated: "2 min ago", type: "boolean" },
  { key: "dark-mode-v2", enabled: true, env: "Staging", updated: "1 hr ago", type: "boolean" },
  { key: "pricing-experiment", enabled: false, env: "Production", updated: "3 hrs ago", type: "string" },
  { key: "ai-recommendations", enabled: true, env: "Production", updated: "5 hrs ago", type: "boolean" },
  { key: "new-onboarding", enabled: false, env: "Development", updated: "1 day ago", type: "json" },
];

const activity = [
  { action: "Flag toggled", detail: "new-checkout-flow → ON in production", user: "Sarah C.", time: "2 min ago", type: "toggle" },
  { action: "Flag created", detail: "ai-recommendations", user: "Marcus R.", time: "1 hr ago", type: "create" },
  { action: "Segment updated", detail: "Enterprise Users — added plan constraint", user: "Sarah C.", time: "3 hrs ago", type: "update" },
  { action: "SDK key generated", detail: "srv_k8x...e2f for Production", user: "Aiko T.", time: "5 hrs ago", type: "key" },
  { action: "Flag archived", detail: "legacy-payment-flow", user: "Marcus R.", time: "1 day ago", type: "archive" },
  { action: "Environment created", detail: "Staging", user: "Sarah C.", time: "2 days ago", type: "create" },
];

export default function DashboardOverview() {
  const { user, isLoaded } = useUser();

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl md:text-3xl mb-2">
          Welcome{isLoaded && user ? `, ${user.firstName || "back"}` : ""}.
        </h1>
        <p className="font-mono text-label-xs text-text-muted uppercase tracking-wider">
          Project overview and recent activity
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg-primary p-5">
            <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-2">
              {s.label}
            </div>
            <div className="flex items-end gap-2">
              <span className="font-serif text-2xl text-text-primary">{s.value}</span>
              <span
                className={`font-mono text-[0.55rem] mb-1 ${
                  s.trend === "up"
                    ? "text-green-500"
                    : s.trend === "down"
                    ? "text-accent-red"
                    : "text-text-muted"
                }`}
              >
                {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Flags table */}
        <div className="border border-border">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-card">
            <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
              Recent Flags
            </span>
            <Link
              href="/dashboard/flags"
              className="font-mono text-[0.55rem] text-accent-red uppercase tracking-wider hover:text-accent-red-hover transition-colors"
            >
              View All {">>>"}
            </Link>
          </div>

          <div className="divide-y divide-border">
            {recentFlags.map((flag) => (
              <div
                key={flag.key}
                className="flex items-center gap-4 px-5 py-3 hover:bg-bg-card/50 transition-colors cursor-pointer group"
              >
                {/* Toggle */}
                <button
                  className={`w-8 h-[18px] rounded-full p-[2px] transition-colors shrink-0 ${
                    flag.enabled ? "bg-accent-red" : "bg-[#2a2720]"
                  }`}
                >
                  <div
                    className={`w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                      flag.enabled ? "translate-x-[14px]" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Flag info */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[0.7rem] text-text-primary group-hover:text-accent-red transition-colors truncate">
                    {flag.key}
                  </div>
                  <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                    {flag.env}
                  </div>
                </div>

                {/* Type badge */}
                <span className="font-mono text-[0.5rem] text-text-muted/60 uppercase tracking-wider border border-border px-1.5 py-0.5 hidden sm:block">
                  {flag.type}
                </span>

                {/* Time */}
                <span className="font-mono text-[0.5rem] text-text-muted shrink-0">
                  {flag.updated}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="border border-border">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-card">
            <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
              Activity
            </span>
            <Link
              href="/dashboard/audit-log"
              className="font-mono text-[0.55rem] text-accent-red uppercase tracking-wider hover:text-accent-red-hover transition-colors"
            >
              Full Log {">>>"}
            </Link>
          </div>

          <div className="divide-y divide-border">
            {activity.map((a, i) => (
              <div key={i} className="px-5 py-3 hover:bg-bg-card/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center border ${
                      a.type === "toggle"
                        ? "border-accent-red/30 text-accent-red"
                        : a.type === "create"
                        ? "border-green-500/30 text-green-500"
                        : "border-border-lighter text-text-muted"
                    }`}
                  >
                    {a.type === "toggle" && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="3" /></svg>
                    )}
                    {a.type === "create" && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><line x1="4" y1="1" x2="4" y2="7" stroke="currentColor" strokeWidth="1.2" /><line x1="1" y1="4" x2="7" y2="4" stroke="currentColor" strokeWidth="1.2" /></svg>
                    )}
                    {a.type === "update" && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4h6M5 2l2 2-2 2" stroke="currentColor" strokeWidth="1" /></svg>
                    )}
                    {a.type === "key" && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="3" cy="4" r="2" stroke="currentColor" strokeWidth="0.8" /><line x1="5" y1="4" x2="7.5" y2="4" stroke="currentColor" strokeWidth="0.8" /></svg>
                    )}
                    {a.type === "archive" && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><rect x="1" y="1" width="6" height="2" stroke="currentColor" strokeWidth="0.8" /><rect x="2" y="3" width="4" height="4" stroke="currentColor" strokeWidth="0.8" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[0.6rem] text-text-primary">
                      {a.action}
                    </div>
                    <div className="font-mono text-[0.5rem] text-text-muted truncate">
                      {a.detail}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5 ml-8">
                  <span className="font-mono text-[0.5rem] text-text-muted/60">{a.user}</span>
                  <span className="text-border-lighter text-[0.4rem]">|</span>
                  <span className="font-mono text-[0.5rem] text-text-muted/40">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evaluations chart placeholder */}
      <div className="border border-border">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            Evaluations — Last 7 Days
          </span>
          <div className="flex gap-4">
            {["7D", "30D", "90D"].map((p) => (
              <button
                key={p}
                className={`font-mono text-[0.5rem] uppercase tracking-wider transition-colors ${
                  p === "7D" ? "text-accent-red" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          <svg viewBox="0 0 700 160" className="w-full" fill="none">
            {/* Grid lines */}
            {[40, 80, 120].map((y) => (
              <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#2a2720" strokeWidth="0.5" strokeDasharray="4 4" />
            ))}

            {/* Area fill */}
            <path
              d="M0 140 L100 120 L200 100 L300 90 L400 70 L500 50 L600 55 L700 30 L700 160 L0 160 Z"
              fill="url(#eval-gradient)"
            />

            {/* Line */}
            <polyline
              points="0,140 100,120 200,100 300,90 400,70 500,50 600,55 700,30"
              fill="none"
              stroke="#790f11"
              strokeWidth="1.5"
            />

            {/* Current point */}
            <circle cx="700" cy="30" r="3" fill="#790f11" />
            <circle cx="700" cy="30" r="6" fill="none" stroke="#790f11" strokeWidth="0.5" opacity="0.4" />

            <defs>
              <linearGradient id="eval-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#790f11" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#790f11" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* X labels */}
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
              <text key={day} x={i * 100 + 50} y="155" fill="#5c5848" fontSize="8" fontFamily="monospace" textAnchor="middle">
                {day}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Quick actions bar */}
      <div className="grid sm:grid-cols-3 gap-px bg-border">
        {[
          { icon: "+", label: "New Flag", desc: "Create a feature flag" },
          { icon: "~", label: "New Segment", desc: "Define a user segment" },
          { icon: "#", label: "Generate Key", desc: "Create an SDK key" },
        ].map((qa) => (
          <button
            key={qa.label}
            className="bg-bg-primary p-5 text-left hover:bg-bg-card transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 border border-border-lighter flex items-center justify-center font-mono text-sm text-text-muted group-hover:border-accent-red/30 group-hover:text-accent-red transition-colors">
                {qa.icon}
              </div>
              <span className="font-mono text-[0.65rem] text-text-primary uppercase tracking-wider group-hover:text-accent-red transition-colors">
                {qa.label}
              </span>
            </div>
            <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
              {qa.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
