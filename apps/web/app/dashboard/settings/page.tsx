"use client";

import { useUser } from "@clerk/nextjs";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();

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
          <SettingsInput label="Project Name" defaultValue="My Project" />
          <SettingsInput label="Project Slug" defaultValue="my-project" />
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">
              Default Environment
            </label>
            <select className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-secondary outline-none w-full max-w-sm">
              <option>Production</option>
              <option>Staging</option>
              <option>Development</option>
            </select>
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
          <SettingsField label="Server URL" value="https://api.flagforge.dev" mono />
          <SettingsField label="SSE Endpoint" value="https://api.flagforge.dev/api/v1/stream" mono />
          <SettingsField label="Clerk Domain" value="your-app.clerk.accounts.dev" mono />
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

function SettingsInput({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">
        {label}
      </label>
      <input
        type="text"
        defaultValue={defaultValue}
        className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full max-w-sm focus:border-accent-red/50 transition-colors"
      />
    </div>
  );
}
