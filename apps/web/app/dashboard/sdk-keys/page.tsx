"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import { Modal } from "@/components/dashboard/Modal";

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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SDKKeysPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState({ name: "", key_type: "server", environment_id: "" });
  const [creating, setCreating] = useState(false);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);

  const { data: keys, loading, error, refetch } = useApiData(
    () => (project ? api.listSdkKeys(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: environments } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  if (projectLoading || loading) return <LoadingState label="Loading SDK keys..." />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allKeys = (keys ?? []).filter((k) => !k.revoked_at);
  const envMap = new Map((environments ?? []).map((e) => [e.id, e]));

  async function handleRevoke(keyId: string) {
    try {
      await api.revokeSdkKey(project!.id, keyId);
      refetch();
    } catch (e) {
      console.error("Revoke failed:", e);
    }
  }

  async function handleCreate() {
    if (!newKey.name.trim() || !newKey.environment_id) return;
    setCreating(true);
    try {
      const result = await api.createSdkKey(project!.id, {
        environment_id: newKey.environment_id,
        name: newKey.name.trim(),
        key_type: newKey.key_type,
      });
      setCreatedRawKey(result.raw_key);
      setNewKey({ name: "", key_type: "server", environment_id: "" });
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
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
        <button
          onClick={() => { setShowCreate(true); setCreatedRawKey(null); }}
          className="font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors flex items-center gap-2"
        >
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
          <p className="font-mono text-[0.6rem] text-text-muted">No SDK keys yet. Generate a key to get started.</p>
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
                      {k.key_prefix}{"•".repeat(18)}
                    </div>
                  </div>
                  <span className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 w-fit ${
                    isServer ? "text-accent-red border border-accent-red/20 bg-accent-red/[0.04]" : "text-blue-400/70 border border-blue-400/20 bg-blue-400/[0.04]"
                  }`}>
                    {isServer ? "Server" : "Client"}
                  </span>
                  <span className="font-mono text-[0.6rem] text-text-secondary">{env?.name ?? "—"}</span>
                  <span className="font-mono text-[0.5rem] text-text-muted">{formatDate(k.created_at)}</span>
                  <span className="font-mono text-[0.5rem] text-text-muted/60">{timeAgo(k.last_used_at)}</span>
                  <button onClick={() => handleRevoke(k.id)} className="font-mono text-[0.5rem] text-accent-red/60 hover:text-accent-red transition-colors uppercase tracking-wider">Revoke</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generate Key Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Generate SDK Key">
        {createdRawKey ? (
          <div className="space-y-4">
            <p className="font-mono text-[0.55rem] text-green-400">Key created successfully! Copy it now — it won&apos;t be shown again.</p>
            <div className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary break-all select-all">{createdRawKey}</div>
            <button onClick={() => { navigator.clipboard.writeText(createdRawKey); }} className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 border border-border text-text-primary hover:bg-bg-card transition-colors">Copy to Clipboard</button>
            <button onClick={() => setShowCreate(false)} className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Name</label>
              <input type="text" value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })} placeholder="e.g. Production Server Key" className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors" />
            </div>
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Type</label>
              <select value={newKey.key_type} onChange={(e) => setNewKey({ ...newKey, key_type: e.target.value })} className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full">
                <option value="server">Server (srv_)</option>
                <option value="client">Client (cli_)</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Environment</label>
              <select value={newKey.environment_id} onChange={(e) => setNewKey({ ...newKey, environment_id: e.target.value })} className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full">
                <option value="">Select environment...</option>
                {(environments ?? []).map((env) => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
            </div>
            <button onClick={handleCreate} disabled={creating || !newKey.name.trim() || !newKey.environment_id} className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50">
              {creating ? "Generating..." : "Generate Key"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
