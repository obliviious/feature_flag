"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";

function formatHeartbeat(ts: number | null) {
  if (!ts) return "—";
  const diff = Date.now() - ts * 1000;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function SdkConnectionsPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [windowSecs, setWindowSecs] = useState(60);

  const { data, loading, error, refetch } = useApiData(
    () =>
      project
        ? api.listSdkConnections(project.id, windowSecs)
        : Promise.resolve(null),
    [project?.id, windowSecs]
  );

  if (projectLoading || loading) return <LoadingState label="Loading SDK connections..." />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const connections = data!;

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl mb-1">SDK Connections</h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            Live SDK instances reporting heartbeats
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={windowSecs}
            onChange={(e) => setWindowSecs(Number(e.target.value))}
            className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary uppercase tracking-wider outline-none"
          >
            <option value={60}>Last 60s</option>
            <option value={300}>Last 5 min</option>
            <option value={900}>Last 15 min</option>
            <option value={3600}>Last 1 hour</option>
          </select>
          <button
            onClick={refetch}
            className="font-mono text-[0.6rem] uppercase tracking-wider px-4 py-2 border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {!connections.tracking_enabled && (
        <div className="border border-amber-400/20 bg-amber-400/[0.04] px-5 py-3">
          <p className="font-mono text-[0.55rem] text-amber-400/80">
            Connection tracking requires Redis on the server. Heartbeats are accepted but not stored.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {[
          { label: "Active Instances", value: String(connections.total_active_instances) },
          { label: "Envs Connected", value: String(connections.environments_with_connections) },
          { label: "Envs Idle", value: String(connections.environments_without_connections) },
          { label: "Window", value: `${connections.active_window_secs}s` },
        ].map((s) => (
          <div key={s.label} className="bg-bg-primary p-5">
            <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-2">
              {s.label}
            </div>
            <span className="font-serif text-2xl text-text-primary">{s.value}</span>
          </div>
        ))}
      </div>

      {connections.environments.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center">
          <p className="font-mono text-[0.6rem] text-text-muted">No environments in this project.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.environments.map((env) => (
            <div key={env.environment_id} className="border border-border">
              <div className="px-5 py-3 border-b border-border bg-bg-card flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      env.active_count > 0 ? "bg-green-500 animate-pulse" : "bg-[#333]"
                    }`}
                  />
                  <span className="font-mono text-[0.65rem] text-text-primary uppercase tracking-wider">
                    {env.environment_name}
                  </span>
                  <span className="font-mono text-[0.5rem] text-text-muted">{env.environment_slug}</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[0.5rem] text-text-muted">
                  <span>{env.active_count} active</span>
                  <span>Last heartbeat: {formatHeartbeat(env.last_heartbeat_ts)}</span>
                </div>
              </div>

              {env.active_instances.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="font-mono text-[0.55rem] text-text-muted">
                    No SDK instances connected in the last {connections.active_window_secs}s
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[1fr_90px_90px_90px_100px] min-w-[550px] px-5 py-2 border-b border-border bg-bg-card/50">
                    {["Instance ID", "Version", "Type", "Runtime", "Last Seen"].map((h) => (
                      <span
                        key={h}
                        className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  <div className="divide-y divide-border min-w-[550px]">
                    {env.active_instances.map((inst) => (
                      <div
                        key={inst.sdk_instance_id}
                        className="grid grid-cols-[1fr_90px_90px_90px_100px] px-5 py-2.5 hover:bg-bg-card/30 items-center"
                      >
                        <span className="font-mono text-[0.6rem] text-text-primary truncate pr-2">
                          {inst.sdk_instance_id}
                        </span>
                        <span className="font-mono text-[0.55rem] text-text-secondary">
                          {inst.sdk_version}
                        </span>
                        <span
                          className={`font-mono text-[0.5rem] uppercase w-fit px-1.5 py-0.5 border ${
                            inst.key_type === "server"
                              ? "text-accent-red border-accent-red/20 bg-accent-red/[0.04]"
                              : "text-blue-400/70 border-blue-400/20 bg-blue-400/[0.04]"
                          }`}
                        >
                          {inst.key_type}
                        </span>
                        <span className="font-mono text-[0.55rem] text-text-muted">{inst.runtime}</span>
                        <span className="font-mono text-[0.5rem] text-text-muted/60">
                          {formatHeartbeat(inst.last_heartbeat_ts)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
