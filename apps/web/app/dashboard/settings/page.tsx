"use client";

import { useUser } from "@clerk/nextjs";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";

const API_DISPLAY_URL = "Via /api/proxy → EC2 backend";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { project, api, loading: projectLoading } = useProject();

  const { data: environments, loading: envsLoading } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  if (projectLoading || envsLoading) return <LoadingState label="Loading settings..." />;
  if (!project) return <SetupPrompt />;

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-8">
      <div>
        <h1 className="font-serif text-2xl mb-1">Settings</h1>
        <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
          Project configuration and account preferences
        </p>
      </div>

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
          <SettingsField label="Project Name" value={project?.name || "—"} />
          <SettingsField label="Project Slug" value={project?.slug || "—"} mono />
          <SettingsField label="Project ID" value={project?.id || "—"} mono />
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

      {/* API section */}
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            API Configuration
          </span>
        </div>
        <div className="p-5 space-y-4">
          <SettingsField label="Server URL" value={API_DISPLAY_URL} mono />
          <SettingsField label="SSE Endpoint" value={`${API_DISPLAY_URL}/api/v1/stream`} mono />
        </div>
      </section>

      {/* Webhooks */}
      <section className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-bg-card flex items-center justify-between">
          <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
            Webhooks
          </span>
          <button className="font-mono text-[0.5rem] text-accent-red uppercase tracking-wider hover:text-accent-red-hover transition-colors">
            Add Webhook {">>>"}
          </button>
        </div>
        <div className="p-5">
          <div className="text-center py-8">
            <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider mb-4">
              No webhooks configured
            </p>
            <p className="font-mono text-[0.5rem] text-text-muted/50 max-w-sm mx-auto">
              Webhooks notify external services when flags change. Useful for
              CI/CD integrations and monitoring.
            </p>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="border border-accent-red/20">
        <div className="px-5 py-3 border-b border-accent-red/20 bg-accent-red/[0.03]">
          <span className="font-mono text-[0.6rem] text-accent-red uppercase tracking-wider">
            Danger Zone
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-[0.65rem] text-text-primary mb-0.5">Delete Project</div>
              <div className="font-mono text-[0.5rem] text-text-muted">
                Permanently delete this project and all associated flags, environments, and SDK keys.
              </div>
            </div>
            <button className="font-mono text-[0.6rem] uppercase tracking-wider px-4 py-2 border border-accent-red/30 text-accent-red hover:bg-accent-red hover:text-white transition-colors">
              Delete Project
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5">{label}</div>
      <div className={`${mono ? "font-mono text-[0.65rem]" : "text-sm"} text-text-secondary bg-bg-card border border-border px-3 py-2`}>
        {value}
      </div>
    </div>
  );
}
