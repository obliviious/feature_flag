"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import { Modal } from "@/components/dashboard/Modal";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function FlagsPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [search, setSearch] = useState("");
  const [filterEnv, setFilterEnv] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", name: "", flag_type: "boolean", tags: "" });
  const [creating, setCreating] = useState(false);

  const { data: flags, loading, error, refetch } = useApiData(
    () => (project ? api.listFlags(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: environments } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  if (projectLoading || loading) return <LoadingState label="Loading flags..." />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (flags ?? []).filter((f) => {
    if (!showArchived && f.archived) return false;
    if (search && !f.key.includes(search) && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEnv !== "all") {
      const env = f.environments?.find((e) => e.environment_name === filterEnv);
      if (!env?.enabled) return false;
    }
    return true;
  });

  async function handleToggle(flagKey: string, envId: string, currentEnabled: boolean) {
    try {
      await api.toggleFlag(project!.id, flagKey, envId, !currentEnabled);
      refetch();
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  }

  async function handleCreate() {
    if (!newFlag.key.trim() || !newFlag.name.trim()) return;
    setCreating(true);
    try {
      const defaultVariants = newFlag.flag_type === "boolean"
        ? [{ key: "true", value: true }, { key: "false", value: false }]
        : [{ key: "on", value: "on" }, { key: "off", value: "off" }];

      await api.createFlag(project!.id, {
        key: newFlag.key.trim(),
        name: newFlag.name.trim(),
        flag_type: newFlag.flag_type,
        tags: newFlag.tags ? newFlag.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        variants: defaultVariants,
        default_variant_key: defaultVariants[1].key,
      });
      setShowCreate(false);
      setNewFlag({ key: "", name: "", flag_type: "boolean", tags: "" });
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
          <h1 className="font-serif text-2xl mb-1">Feature Flags</h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            {filtered.length} flags &bull; Manage toggles, targeting, and rollouts
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors flex items-center gap-2"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="6" y1="1" x2="6" y2="11" stroke="white" strokeWidth="1.5" />
            <line x1="1" y1="6" x2="11" y2="6" stroke="white" strokeWidth="1.5" />
          </svg>
          Create Flag
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-card border border-border flex-1 min-w-[200px] max-w-sm">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#555" strokeWidth="1.2" />
            <line x1="11" y1="11" x2="15" y2="15" stroke="#555" strokeWidth="1.2" />
          </svg>
          <input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent font-mono text-[0.65rem] text-text-primary placeholder:text-text-muted/50 outline-none flex-1 uppercase tracking-wider"
          />
        </div>

        <select
          value={filterEnv}
          onChange={(e) => setFilterEnv(e.target.value)}
          className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary uppercase tracking-wider outline-none cursor-pointer"
        >
          <option value="all">All Environments</option>
          {(environments ?? []).map((env) => (
            <option key={env.id} value={env.name}>{env.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-2 border font-mono text-[0.6rem] uppercase tracking-wider transition-colors ${
            showArchived
              ? "border-accent-red/30 text-accent-red bg-accent-red/[0.05]"
              : "border-border text-text-muted hover:text-text-secondary"
          }`}
        >
          {showArchived ? "Hide" : "Show"} Archived
        </button>
      </div>

      {/* Flags table */}
      <div className="border border-border overflow-x-auto">
        <div className="grid grid-cols-[40px_1fr_80px_140px_200px_90px] min-w-[700px] px-5 py-2.5 border-b border-border bg-bg-card">
          {["", "Flag", "Type", "Tags", "Environments", "Updated"].map((h) => (
            <span key={h} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border min-w-[700px]">
          {filtered.map((flag) => {
            const prodEnv = flag.environments?.find((e) => e.environment_slug === "production");
            const firstEnvEnabled = prodEnv?.enabled ?? flag.environments?.[0]?.enabled ?? false;
            return (
              <div
                key={flag.id}
                className={`grid grid-cols-[40px_1fr_80px_140px_200px_90px] px-5 py-3 hover:bg-bg-card/50 transition-colors cursor-pointer group items-center ${
                  flag.archived ? "opacity-50" : ""
                }`}
              >
                <div>
                  <button
                    onClick={() => {
                      const envTarget = prodEnv ?? flag.environments?.[0];
                      if (envTarget) handleToggle(flag.key, envTarget.environment_id, envTarget.enabled);
                    }}
                    className={`w-7 h-4 rounded-full p-[2px] transition-colors ${
                      firstEnvEnabled ? "bg-accent-red" : "bg-[#2a2720]"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${firstEnvEnabled ? "translate-x-3" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="min-w-0 pr-4">
                  <div className="font-mono text-[0.7rem] text-text-primary group-hover:text-accent-red transition-colors truncate">{flag.key}</div>
                  <div className="font-mono text-[0.5rem] text-text-muted truncate">{flag.name}</div>
                </div>

                <span className="font-mono text-[0.5rem] text-text-muted/70 uppercase tracking-wider border border-border px-1.5 py-0.5 w-fit">{flag.flag_type}</span>

                <div className="flex gap-1 flex-wrap">
                  {flag.tags.map((tag) => (
                    <span key={tag} className="font-mono text-[0.45rem] text-text-muted uppercase tracking-wider bg-bg-card border border-border px-1.5 py-0.5">{tag}</span>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  {(flag.environments ?? []).map((env) => (
                    <div key={env.environment_id} className="flex items-center gap-1" title={`${env.environment_name}: ${env.enabled ? "ON" : "OFF"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${env.enabled ? "bg-green-500" : "bg-[#333]"}`} />
                      <span className="font-mono text-[0.45rem] text-text-muted uppercase">{env.environment_name.slice(0, 4)}</span>
                    </div>
                  ))}
                </div>

                <span className="font-mono text-[0.5rem] text-text-muted/60 text-right">{timeAgo(flag.updated_at)}</span>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <span className="font-mono text-[0.6rem] text-text-muted uppercase tracking-wider">
              {(flags ?? []).length === 0 ? "No flags yet. Create your first flag to get started." : "No flags match your filters."}
            </span>
          </div>
        )}
      </div>

      {/* Create Flag Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Flag">
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Flag Key</label>
            <input type="text" value={newFlag.key} onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })} placeholder="e.g. new-checkout-flow" className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors" />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Name</label>
            <input type="text" value={newFlag.name} onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })} placeholder="e.g. New Checkout Flow" className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors" />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Type</label>
            <select value={newFlag.flag_type} onChange={(e) => setNewFlag({ ...newFlag, flag_type: e.target.value })} className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full">
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Tags (comma-separated)</label>
            <input type="text" value={newFlag.tags} onChange={(e) => setNewFlag({ ...newFlag, tags: e.target.value })} placeholder="e.g. frontend, experiment" className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors" />
          </div>
          <button onClick={handleCreate} disabled={creating || !newFlag.key.trim() || !newFlag.name.trim()} className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50">
            {creating ? "Creating..." : "Create Flag"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
