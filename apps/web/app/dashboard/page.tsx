"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day ago`;
}

function activityType(action: string) {
  if (action.includes("toggled")) return "toggle";
  if (action.includes("created")) return "create";
  if (action.includes("updated")) return "update";
  if (action.includes("archived")) return "archive";
  if (action.includes("key")) return "key";
  return "update";
}

export default function DashboardOverview() {
  const { user, isLoaded } = useUser();
  const { project, api, loading: projectLoading } = useProject();

  const { data: flags, loading: flagsLoading, error: flagsError, refetch: refetchFlags } = useApiData(
    () => (project ? api.listFlags(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: environments, loading: envsLoading } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: auditLog, loading: logLoading } = useApiData(
    () => (project ? api.listAuditLog(project.id, 6, 0) : Promise.resolve([])),
    [project?.id]
  );

  const loading = projectLoading || flagsLoading || envsLoading || logLoading;

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (!project && !projectLoading) return <SetupPrompt />;
  if (flagsError) return <ErrorState message={flagsError} onRetry={refetchFlags} />;

  const stats: { label: string; value: string; change: string; trend: string }[] = [
    { label: "Total Flags", value: String(flags?.length ?? 0), change: "", trend: "flat" },
    { label: "Environments", value: String(environments?.length ?? 0), change: "", trend: "flat" },
    { label: "Evaluations (24h)", value: "—", change: "", trend: "flat" },
    { label: "Avg Latency", value: "—", change: "", trend: "flat" },
  ];

  const recentFlags = (flags ?? []).slice(0, 5);
  const activity = (auditLog ?? []).slice(0, 6);

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
              {s.change && (
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
              )}
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

          {recentFlags.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-mono text-[0.6rem] text-text-muted">No flags yet. Create your first flag to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentFlags.map((flag) => {
                const prodEnv = flag.environments?.find((e) => e.environment_slug === "production");
                const enabled = prodEnv?.enabled ?? flag.environments?.[0]?.enabled ?? false;
                return (
                  <div
                    key={flag.key}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-bg-card/50 transition-colors cursor-pointer group"
                  >
                    <div
                      className={`w-8 h-[18px] rounded-full p-[2px] transition-colors shrink-0 ${
                        enabled ? "bg-accent-red" : "bg-[#2a2720]"
                      }`}
                    >
                      <div
                        className={`w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                          enabled ? "translate-x-[14px]" : "translate-x-0"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[0.7rem] text-text-primary group-hover:text-accent-red transition-colors truncate">
                        {flag.key}
                      </div>
                      <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                        {flag.environments?.map((e) => e.environment_name).join(", ") || "—"}
                      </div>
                    </div>

                    <span className="font-mono text-[0.5rem] text-text-muted/60 uppercase tracking-wider border border-border px-1.5 py-0.5 hidden sm:block">
                      {flag.flag_type}
                    </span>

                    <span className="font-mono text-[0.5rem] text-text-muted shrink-0">
                      {timeAgo(flag.updated_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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

          {activity.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-mono text-[0.6rem] text-text-muted">No activity yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((a) => {
                const type = activityType(a.action);
                return (
                  <div key={a.id} className="px-5 py-3 hover:bg-bg-card/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center border ${
                          type === "toggle"
                            ? "border-accent-red/30 text-accent-red"
                            : type === "create"
                            ? "border-green-500/30 text-green-500"
                            : "border-border-lighter text-text-muted"
                        }`}
                      >
                        {type === "toggle" && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="3" /></svg>
                        )}
                        {type === "create" && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><line x1="4" y1="1" x2="4" y2="7" stroke="currentColor" strokeWidth="1.2" /><line x1="1" y1="4" x2="7" y2="4" stroke="currentColor" strokeWidth="1.2" /></svg>
                        )}
                        {type === "update" && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4h6M5 2l2 2-2 2" stroke="currentColor" strokeWidth="1" /></svg>
                        )}
                        {type === "key" && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="3" cy="4" r="2" stroke="currentColor" strokeWidth="0.8" /><line x1="5" y1="4" x2="7.5" y2="4" stroke="currentColor" strokeWidth="0.8" /></svg>
                        )}
                        {type === "archive" && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><rect x="1" y="1" width="6" height="2" stroke="currentColor" strokeWidth="0.8" /><rect x="2" y="3" width="4" height="4" stroke="currentColor" strokeWidth="0.8" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[0.6rem] text-text-primary">
                          {a.action}
                        </div>
                        <div className="font-mono text-[0.5rem] text-text-muted truncate">
                          {a.entity_type}: {a.entity_id || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 ml-8">
                      <span className="font-mono text-[0.5rem] text-text-muted/60">{a.actor_email || "System"}</span>
                      <span className="text-border-lighter text-[0.4rem]">|</span>
                      <span className="font-mono text-[0.5rem] text-text-muted/40">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
          <div className="flex items-center justify-center py-10">
            <span className="font-mono text-[0.6rem] text-text-muted">Evaluation metrics will appear once the SDK is integrated.</span>
          </div>
        </div>
      </div>

      {/* Quick actions bar */}
      <div className="grid sm:grid-cols-3 gap-px bg-border">
        {[
          { icon: "+", label: "New Flag", desc: "Create a feature flag", href: "/dashboard/flags" },
          { icon: "~", label: "New Segment", desc: "Define a user segment", href: "/dashboard/segments" },
          { icon: "#", label: "Generate Key", desc: "Create an SDK key", href: "/dashboard/sdk-keys" },
        ].map((qa) => (
          <Link
            key={qa.label}
            href={qa.href}
            className="bg-bg-primary p-5 text-left hover:bg-bg-card transition-colors group block"
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
          </Link>
        ))}
      </div>
    </div>
  );
}
