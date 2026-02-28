"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";

function actionColor(action: string) {
  if (action.includes("toggled")) return "text-amber-400/70 border-amber-400/20 bg-amber-400/[0.04]";
  if (action.includes("created")) return "text-green-400/70 border-green-400/20 bg-green-400/[0.04]";
  if (action.includes("updated")) return "text-blue-400/70 border-blue-400/20 bg-blue-400/[0.04]";
  if (action.includes("archived")) return "text-text-muted/70 border-border bg-bg-card";
  return "text-text-muted border-border bg-bg-card";
}

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

type FilterType = "all" | "flag" | "segment" | "sdk_key" | "environment";

export default function AuditLogPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: logs, loading, error, refetch } = useApiData(
    () => (project ? api.listAuditLog(project.id, 50, 0) : Promise.resolve([])),
    [project?.id]
  );

  if (projectLoading || loading) return <LoadingState label="Loading audit log..." />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allLogs = logs ?? [];
  const filtered = filter === "all"
    ? allLogs
    : allLogs.filter((l) => l.entity_type === filter || l.action.startsWith(filter));

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Flags", value: "flag" },
    { label: "Segments", value: "segment" },
    { label: "SDK Keys", value: "sdk_key" },
    { label: "Environments", value: "environment" },
  ];

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
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`font-mono text-[0.55rem] uppercase tracking-wider px-3 py-1.5 border transition-colors ${
              filter === f.value
                ? "border-accent-red/30 text-accent-red bg-accent-red/[0.05]"
                : "border-border text-text-muted hover:text-text-secondary hover:border-border-lighter"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center">
          <p className="font-mono text-[0.6rem] text-text-muted">
            {allLogs.length === 0 ? "No audit log entries yet." : "No entries match this filter."}
          </p>
        </div>
      ) : (
        <div className="border border-border">
          <div className="grid grid-cols-[130px_100px_1fr_160px] min-w-[600px] px-5 py-2.5 border-b border-border bg-bg-card">
            {["Action", "Actor", "Details", "Timestamp"].map((h) => (
              <span key={h} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-border min-w-[600px]">
            {filtered.map((log) => (
              <div key={log.id} className="grid grid-cols-[130px_100px_1fr_160px] px-5 py-3 hover:bg-bg-card/30 transition-colors items-center">
                <span className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 border w-fit ${actionColor(log.action)}`}>
                  {log.action}
                </span>
                <span className="font-mono text-[0.55rem] text-text-secondary truncate pr-2">
                  {log.actor_email ? log.actor_email.split("@")[0] : "system"}
                </span>
                <div className="pr-4">
                  <span className="font-mono text-[0.6rem] text-text-primary">{log.entity_type}</span>
                  {log.entity_id && (
                    <span className="font-mono text-[0.5rem] text-text-muted ml-2">{log.entity_id}</span>
                  )}
                </div>
                <span className="font-mono text-[0.5rem] text-text-muted/50">{formatTimestamp(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
