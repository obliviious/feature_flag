"use client";

import { useState, useCallback } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import { Modal } from "@/components/dashboard/Modal";
import { CodeSnippet } from "@/components/dashboard/CodeSnippet";
import Link from "next/link";
import {
  buildClerkM2MNote,
  buildGithubSecretsList,
  buildScanCommand,
  buildScanScriptEnv,
  buildSingleFlagCurl,
} from "@/lib/lifecycle-snippets";
import type {
  StaleFlagSummary,
  CodeReference,
  FlagLifecycleStatus,
} from "@/lib/api";

// ============================================================
// Helpers
// ============================================================

const STATUS_LABELS: Record<FlagLifecycleStatus, string> = {
  active: "Active",
  deprecated: "Deprecated",
  scheduled_cleanup: "Cleanup Scheduled",
};

const STATUS_COLORS: Record<FlagLifecycleStatus, string> = {
  active: "text-green-400 border-green-400/30 bg-green-400/5",
  deprecated: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  scheduled_cleanup: "text-red-400 border-red-400/30 bg-red-400/5",
};

function stalenessLabel(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo`;
  if (days >= 30) return `${Math.floor(days / 30)}mo`;
  return `${days}d`;
}

function stalenessColor(days: number): string {
  if (days >= 180) return "text-red-400";
  if (days >= 90) return "text-yellow-400";
  return "text-text-muted";
}

const THRESHOLD_OPTIONS = [30, 60, 90, 180, 365];

// ============================================================
// Sub-components
// ============================================================

function StatusBadge({ status }: { status: FlagLifecycleStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border font-mono text-[0.45rem] uppercase tracking-[0.12em] ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function OwnerCell({
  flag,
  onEdit,
}: {
  flag: StaleFlagSummary;
  onEdit: (flag: StaleFlagSummary) => void;
}) {
  if (flag.owner_email) {
    return (
      <button
        onClick={() => onEdit(flag)}
        className="text-left group"
        title="Edit owner"
      >
        <div className="font-mono text-[0.6rem] text-text-primary group-hover:text-accent-red transition-colors truncate max-w-[140px]">
          {flag.owner_name || flag.owner_email}
        </div>
        {flag.owner_name && (
          <div className="font-mono text-[0.5rem] text-text-muted truncate max-w-[140px]">
            {flag.owner_email}
          </div>
        )}
      </button>
    );
  }
  return (
    <button
      onClick={() => onEdit(flag)}
      className="font-mono text-[0.55rem] text-text-muted hover:text-accent-red transition-colors flex items-center gap-1"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" />
        <line x1="5" y1="3" x2="5" y2="7" stroke="currentColor" strokeWidth="1" />
        <line x1="3" y1="5" x2="7" y2="5" stroke="currentColor" strokeWidth="1" />
      </svg>
      Assign
    </button>
  );
}

function CodeRefsPanel({ refs }: { refs: CodeReference[] }) {
  if (refs.length === 0) {
    return (
      <p className="font-mono text-[0.55rem] text-text-muted py-3">
        No code references found. Push refs from CI/CD via the API.
      </p>
    );
  }
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {refs.map((ref) => (
        <div
          key={ref.id}
          className="border border-border bg-bg-card px-3 py-2 space-y-0.5"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[0.55rem] text-text-primary truncate">
              {ref.file_path}
              {ref.line_number != null && (
                <span className="text-text-muted">:{ref.line_number}</span>
              )}
            </span>
            {ref.branch && (
              <span className="font-mono text-[0.45rem] px-1.5 py-0.5 border border-border text-text-muted">
                {ref.branch}
              </span>
            )}
          </div>
          {ref.snippet && (
            <pre className="font-mono text-[0.5rem] text-text-muted overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {ref.snippet.trim()}
            </pre>
          )}
          {ref.repo && (
            <div className="font-mono text-[0.45rem] text-text-muted/60">{ref.repo}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Detail slide-over panel
// ============================================================

function FlagDetailPanel({
  flag,
  onClose,
  onSave,
}: {
  flag: StaleFlagSummary;
  onClose: () => void;
  onSave: (
    flagKey: string,
    data: {
      owner_email?: string;
      owner_name?: string;
      lifecycle_status?: FlagLifecycleStatus;
      stale_threshold_days?: number;
    }
  ) => Promise<void>;
}) {
  const { project, api } = useProject();
  const [ownerEmail, setOwnerEmail] = useState(flag.owner_email ?? "");
  const [ownerName, setOwnerName] = useState(flag.owner_name ?? "");
  const [status, setStatus] = useState<FlagLifecycleStatus>(flag.lifecycle_status);
  const [thresholdDays, setThresholdDays] = useState<string>(
    flag.stale_threshold_days?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: refs, loading: refsLoading } = useApiData(
    () =>
      project
        ? api.getCodeRefs(project.id, flag.key)
        : Promise.resolve([]),
    [project?.id, flag.key]
  );

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(flag.key, {
        owner_email: ownerEmail || undefined,
        owner_name: ownerName || undefined,
        lifecycle_status: status,
        stale_threshold_days: thresholdDays ? parseInt(thresholdDays, 10) : undefined,
      });
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-primary border-l border-border flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-card shrink-0">
          <div>
            <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">
              Flag Detail
            </span>
            <div className="font-mono text-[0.5rem] text-text-muted mt-0.5">{flag.key}</div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Staleness summary */}
          <div className="border border-border bg-bg-card px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                Stale for
              </span>
              <span className={`font-mono text-[0.7rem] font-medium ${stalenessColor(flag.staleness_days)}`}>
                {stalenessLabel(flag.staleness_days)}
              </span>
            </div>
            {flag.last_activity_at && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                  Last activity
                </span>
                <span className="font-mono text-[0.55rem] text-text-secondary">
                  {new Date(flag.last_activity_at).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                Code refs
              </span>
              <span className="font-mono text-[0.55rem] text-text-secondary">
                {flag.code_ref_count}
              </span>
            </div>
          </div>

          {/* Ownership */}
          <div className="space-y-3">
            <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.14em]">
              Ownership
            </div>
            <div className="space-y-2">
              <div>
                <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.12em] mb-1 block">
                  Owner Email
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  className="w-full bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50 transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.12em] mb-1 block">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Lifecycle status */}
          <div className="space-y-2">
            <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.14em]">
              Lifecycle Status
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["active", "deprecated", "scheduled_cleanup"] as FlagLifecycleStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`border px-2 py-2 font-mono text-[0.45rem] uppercase tracking-wider transition-colors ${
                      status === s
                        ? "border-accent-red bg-accent-red/10 text-accent-red"
                        : "border-border text-text-muted hover:border-text-muted"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Custom threshold */}
          <div className="space-y-2">
            <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.14em]">
              Custom Stale Threshold (days)
            </div>
            <input
              type="number"
              min={1}
              value={thresholdDays}
              onChange={(e) => setThresholdDays(e.target.value)}
              placeholder="Leave blank to use project default"
              className="w-full bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50 transition-colors"
            />
            <p className="font-mono text-[0.45rem] text-text-muted">
              Overrides the page-level threshold for this flag only.
            </p>
          </div>

          {/* Code references */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.14em]">
                Code References
              </div>
              {flag.code_ref_count > 0 && (
                <span className="font-mono text-[0.45rem] text-text-muted">
                  {flag.code_ref_count} location{flag.code_ref_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {refsLoading ? (
              <div className="font-mono text-[0.55rem] text-text-muted py-2">Loading refs…</div>
            ) : (
              <CodeRefsPanel refs={refs ?? []} />
            )}
            <p className="font-mono text-[0.45rem] text-text-muted/60">
              Ingest refs via POST …/code-refs with a{" "}
              <Link href="/dashboard/settings" className="text-accent-red hover:underline">
                mgmt_ key
              </Link>
              . See CI setup below.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 bg-bg-card shrink-0 space-y-2">
          {saveError && (
            <p className="font-mono text-[0.5rem] text-accent-red">{saveError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2.5 border border-border text-text-muted hover:border-text-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2.5 bg-accent-red text-white hover:bg-accent-red/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Quick Archive confirm modal
// ============================================================

function ArchiveModal({
  flag,
  onClose,
  onConfirm,
}: {
  flag: StaleFlagSummary;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed");
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Archive Flag">
      <div className="space-y-4">
        <p className="font-mono text-[0.6rem] text-text-secondary leading-relaxed">
          Archive{" "}
          <span className="text-text-primary font-medium">{flag.key}</span>? It
          will be removed from evaluation config but can be restored later.
        </p>
        {flag.code_ref_count > 0 && (
          <div className="border border-yellow-400/30 bg-yellow-400/5 px-3 py-2">
            <p className="font-mono text-[0.55rem] text-yellow-400">
              This flag has {flag.code_ref_count} code reference
              {flag.code_ref_count !== 1 ? "s" : ""} — make sure they're
              cleaned up before archiving.
            </p>
          </div>
        )}
        {error && (
          <p className="font-mono text-[0.55rem] text-accent-red">{error}</p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2.5 border border-border text-text-muted hover:border-text-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2.5 bg-accent-red text-white hover:bg-accent-red/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Archiving…" : "Archive"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Main page
// ============================================================

export default function LifecyclePage() {
  const { project, loading: projectLoading, api } = useProject();
  const [thresholdDays, setThresholdDays] = useState(90);
  const [selectedFlag, setSelectedFlag] = useState<StaleFlagSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StaleFlagSummary | null>(null);

  const fetchStale = useCallback(
    () =>
      project
        ? api.getStaleFlags(project.id, thresholdDays)
        : Promise.resolve([]),
    [project?.id, api, thresholdDays]
  );

  const {
    data: staleFlags,
    loading,
    error,
    refetch,
  } = useApiData(fetchStale, [project?.id, thresholdDays]);

  async function handleUpdateLifecycle(
    flagKey: string,
    data: {
      owner_email?: string;
      owner_name?: string;
      lifecycle_status?: FlagLifecycleStatus;
      stale_threshold_days?: number;
    }
  ) {
    if (!project) return;
    await api.updateFlagLifecycle(project.id, flagKey, data);
    refetch();
  }

  async function handleMarkDeprecated(flag: StaleFlagSummary) {
    if (!project) return;
    await api.updateFlagLifecycle(project.id, flag.key, {
      lifecycle_status: "deprecated",
    });
    refetch();
  }

  async function handleScheduleCleanup(flag: StaleFlagSummary) {
    if (!project) return;
    await api.updateFlagLifecycle(project.id, flag.key, {
      lifecycle_status: "scheduled_cleanup",
    });
    refetch();
  }

  async function handleArchive(flag: StaleFlagSummary) {
    if (!project) return;
    await api.updateFlag(project.id, flag.key, { archived: true });
    refetch();
  }

  if (projectLoading) return <LoadingState label="Loading lifecycle data…" />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const count = staleFlags?.length ?? 0;

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-text-primary">
            Flag Lifecycle
          </h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider mt-1">
            {project.name} &bull; Stale flag detection &amp; ownership management
          </p>
        </div>

        {/* Threshold selector */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider whitespace-nowrap">
            Stale after
          </span>
          <div className="flex border border-border">
            {THRESHOLD_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setThresholdDays(d)}
                className={`font-mono text-[0.5rem] uppercase tracking-wider px-2.5 py-1.5 transition-colors ${
                  thresholdDays === d
                    ? "bg-accent-red text-white"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {d >= 365 ? "1y" : `${d}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Stale flags",
              value: count,
              color: count > 0 ? "text-red-400" : "text-green-400",
            },
            {
              label: "No owner",
              value: (staleFlags ?? []).filter((f) => !f.owner_email).length,
              color: "text-yellow-400",
            },
            {
              label: "Deprecated",
              value: (staleFlags ?? []).filter(
                (f) => f.lifecycle_status === "deprecated"
              ).length,
              color: "text-text-secondary",
            },
            {
              label: "Cleanup queued",
              value: (staleFlags ?? []).filter(
                (f) => f.lifecycle_status === "scheduled_cleanup"
              ).length,
              color: "text-text-secondary",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="border border-border bg-bg-card px-4 py-3"
            >
              <div className={`font-mono text-xl font-medium ${color}`}>
                {value}
              </div>
              <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingState label="Scanning for stale flags…" />
      ) : count === 0 ? (
        <div className="border border-border bg-bg-card px-6 py-16 text-center space-y-3">
          <div className="flex justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              className="text-green-400"
            >
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10 16l4 4 8-8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="font-serif text-lg text-text-primary">No stale flags</p>
          <p className="font-mono text-[0.55rem] text-text-muted">
            All active flags have had changes within the last {thresholdDays} days.
          </p>
        </div>
      ) : (
        <div className="border border-border">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_100px_80px_80px_120px] gap-3 items-center px-4 py-2 border-b border-border bg-bg-card">
            {["Flag", "Owner", "Status", "Stale", "Refs", "Actions"].map((h) => (
              <div
                key={h}
                className="font-mono text-[0.45rem] text-text-muted uppercase tracking-[0.14em]"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {staleFlags!.map((flag) => (
              <div
                key={flag.id}
                className="grid grid-cols-[1fr_120px_100px_80px_80px_120px] gap-3 items-center px-4 py-3 hover:bg-bg-card/50 transition-colors"
              >
                {/* Flag key + name */}
                <div
                  className="cursor-pointer"
                  onClick={() => setSelectedFlag(flag)}
                >
                  <div className="font-mono text-[0.6rem] text-text-primary hover:text-accent-red transition-colors truncate">
                    {flag.key}
                  </div>
                  <div className="font-mono text-[0.5rem] text-text-muted truncate">
                    {flag.name}
                  </div>
                </div>

                {/* Owner */}
                <OwnerCell flag={flag} onEdit={setSelectedFlag} />

                {/* Status badge */}
                <div>
                  <StatusBadge status={flag.lifecycle_status} />
                </div>

                {/* Staleness */}
                <div
                  className={`font-mono text-[0.6rem] font-medium ${stalenessColor(flag.staleness_days)}`}
                >
                  {stalenessLabel(flag.staleness_days)}
                </div>

                {/* Code refs */}
                <div className="font-mono text-[0.6rem] text-text-muted">
                  {flag.code_ref_count > 0 ? (
                    <button
                      onClick={() => setSelectedFlag(flag)}
                      className="hover:text-text-primary transition-colors"
                      title="View code references"
                    >
                      {flag.code_ref_count}
                    </button>
                  ) : (
                    <span className="text-text-muted/40">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-wrap">
                  {flag.lifecycle_status === "active" && (
                    <button
                      onClick={() => handleMarkDeprecated(flag)}
                      title="Mark deprecated"
                      className="font-mono text-[0.42rem] uppercase tracking-wider px-2 py-1 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                    >
                      Deprecate
                    </button>
                  )}
                  {flag.lifecycle_status === "deprecated" && (
                    <button
                      onClick={() => handleScheduleCleanup(flag)}
                      title="Schedule for cleanup"
                      className="font-mono text-[0.42rem] uppercase tracking-wider px-2 py-1 border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      Queue
                    </button>
                  )}
                  <button
                    onClick={() => setArchiveTarget(flag)}
                    title="Archive flag"
                    className="font-mono text-[0.42rem] uppercase tracking-wider px-2 py-1 border border-border text-text-muted hover:border-text-muted hover:text-text-primary transition-colors"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CI / code reference scanning */}
      {!loading && project && (
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-lg text-text-primary">Code reference scanning</h2>
            <p className="font-mono text-[0.55rem] text-text-muted mt-1 max-w-2xl leading-relaxed">
              FlagForge does not scan your repo automatically. Generate a{" "}
              <Link href="/dashboard/settings" className="text-accent-red hover:underline">
                management key (mgmt_…)
              </Link>{" "}
              in Settings, then run{" "}
              <code className="text-text-secondary">scripts/scan-flag-refs.sh</code> in CI or locally.
              Results appear in the Refs column and flag detail panel above.
            </p>
          </div>
          <div className="space-y-3">
            <CodeSnippet
              title="1. Create a management key"
              description="Dashboard → Settings → CI / Management Keys → Generate Key. Store as a CI secret."
              code={`# Authorization header (no "Bearer" prefix)
Authorization: mgmt_xxxxxxxxxxxxxxxx`}
            />
            <CodeSnippet
              title="2. Environment variables"
              code={buildScanScriptEnv({ projectId: project.id })}
            />
            <CodeSnippet title="3. Run the scanner" code={buildScanCommand()} />
            <CodeSnippet
              title="4. Manual single-flag upload (curl)"
              code={buildSingleFlagCurl({ projectId: project.id }, "my-flag-key")}
            />
            <CodeSnippet title="5. GitHub Actions secrets" code={buildGithubSecretsList()} />
            <CodeSnippet
              title="Alternative: Clerk JWT"
              description="You can use Authorization: Bearer <clerk-jwt> instead of mgmt_ keys if you already use Clerk M2M."
              code={buildClerkM2MNote()}
            />
          </div>
        </div>
      )}

      {/* Detail slide-over */}
      {selectedFlag && (
        <FlagDetailPanel
          flag={selectedFlag}
          onClose={() => setSelectedFlag(null)}
          onSave={handleUpdateLifecycle}
        />
      )}

      {/* Archive confirm */}
      {archiveTarget && (
        <ArchiveModal
          flag={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => handleArchive(archiveTarget)}
        />
      )}
    </div>
  );
}
