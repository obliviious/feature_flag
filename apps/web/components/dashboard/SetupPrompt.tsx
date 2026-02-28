"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";

export function SetupPrompt() {
  const { api, refreshProjects, error: ctxError } = useProject();
  const [orgName, setOrgName] = useState("My Organization");
  const [projectName, setProjectName] = useState("My Project");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetup() {
    setSubmitting(true);
    setError(null);
    try {
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await api.setup({
        org_name: orgName,
        org_slug: slug(orgName),
        project_name: projectName,
        project_slug: slug(projectName),
      });
      await refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="border border-border bg-bg-primary p-8 max-w-md w-full space-y-6">
        <div>
          <h2 className="font-serif text-xl mb-2">Welcome to FlagForge</h2>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            Set up your first organization and project to get started.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
            />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
            />
          </div>
        </div>

        {(error || ctxError) && (
          <p className="font-mono text-[0.55rem] text-accent-red">{error || ctxError}</p>
        )}

        <button
          onClick={handleSetup}
          disabled={submitting || !orgName.trim() || !projectName.trim()}
          className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-3 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Setting up..." : "Create Project"}
        </button>

        <p className="font-mono text-[0.45rem] text-text-muted/50 text-center">
          This creates 3 environments (Development, Staging, Production) with SDK keys.
        </p>
      </div>
    </div>
  );
}
