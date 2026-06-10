"use client";

import { useState } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import { Modal } from "@/components/dashboard/Modal";
import { SEGMENT_OPERATORS, type Segment, type SegmentConstraint } from "@/lib/api";

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

interface ConstraintInput {
  attribute: string;
  operator: string;
  values: string;
}

const emptyConstraint = (): ConstraintInput => ({
  attribute: "",
  operator: "eq",
  values: "",
});

export default function SegmentsPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [selected, setSelected] = useState<Segment | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSeg, setNewSeg] = useState({ key: "", name: "", description: "", match_type: "all" });
  const [constraints, setConstraints] = useState<ConstraintInput[]>([emptyConstraint()]);
  const [creating, setCreating] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const { data: segments, loading, error, refetch } = useApiData(
    () => (project ? api.listSegments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  if (projectLoading || loading) return <LoadingState label="Loading segments..." />;
  if (!project) return <SetupPrompt />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allSegments = segments ?? [];
  const detail = selected ?? allSegments[0] ?? null;

  async function selectSegment(seg: Segment) {
    setSelected(seg);
    setLoadingDetail(true);
    try {
      const fresh = await api.getSegment(project!.id, seg.id);
      setSelected(fresh);
    } catch {
      // keep list version on failure
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleCreate() {
    if (!newSeg.key.trim() || !newSeg.name.trim()) return;
    setCreating(true);
    try {
      const parsedConstraints = constraints
        .filter((c) => c.attribute.trim())
        .map((c) => ({
          attribute: c.attribute.trim(),
          operator: c.operator,
          values: c.values.split(",").map((v) => v.trim()).filter(Boolean),
        }));

      await api.createSegment(project!.id, {
        key: newSeg.key.trim(),
        name: newSeg.name.trim(),
        description: newSeg.description.trim() || undefined,
        match_type: newSeg.match_type,
        constraints: parsedConstraints,
      });
      setShowCreate(false);
      setNewSeg({ key: "", name: "", description: "", match_type: "all" });
      setConstraints([emptyConstraint()]);
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  function updateConstraint(index: number, field: keyof ConstraintInput, value: string) {
    const next = [...constraints];
    next[index] = { ...next[index], [field]: value };
    setConstraints(next);
  }

  return (
    <div className="p-6 md:p-8 relative z-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl mb-1">Segments</h1>
          <p className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
            Reusable user groups for targeting rules
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors flex items-center gap-2"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="white" strokeWidth="1.5" /><line x1="1" y1="6" x2="11" y2="6" stroke="white" strokeWidth="1.5" /></svg>
          Create Segment
        </button>
      </div>

      {allSegments.length === 0 ? (
        <div className="border border-border px-5 py-12 text-center">
          <p className="font-mono text-[0.6rem] text-text-muted">No segments yet. Create your first segment to define targeting groups.</p>
        </div>
      ) : (
        <>
          <div className="border border-border">
            <div className="grid grid-cols-[1fr_90px_80px_90px] px-5 py-2.5 border-b border-border bg-bg-card min-w-[450px]">
              {["Segment", "Match", "Rules", "Updated"].map((h) => (
                <span key={h} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {allSegments.map((seg) => (
                <div
                  key={seg.id}
                  onClick={() => selectSegment(seg)}
                  className={`grid grid-cols-[1fr_90px_80px_90px] px-5 py-4 hover:bg-bg-card/50 transition-colors cursor-pointer group items-center min-w-[450px] ${detail?.id === seg.id ? "bg-bg-card/30" : ""}`}
                >
                  <div>
                    <div className="font-mono text-[0.7rem] text-text-primary group-hover:text-accent-red transition-colors">{seg.name}</div>
                    <div className="font-mono text-[0.5rem] text-text-muted">{seg.key}</div>
                  </div>
                  <span className={`font-mono text-[0.5rem] uppercase tracking-wider px-1.5 py-0.5 w-fit ${
                    seg.match_type === "all" ? "text-blue-400/70 border border-blue-400/20 bg-blue-400/[0.04]" : "text-amber-400/70 border border-amber-400/20 bg-amber-400/[0.04]"
                  }`}>{seg.match_type}</span>
                  <span className="font-mono text-[0.6rem] text-text-secondary">{seg.constraints.length}</span>
                  <span className="font-mono text-[0.5rem] text-text-muted/60">{timeAgo(seg.updated_at)}</span>
                </div>
              ))}
            </div>
          </div>

          {detail && (
            <div className="border border-border">
              <div className="px-5 py-3 border-b border-border bg-bg-card flex items-center justify-between">
                <div>
                  <span className="font-mono text-[0.6rem] text-text-primary uppercase tracking-wider">{detail.name}</span>
                  {detail.description && (
                    <p className="font-mono text-[0.5rem] text-text-muted mt-1">{detail.description}</p>
                  )}
                </div>
                <span className="font-mono text-[0.5rem] text-accent-red uppercase tracking-wider">
                  Match {detail.match_type.toUpperCase()}
                  {loadingDetail && " · loading..."}
                </span>
              </div>
              {detail.constraints.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="font-mono text-[0.55rem] text-text-muted">No constraints defined.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {detail.constraints.map((c, i) => (
                    <ConstraintRow key={c.id} index={i} constraint={c} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Segment">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Segment Key</label>
              <input type="text" value={newSeg.key} onChange={(e) => setNewSeg({ ...newSeg, key: e.target.value })} placeholder="enterprise-users" className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors" />
            </div>
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Name</label>
              <input type="text" value={newSeg.name} onChange={(e) => setNewSeg({ ...newSeg, name: e.target.value })} placeholder="Enterprise Users" className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Description</label>
            <input type="text" value={newSeg.description} onChange={(e) => setNewSeg({ ...newSeg, description: e.target.value })} placeholder="Optional description" className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors" />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Match Type</label>
            <select value={newSeg.match_type} onChange={(e) => setNewSeg({ ...newSeg, match_type: e.target.value })} className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full">
              <option value="all">All (AND)</option>
              <option value="any">Any (OR)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">Constraints</label>
              <button
                type="button"
                onClick={() => setConstraints([...constraints, emptyConstraint()])}
                className="font-mono text-[0.5rem] text-accent-red hover:text-accent-red-hover uppercase tracking-wider"
              >
                + Add Rule
              </button>
            </div>
            <div className="space-y-2">
              {constraints.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={c.attribute}
                    onChange={(e) => updateConstraint(i, "attribute", e.target.value)}
                    placeholder="attribute"
                    className="flex-1 bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50"
                  />
                  <select
                    value={c.operator}
                    onChange={(e) => updateConstraint(i, "operator", e.target.value)}
                    className="w-28 bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.55rem] text-text-secondary outline-none"
                  >
                    {SEGMENT_OPERATORS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={c.values}
                    onChange={(e) => updateConstraint(i, "values", e.target.value)}
                    placeholder="values (comma-separated)"
                    className="flex-[2] bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50"
                  />
                  {constraints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConstraints(constraints.filter((_, j) => j !== i))}
                      className="text-text-muted hover:text-accent-red p-1.5"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleCreate} disabled={creating || !newSeg.key.trim() || !newSeg.name.trim()} className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50">
            {creating ? "Creating..." : "Create Segment"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ConstraintRow({ index, constraint }: { index: number; constraint: SegmentConstraint }) {
  return (
    <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
      <span className="font-mono text-[0.5rem] text-text-muted/40 w-5">{String(index + 1).padStart(2, "0")}</span>
      <span className="font-mono text-[0.65rem] text-accent-red bg-accent-red/[0.06] px-2 py-0.5 border border-accent-red/15">{constraint.attribute}</span>
      <span className="font-mono text-[0.55rem] text-text-muted uppercase">{constraint.operator}</span>
      <span className="font-mono text-[0.65rem] text-text-primary bg-bg-card px-2 py-0.5 border border-border">{constraint.values.join(", ")}</span>
    </div>
  );
}
