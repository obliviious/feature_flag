"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SDKKeysPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const { data: keys, loading, error, refetch } = useApiData(
    () => (project ? api.listSdkKeys(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: environments } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  if (projectLoading || loading) return <LoadingState label="Loading SDK keys..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allKeys = (keys ?? []).filter((k) => !k.revoked_at);
  const envMap = new Map((environments ?? []).map((e) => [e.id, e]));

  async function handleRevoke(keyId: string) {
    if (!project) return;
    try {
      await api.revokeSdkKey(project.id, keyId);
      refetch();
    } catch (e) {
      console.error("Revoke failed:", e);
    }
  }

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

      {allKeys.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center">
          <p className="font-mono text-[0.6rem] text-text-muted">No SDK keys yet. Run setup or generate a key to get started.</p>
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[1fr_80px_110px_110px_100px_60px] min-w-[600px] px-5 py-2.5 border-b border-border bg-bg-card">
            {["Key", "Type", "Environment", "Created", "Last Used", ""].map((h) => (
              <span key={h} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-border min-w-[600px]">
            {allKeys.map((k) => {
              const env = envMap.get(k.environment_id);
              const isServer = k.key_type === "server";
              return (
                <div key={k.id} className="grid grid-cols-[1fr_80px_110px_110px_100px_60px] px-5 py-3 hover:bg-bg-card/50 transition-colors items-center">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[0.7rem] text-text-primary bg-bg-card border border-border px-2.5 py-1">
                      {revealedKey === k.id
                        ? `${k.key_prefix}${"•".repeat(16)}`
                        : `${k.key_prefix}${"•".repeat(20)}`}
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

                  <span className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 w-fit ${
                    isServer
                      ? "text-accent-red border border-accent-red/20 bg-accent-red/[0.04]"
                      : "text-blue-400/70 border border-blue-400/20 bg-blue-400/[0.04]"
                  }`}>
                    {isServer ? "Server" : "Client"}
                  </span>

                  <span className="font-mono text-[0.6rem] text-text-secondary">{env?.name ?? "—"}</span>
                  <span className="font-mono text-[0.5rem] text-text-muted">{formatDate(k.created_at)}</span>
                  <span className="font-mono text-[0.5rem] text-text-muted/60">{timeAgo(k.last_used_at)}</span>

                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="font-mono text-[0.5rem] text-accent-red/60 hover:text-accent-red transition-colors uppercase tracking-wider"
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
