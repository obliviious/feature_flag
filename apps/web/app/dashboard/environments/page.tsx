"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import { Modal } from "@/components/dashboard/Modal";

const ENV_COLORS = [
  { label: "Green", value: "#22c55e" },
  { label: "Yellow", value: "#eab308" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Orange", value: "#f97316" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Pink", value: "#ec4899" },
];

export default function EnvironmentsPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [showCreate, setShowCreate] = useState(false);
  const [newEnv, setNewEnv] = useState({ name: "", slug: "", color: "#3b82f6" });
  const [creating, setCreating] = useState(false);

  const { data: environments, loading, error, refetch } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: flags } = useApiData(
    () => (project ? api.listFlags(project.id) : Promise.resolve([])),
    [project?.id]
  );

  if (projectLoading || loading) return <LoadingState label="Loading environments..." />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const envs = environments ?? [];
  const allFlags = flags ?? [];

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreate() {
    if (!newEnv.name.trim() || !newEnv.slug.trim()) return;
    setCreating(true);
    try {
      await api.createEnvironment(project!.id, {
        name: newEnv.name.trim(),
        slug: newEnv.slug.trim(),
        color: newEnv.color || undefined,
      });
      setShowCreate(false);
      setNewEnv({ name: "", slug: "", color: "#3b82f6" });
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
          <h1 className="font-serif text-2xl mb-1">Environments</h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            {envs.length} environments &bull; Isolated deployment targets with independent flag states
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
          Add Environment
        </button>
      </div>

      {envs.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center">
          <p className="font-mono text-[0.6rem] text-text-muted">
            No environments yet. Click &quot;Add Environment&quot; to create one.
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-px bg-border">
            {envs.map((env) => (
              <div key={env.slug} className="bg-bg-primary p-6 hover:bg-bg-card/50 transition-colors group">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: env.color || "#555" }} />
                  <h2 className="font-serif text-lg text-text-primary group-hover:text-accent-red transition-colors">
                    {env.name}
                  </h2>
                </div>

                <div className="font-mono text-[0.6rem] text-text-muted bg-bg-card border border-border px-2.5 py-1.5 mb-5 inline-block">
                  {env.slug}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Flags", val: allFlags.length },
                    { label: "Order", val: env.sort_order },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="font-serif text-lg text-text-primary">{s.val}</div>
                      <div className="font-mono text-[0.45rem] text-text-muted uppercase tracking-[0.16em]">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                    SSE streaming active
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Environment config comparison */}
          {allFlags.length > 0 && (
            <div className="border border-border">
              <div className="px-5 py-3 border-b border-border bg-bg-card">
                <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
                  Flag State Comparison
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-2.5 font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">Flag</th>
                      {envs.map((env) => (
                        <th key={env.slug} className="text-center px-4 py-2.5 font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: env.color || "#555" }} />
                            {env.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allFlags.map((flag) => (
                      <tr key={flag.key} className="hover:bg-bg-card/30 transition-colors">
                        <td className="px-5 py-2.5 font-mono text-[0.6rem] text-text-primary">{flag.key}</td>
                        {envs.map((env) => {
                          const envState = flag.environments?.find(
                            (fe) => fe.environment_id === env.id
                          );
                          const on = envState?.enabled ?? false;
                          return (
                            <td key={env.id} className="text-center px-4 py-2.5">
                              <span className={`inline-block font-mono text-[0.5rem] uppercase tracking-wider px-2 py-0.5 ${
                                on ? "text-green-500 bg-green-500/[0.06] border border-green-500/20" : "text-text-muted/50 bg-bg-card border border-border"
                              }`}>
                                {on ? "ON" : "OFF"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Environment Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Environment">
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Name</label>
            <input
              type="text"
              value={newEnv.name}
              onChange={(e) => setNewEnv({ ...newEnv, name: e.target.value, slug: autoSlug(e.target.value) })}
              placeholder="e.g. QA, Canary, Preview"
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
            />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Slug</label>
            <input
              type="text"
              value={newEnv.slug}
              onChange={(e) => setNewEnv({ ...newEnv, slug: e.target.value })}
              placeholder="e.g. qa, canary, preview"
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
            />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {ENV_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewEnv({ ...newEnv, color: c.value })}
                  className={`w-7 h-7 border-2 transition-colors ${
                    newEnv.color === c.value ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newEnv.name.trim() || !newEnv.slug.trim()}
            className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Environment"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
