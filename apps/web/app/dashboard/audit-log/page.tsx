"use client";

import { useCallback, useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import {
  AUDIT_ACTIONS,
  AUDIT_SEVERITIES,
  type AuditLogEntry,
  type AuditLogQuery,
} from "@/lib/api";

function actionColor(action: string) {
  if (action.includes("toggled")) return "text-amber-400/70 border-amber-400/20 bg-amber-400/[0.04]";
  if (action.includes("created")) return "text-green-400/70 border-green-400/20 bg-green-400/[0.04]";
  if (action.includes("updated")) return "text-blue-400/70 border-blue-400/20 bg-blue-400/[0.04]";
  if (action.includes("deleted") || action.includes("revoked"))
    return "text-accent-red/70 border-accent-red/20 bg-accent-red/[0.04]";
  return "text-text-muted border-border bg-bg-card";
}

function severityColor(severity: string) {
  if (severity === "critical") return "text-accent-red border-accent-red/30";
  if (severity === "warning") return "text-amber-400 border-amber-400/30";
  return "text-text-muted border-border";
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

function AuditLogRow({ log }: { log: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const changes = log.diff?.changes ?? [];
  const actor = log.actor_email || log.actor_name || log.actor_type || "system";

  return (
    <>
      <div
        className="grid grid-cols-[120px_70px_100px_1fr_140px] px-5 py-3 hover:bg-bg-card/30 transition-colors items-start cursor-pointer min-w-[700px]"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 border w-fit ${actionColor(log.action)}`}
        >
          {log.action.replace(/_/g, " ")}
        </span>
        <span
          className={`font-mono text-[0.45rem] uppercase tracking-wider px-1.5 py-0.5 border w-fit ${severityColor(log.severity)}`}
        >
          {log.severity}
        </span>
        <span className="font-mono text-[0.55rem] text-text-secondary truncate pr-2">
          {typeof actor === "string" && actor.includes("@") ? actor.split("@")[0] : actor}
        </span>
        <div className="pr-4 min-w-0">
          <span className="font-mono text-[0.6rem] text-text-primary">{log.entity_type}</span>
          {log.environment_name && (
            <span className="font-mono text-[0.5rem] text-text-muted ml-2">
              @ {log.environment_name}
            </span>
          )}
          {changes.length > 0 && (
            <span className="font-mono text-[0.5rem] text-accent-red/60 ml-2">
              {changes.length} change{changes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="font-mono text-[0.5rem] text-text-muted/50">
          {formatTimestamp(log.created_at)}
        </span>
      </div>

      {expanded && (
        <div className="px-5 py-4 bg-bg-card/20 border-t border-border/50 space-y-4 min-w-[700px]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-[0.55rem]">
            <MetaField label="Actor" value={log.actor_email || log.actor_name || "—"} />
            <MetaField label="Actor Type" value={log.actor_type || "—"} />
            <MetaField label="IP Address" value={log.ip_address || "—"} />
            <MetaField label="Request ID" value={log.request_id || "—"} mono />
          </div>

          {log.user_agent && (
            <MetaField label="User Agent" value={log.user_agent} mono block />
          )}

          {changes.length > 0 && (
            <div>
              <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider mb-2">
                Changes
              </div>
              <div className="border border-border divide-y divide-border">
                {changes.map((c, i) => (
                  <div key={i} className="px-4 py-2.5 grid sm:grid-cols-[140px_1fr_1fr_80px] gap-2">
                    <span className="font-mono text-[0.55rem] text-accent-red">{c.field}</span>
                    <span className="font-mono text-[0.5rem] text-text-muted truncate">
                      {JSON.stringify(c.before)}
                    </span>
                    <span className="font-mono text-[0.5rem] text-text-primary truncate">
                      {JSON.stringify(c.after)}
                    </span>
                    <span className="font-mono text-[0.45rem] text-text-muted uppercase">
                      {c.kind}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(log.before_state != null || log.after_state != null) && changes.length === 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {log.before_state != null && (
                <JsonBlock label="Before" data={log.before_state} />
              )}
              {log.after_state != null && (
                <JsonBlock label="After" data={log.after_state} />
              )}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

function MetaField({
  label,
  value,
  mono,
  block,
}: {
  label: string;
  value: string;
  mono?: boolean;
  block?: boolean;
}) {
  return (
    <div className={block ? "col-span-full" : ""}>
      <div className="text-text-muted uppercase tracking-wider text-[0.45rem] mb-0.5">{label}</div>
      <div className={`${mono ? "break-all" : "truncate"} text-text-secondary`}>{value}</div>
    </div>
  );
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  return (
    <div>
      <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <pre className="font-mono text-[0.5rem] text-text-secondary bg-bg-card border border-border p-3 overflow-x-auto max-h-40">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [filters, setFilters] = useState<AuditLogQuery>({ limit: 50, offset: 0 });
  const [page, setPage] = useState(0);

  const queryKey = JSON.stringify({ ...filters, page });

  const fetchLogs = useCallback(() => {
    if (!project) return Promise.resolve([]);
    return api.listAuditLog(project.id, {
      ...filters,
      offset: page * (filters.limit ?? 50),
    });
  }, [project, api, filters, page]);

  const { data: logs, loading, error, refetch } = useApiData(fetchLogs, [project?.id, queryKey]);

  if (projectLoading || loading) return <LoadingState label="Loading audit log..." />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allLogs = logs ?? [];
  const pageSize = filters.limit ?? 50;

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      <div>
        <h1 className="font-serif text-2xl mb-1">Audit Log</h1>
        <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
          Complete history with actor context, diffs, and severity
        </p>
      </div>

      {/* Server-side filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FilterSelect
          label="Entity Type"
          value={filters.entity_type ?? ""}
          onChange={(v) => {
            setPage(0);
            setFilters({ ...filters, entity_type: v || undefined });
          }}
          options={[
            { value: "", label: "All types" },
            { value: "flag", label: "Flag" },
            { value: "segment", label: "Segment" },
            { value: "sdk_key", label: "SDK Key" },
            { value: "environment", label: "Environment" },
            { value: "project", label: "Project" },
          ]}
        />
        <FilterSelect
          label="Action"
          value={filters.action ?? ""}
          onChange={(v) => {
            setPage(0);
            setFilters({ ...filters, action: v || undefined });
          }}
          options={[
            { value: "", label: "All actions" },
            ...AUDIT_ACTIONS.map((a) => ({ value: a, label: a.replace(/_/g, " ") })),
          ]}
        />
        <FilterSelect
          label="Severity"
          value={filters.severity ?? ""}
          onChange={(v) => {
            setPage(0);
            setFilters({ ...filters, severity: v || undefined });
          }}
          options={[
            { value: "", label: "All severities" },
            ...AUDIT_SEVERITIES.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          label="Time Range"
          value={filters.since_hours?.toString() ?? ""}
          onChange={(v) => {
            setPage(0);
            setFilters({
              ...filters,
              since_hours: v ? Number(v) : undefined,
            });
          }}
          options={[
            { value: "", label: "All time" },
            { value: "1", label: "Last hour" },
            { value: "24", label: "Last 24 hours" },
            { value: "168", label: "Last 7 days" },
            { value: "720", label: "Last 30 days" },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by actor email..."
          value={filters.actor_email ?? ""}
          onChange={(e) => {
            setPage(0);
            setFilters({ ...filters, actor_email: e.target.value || undefined });
          }}
          className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-primary outline-none flex-1 max-w-xs focus:border-accent-red/50"
        />
      </div>

      {allLogs.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center">
          <p className="font-mono text-[0.6rem] text-text-muted">No audit log entries match your filters.</p>
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[120px_70px_100px_1fr_140px] min-w-[700px] px-5 py-2.5 border-b border-border bg-bg-card">
            {["Action", "Severity", "Actor", "Details", "Timestamp"].map((h) => (
              <span
                key={h}
                className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]"
              >
                {h}
              </span>
            ))}
          </div>
          <div className="divide-y divide-border">
            {allLogs.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.55rem] text-text-muted">
          Page {page + 1} · showing up to {pageSize} entries
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2 border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <button
            disabled={allLogs.length < pageSize}
            onClick={() => setPage((p) => p + 1)}
            className="font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2 border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="font-mono text-[0.45rem] text-text-muted uppercase tracking-wider mb-1 block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
