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

interface VariantInput {
  key: string;
  value: string;
  description: string;
}

const DEFAULT_BOOLEAN_VARIANTS: VariantInput[] = [
  { key: "true", value: "true", description: "Enabled" },
  { key: "false", value: "false", description: "Disabled" },
];

function parseVariantValue(value: string, flagType: string): unknown {
  if (flagType === "boolean") return value === "true";
  if (flagType === "number") return Number(value) || 0;
  if (flagType === "json") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export default function FlagsPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [search, setSearch] = useState("");
  const [filterEnv, setFilterEnv] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create flag form state
  const [newFlag, setNewFlag] = useState({
    key: "",
    name: "",
    description: "",
    flag_type: "boolean",
    tags: "",
  });
  const [variants, setVariants] = useState<VariantInput[]>([...DEFAULT_BOOLEAN_VARIANTS]);
  const [defaultVariantKey, setDefaultVariantKey] = useState("false");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete(flagKey: string) {
    setDeleting(true);
    try {
      await api.deleteFlag(project!.id, flagKey);
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function handleFlagTypeChange(type: string) {
    setNewFlag({ ...newFlag, flag_type: type });
    if (type === "boolean") {
      setVariants([...DEFAULT_BOOLEAN_VARIANTS]);
      setDefaultVariantKey("false");
    } else {
      setVariants([
        { key: "on", value: type === "number" ? "1" : "on", description: "" },
        { key: "off", value: type === "number" ? "0" : "off", description: "" },
      ]);
      setDefaultVariantKey("off");
    }
  }

  function addVariant() {
    setVariants([...variants, { key: "", value: "", description: "" }]);
  }

  function removeVariant(index: number) {
    if (variants.length <= 2) return;
    const next = variants.filter((_, i) => i !== index);
    setVariants(next);
    if (defaultVariantKey === variants[index].key) {
      setDefaultVariantKey(next[0]?.key || "");
    }
  }

  function updateVariant(index: number, field: keyof VariantInput, value: string) {
    const next = [...variants];
    next[index] = { ...next[index], [field]: value };
    setVariants(next);
  }

  function resetCreateForm() {
    setNewFlag({ key: "", name: "", description: "", flag_type: "boolean", tags: "" });
    setVariants([...DEFAULT_BOOLEAN_VARIANTS]);
    setDefaultVariantKey("false");
  }

  async function handleCreate() {
    if (!newFlag.key.trim() || !newFlag.name.trim()) return;
    if (variants.some((v) => !v.key.trim())) return;
    setCreating(true);
    try {
      await api.createFlag(project!.id, {
        key: newFlag.key.trim(),
        name: newFlag.name.trim(),
        description: newFlag.description.trim() || undefined,
        flag_type: newFlag.flag_type,
        tags: newFlag.tags ? newFlag.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        variants: variants.map((v) => ({
          key: v.key.trim(),
          value: parseVariantValue(v.value, newFlag.flag_type),
          description: v.description.trim() || undefined,
        })),
        default_variant_key: defaultVariantKey,
      });
      setShowCreate(false);
      resetCreateForm();
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
        <div className="grid grid-cols-[40px_1fr_80px_140px_200px_90px_40px] min-w-[750px] px-5 py-2.5 border-b border-border bg-bg-card">
          {["", "Flag", "Type", "Tags", "Environments", "Updated", ""].map((h, i) => (
            <span key={i} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border min-w-[750px]">
          {filtered.map((flag) => {
            const prodEnv = flag.environments?.find((e) => e.environment_slug === "production");
            const firstEnvEnabled = prodEnv?.enabled ?? flag.environments?.[0]?.enabled ?? false;
            return (
              <div
                key={flag.id}
                className={`grid grid-cols-[40px_1fr_80px_140px_200px_90px_40px] px-5 py-3 hover:bg-bg-card/50 transition-colors group items-center ${
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

                <div className="flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(flag.key); }}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all p-1"
                    title="Delete flag"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 3h8M4.5 3V2h3v1M3 3v7.5h6V3" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </button>
                </div>
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
      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetCreateForm(); }} title="Create Flag">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Flag Key</label>
              <input
                type="text"
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                placeholder="new-checkout-flow"
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Name</label>
              <input
                type="text"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="New Checkout Flow"
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Description</label>
            <textarea
              value={newFlag.description}
              onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              placeholder="What this flag controls..."
              rows={2}
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Type</label>
              <select
                value={newFlag.flag_type}
                onChange={(e) => handleFlagTypeChange(e.target.value)}
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full"
              >
                <option value="boolean">Boolean</option>
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Tags (comma-separated)</label>
              <input
                type="text"
                value={newFlag.tags}
                onChange={(e) => setNewFlag({ ...newFlag, tags: e.target.value })}
                placeholder="frontend, experiment"
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
              />
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">Variants</label>
              <button
                onClick={addVariant}
                className="font-mono text-[0.5rem] text-accent-red hover:text-accent-red-hover uppercase tracking-wider transition-colors"
              >
                + Add Variant
              </button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={v.key}
                      onChange={(e) => updateVariant(i, "key", e.target.value)}
                      placeholder="Variant key"
                      className="bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
                      readOnly={newFlag.flag_type === "boolean"}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => updateVariant(i, "value", e.target.value)}
                      placeholder="Value"
                      className="bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
                      readOnly={newFlag.flag_type === "boolean"}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={v.description}
                      onChange={(e) => updateVariant(i, "description", e.target.value)}
                      placeholder="Description"
                      className="bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
                    />
                  </div>
                  {variants.length > 2 && (
                    <button
                      onClick={() => removeVariant(i)}
                      className="text-text-muted hover:text-accent-red transition-colors p-1.5 mt-0.5"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                        <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Default variant */}
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Default Variant (served when flag is off)</label>
            <select
              value={defaultVariantKey}
              onChange={(e) => setDefaultVariantKey(e.target.value)}
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full"
            >
              {variants.filter((v) => v.key.trim()).map((v) => (
                <option key={v.key} value={v.key}>{v.key}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !newFlag.key.trim() || !newFlag.name.trim() || variants.some((v) => !v.key.trim())}
            className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Flag"}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Flag">
        <div className="space-y-4">
          <p className="font-mono text-[0.65rem] text-text-secondary">
            Are you sure you want to delete <span className="text-accent-red">{deleteTarget}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={deleting}
              className="flex-1 font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
