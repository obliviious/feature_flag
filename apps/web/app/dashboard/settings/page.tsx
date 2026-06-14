"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import { Modal } from "@/components/dashboard/Modal";
import { CodeSnippet } from "@/components/dashboard/CodeSnippet";
import {
  buildGithubSecretsList,
  buildScanCommand,
  buildScanScriptEnv,
} from "@/lib/lifecycle-snippets";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { project, api, loading: projectLoading } = useProject();

  const { data: projectDetail, loading: projectDetailLoading } = useApiData(
    () => (project ? api.getProject(project.id) : Promise.resolve(null)),
    [project?.id]
  );

  const { data: environments, loading: envsLoading } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: health, loading: healthLoading } = useApiData(
    () => api.getHealth(),
    []
  );

  const { data: connections } = useApiData(
    () => (project ? api.listSdkConnections(project.id, 60) : Promise.resolve(null)),
    [project?.id]
  );

  if (projectLoading || envsLoading || projectDetailLoading) {
    return <LoadingState label="Loading settings..." />;
  }
  if (!project) return <SetupPrompt />;

  const detail = projectDetail ?? project;

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-8">
      <div>
        <h1 className="font-serif text-2xl mb-1">Settings</h1>
        <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
          Project configuration and account preferences
        </p>
      </div>

      {/* Server health */}
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            Server Status
          </span>
        </div>
        <div className="p-5 grid sm:grid-cols-3 gap-4">
          <SettingsField
            label="Status"
            value={healthLoading ? "..." : health?.status ?? "unknown"}
            highlight={health?.status === "healthy" ? "green" : health?.status === "degraded" ? "amber" : undefined}
          />
          <SettingsField label="Version" value={healthLoading ? "..." : health?.version ?? "—"} mono />
          <SettingsField label="Database" value={healthLoading ? "..." : health?.database ?? "—"} mono />
        </div>
      </section>

      {/* Profile section */}
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            Profile
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <SettingsField label="Name" value={isLoaded ? (user?.fullName || "—") : "..."} />
            <SettingsField label="Email" value={isLoaded ? (user?.primaryEmailAddress?.emailAddress || "—") : "..."} />
          </div>
          <SettingsField label="User ID" value={isLoaded ? (user?.id || "—") : "..."} mono />
        </div>
      </section>

      {/* Project section */}
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            Project
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <SettingsField label="Project Name" value={detail.name} />
            <SettingsField label="Project Slug" value={detail.slug} mono />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <SettingsField label="Project ID" value={detail.id} mono />
            <SettingsField label="Organization ID" value={detail.organization_id} mono />
          </div>
          {detail.description && (
            <SettingsField label="Description" value={detail.description} />
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <SettingsField label="Created" value={new Date(detail.created_at).toLocaleString()} mono />
            <SettingsField label="Updated" value={new Date(detail.updated_at).toLocaleString()} mono />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">
              Environments
            </label>
            <div className="flex gap-2 flex-wrap">
              {(environments ?? []).map((env) => (
                <span
                  key={env.id}
                  className="font-mono text-[0.6rem] text-text-secondary bg-bg-card border border-border px-3 py-1.5 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: env.color || "#555" }} />
                  {env.name}
                </span>
              ))}
              {(environments ?? []).length === 0 && (
                <span className="font-mono text-[0.55rem] text-text-muted">No environments</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Management API keys for CI */}
      <ManagementKeysSection projectId={detail.id} />

      {/* API section */}
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            API Endpoints
          </span>
        </div>
        <div className="p-5 space-y-3 font-mono text-[0.55rem] text-text-secondary">
          <EndpointRow method="GET" path="/api/v1/flags-config" note="SDK config snapshot" />
          <EndpointRow method="GET" path="/api/v1/stream" note="SSE config + delta updates" />
          <EndpointRow method="POST" path="/api/v1/heartbeat" note="SDK connection tracking" />
          <EndpointRow method="POST" path="/api/v1/evaluate" note="Remote flag evaluation" />
          <EndpointRow method="GET" path="/api/v1/projects/{id}/sdk-connections" note="Active SDK instances" />
          <EndpointRow method="GET" path="/api/v1/projects/{id}/audit-log" note="Audit trail with filters" />
        </div>
        {connections && (
          <div className="px-5 pb-5">
            <SettingsField
              label="SDK Tracking"
              value={
                connections.tracking_enabled
                  ? `${connections.total_active_instances} active instance(s) in last 60s`
                  : "Disabled (Redis unavailable)"
              }
            />
          </div>
        )}
      </section>

      {/* Not yet available */}
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-muted uppercase tracking-wider">
            Not Yet Available
          </span>
        </div>
        <div className="p-5 space-y-3 font-mono text-[0.55rem] text-text-muted">
          <p>Webhooks — no backend API yet</p>
          <p>Delete project — no backend API yet</p>
          <p>Segment / environment update & delete — no backend API yet</p>
          <p>Flag targeting rules management — no backend API yet</p>
        </div>
      </section>
    </div>
  );
}

function SettingsField({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "green" | "amber";
}) {
  const color =
    highlight === "green"
      ? "text-green-400"
      : highlight === "amber"
      ? "text-amber-400"
      : "text-text-secondary";

  return (
    <div>
      <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5">{label}</div>
      <div className={`${mono ? "font-mono text-[0.65rem]" : "text-sm"} ${color} bg-bg-card border border-border px-3 py-2`}>
        {value}
      </div>
    </div>
  );
}

function EndpointRow({ method, path, note }: { method: string; path: string; note: string }) {
  return (
    <div className="flex items-start gap-3 flex-wrap">
      <span className="text-accent-red w-12 shrink-0">{method}</span>
      <span className="text-text-primary flex-1 min-w-[200px]">{path}</span>
      <span className="text-text-muted/60">{note}</span>
    </div>
  );
}

function ManagementKeysSection({ projectId }: { projectId: string }) {
  const { api } = useProject();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);

  const { data: keys, loading, refetch } = useApiData(
    () => api.listManagementKeys(projectId),
    [projectId]
  );

  const active = (keys ?? []).filter((k) => !k.revoked_at);
  const revoked = (keys ?? []).filter((k) => k.revoked_at);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const result = await api.createManagementKey(projectId, { name: name.trim() });
      setCreatedRawKey(result.raw_key);
      setName("");
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Revoke this management key? CI jobs using it will fail.")) return;
    try {
      await api.revokeManagementKey(projectId, keyId);
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Revoke failed");
    }
  }

  const snippetCtx = { projectId, apiUrl: "https://your-flagforge-host.example.com" };

  return (
    <>
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
              CI / Management Keys
            </span>
            <p className="font-mono text-[0.5rem] text-text-muted mt-1 max-w-xl">
              Project-scoped mgmt_ keys for CI (code-ref scanning). Header:{" "}
              <code className="text-text-secondary">Authorization: mgmt_...</code> (no Bearer).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setCreatedRawKey(null);
            }}
            className="font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2 bg-accent-red text-white hover:bg-accent-red-hover transition-colors"
          >
            Generate Key
          </button>
        </div>
        <div className="p-5 space-y-4">
          {loading ? (
            <p className="font-mono text-[0.55rem] text-text-muted">Loading keys…</p>
          ) : active.length === 0 ? (
            <p className="font-mono text-[0.55rem] text-text-muted">
              No management keys yet. Create one for your CI scanner.
            </p>
          ) : (
            <div className="space-y-2">
              {active.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 border border-border px-3 py-2 bg-bg-card flex-wrap"
                >
                  <div>
                    <div className="font-mono text-[0.6rem] text-text-primary">{k.name}</div>
                    <div className="font-mono text-[0.5rem] text-text-muted">
                      {k.key_prefix}… · last used{" "}
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(k.id)}
                    className="font-mono text-[0.45rem] uppercase tracking-wider text-text-muted hover:text-accent-red border border-border px-2 py-1"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
          {revoked.length > 0 && (
            <p className="font-mono text-[0.5rem] text-text-muted">
              {revoked.length} revoked key(s)
            </p>
          )}

          <div className="space-y-3 pt-2">
            <CodeSnippet
              title="Environment variables"
              description="Use with scripts/scan-flag-refs.sh in your app repo or CI."
              code={buildScanScriptEnv(snippetCtx)}
            />
            <CodeSnippet title="Run scanner" code={buildScanCommand()} />
            <CodeSnippet title="GitHub Actions secrets" code={buildGithubSecretsList()} />
          </div>
        </div>
      </section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Generate Management Key">
        {createdRawKey ? (
          <div className="space-y-4">
            <p className="font-mono text-[0.55rem] text-yellow-400">
              Copy this key now — it won&apos;t be shown again.
            </p>
            <pre className="bg-bg-primary border border-border p-3 font-mono text-[0.55rem] text-text-primary break-all whitespace-pre-wrap">
              {createdRawKey}
            </pre>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(createdRawKey)}
              className="w-full font-mono text-[0.55rem] uppercase tracking-wider py-2 border border-border text-text-muted hover:text-text-primary"
            >
              Copy to clipboard
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="w-full font-mono text-[0.55rem] uppercase tracking-wider py-2.5 bg-accent-red text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">
                Key name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="github-actions-scan"
                className="w-full bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] outline-none focus:border-accent-red/50"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full font-mono text-[0.55rem] uppercase tracking-wider py-2.5 bg-accent-red text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create key"}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
