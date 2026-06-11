"use client";

import { useState, useCallback } from "react";
import { useProject } from "@/lib/project-context";
import { useApiData } from "@/lib/use-api-data";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { SetupPrompt } from "@/components/dashboard/SetupPrompt";
import { Modal } from "@/components/dashboard/Modal";
import type {
  Flag,
  FlagVariant,
  Segment,
  TargetingRule,
  FlagOverride,
} from "@/lib/api";

// ============================================================
// Utility helpers
// ============================================================

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface VariantInput {
  id?: string;
  key: string;
  value: string;
  description: string;
}

function variantValueToString(value: unknown): string {
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
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

// ============================================================
// Sub-components
// ============================================================

function SettingsFieldReadonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5">{label}</div>
      <div className="font-mono text-[0.65rem] text-text-secondary bg-bg-card border border-border px-3 py-2">{value}</div>
    </div>
  );
}

// ============================================================
// Variants Panel (existing)
// ============================================================

function VariantsPanel({
  flag,
  variantDraft,
  saving,
  onUpdate,
  onSave,
}: {
  flag: Flag;
  variantDraft: VariantInput[];
  saving: boolean;
  onUpdate: (index: number, field: keyof VariantInput, value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">Variants</div>
      <div className="space-y-2">
        {variantDraft.map((v, i) => (
          <div key={v.id ?? i} className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              value={v.key}
              onChange={(e) => onUpdate(i, "key", e.target.value)}
              className="w-24 bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50"
              placeholder="key"
            />
            <span className="font-mono text-[0.55rem] text-text-muted">:</span>
            <input
              type="text"
              value={v.value}
              onChange={(e) => onUpdate(i, "value", e.target.value)}
              className="w-28 bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50"
              placeholder="value"
            />
            <input
              type="text"
              value={v.description}
              onChange={(e) => onUpdate(i, "description", e.target.value)}
              className="flex-1 min-w-[120px] bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.6rem] text-text-muted outline-none focus:border-accent-red/50"
              placeholder="description"
            />
          </div>
        ))}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="font-mono text-[0.55rem] uppercase tracking-wider px-4 py-2 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Variants"}
      </button>
    </div>
  );
}

// ============================================================
// Rules Panel
// ============================================================

interface RulesPanelProps {
  flag: Flag;
  envId: string;
  variants: FlagVariant[];
  segments: Segment[];
  onEnvChange: (id: string) => void;
  environments: { id: string; name: string }[];
}

function RulesPanel({ flag, envId, variants, segments, environments, onEnvChange }: RulesPanelProps) {
  const { project, api } = useProject();
  const [rules, setRules] = useState<TargetingRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Rule form state
  const [ruleForm, setRuleForm] = useState<{
    rank: string;
    description: string;
    mode: "single" | "distribution";
    variantId: string;
    distributions: { variantId: string; percentage: string }[];
    segments: { segmentId: string; negate: boolean }[];
  }>({
    rank: "1",
    description: "",
    mode: "single",
    variantId: variants[0]?.id ?? "",
    distributions: variants.map((v) => ({ variantId: v.id, percentage: "" })),
    segments: [],
  });
  const [savingRule, setSavingRule] = useState(false);

  const loadRules = useCallback(async () => {
    if (!project || !envId) return;
    setLoadingRules(true);
    setLoadError(null);
    try {
      const data = await api.listRules(project.id, flag.key, envId);
      setRules(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setLoadingRules(false);
    }
  }, [project, api, flag.key, envId]);

  // Load whenever envId changes
  useState(() => { loadRules(); });
  // Re-load on explicit envId change via useEffect equivalent — we call loadRules when envId changes through key prop

  async function handleDeleteRule(ruleId: string) {
    if (!project) return;
    setDeletingId(ruleId);
    try {
      await api.deleteRule(project.id, flag.key, envId, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateRule() {
    if (!project) return;
    setSavingRule(true);
    try {
      const body: Parameters<typeof api.createRule>[3] = {
        rank: parseInt(ruleForm.rank) || 1,
        description: ruleForm.description.trim() || undefined,
        segments: ruleForm.segments.map((s) => ({
          segment_id: s.segmentId,
          negate: s.negate,
        })),
      };

      if (ruleForm.mode === "single") {
        body.variant_id = ruleForm.variantId || undefined;
      } else {
        const dists = ruleForm.distributions
          .filter((d) => d.percentage !== "" && parseInt(d.percentage) > 0)
          .map((d) => ({ variant_id: d.variantId, percentage: parseInt(d.percentage) }));
        const total = dists.reduce((s, d) => s + d.percentage, 0);
        if (total !== 100) {
          alert(`Percentages must sum to 100 (currently ${total})`);
          return;
        }
        body.distributions = dists;
      }

      const created = await api.createRule(project.id, flag.key, envId, body);
      setRules((prev) =>
        [...prev, created].sort((a, b) => a.rank - b.rank)
      );
      setShowCreate(false);
      resetRuleForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create rule");
    } finally {
      setSavingRule(false);
    }
  }

  function resetRuleForm() {
    setRuleForm({
      rank: String((rules.length + 1)),
      description: "",
      mode: "single",
      variantId: variants[0]?.id ?? "",
      distributions: variants.map((v) => ({ variantId: v.id, percentage: "" })),
      segments: [],
    });
  }

  function addSegmentToRule() {
    if (!segments.length) return;
    setRuleForm((prev) => ({
      ...prev,
      segments: [...prev.segments, { segmentId: segments[0].id, negate: false }],
    }));
  }

  function removeSegmentFromRule(idx: number) {
    setRuleForm((prev) => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== idx),
    }));
  }

  const envName = environments.find((e) => e.id === envId)?.name ?? envId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">Targeting Rules</span>
          <select
            value={envId}
            onChange={(e) => { onEnvChange(e.target.value); }}
            className="bg-bg-card border border-border px-2 py-1 font-mono text-[0.5rem] text-text-secondary uppercase tracking-wider outline-none"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { resetRuleForm(); setShowCreate(true); }}
          className="font-mono text-[0.5rem] uppercase tracking-wider text-accent-red hover:text-accent-red-hover transition-colors"
        >
          + Add Rule
        </button>
      </div>

      {loadingRules ? (
        <div className="font-mono text-[0.5rem] text-text-muted py-2">Loading rules...</div>
      ) : loadError ? (
        <div className="font-mono text-[0.5rem] text-accent-red">{loadError}</div>
      ) : rules.length === 0 ? (
        <div className="font-mono text-[0.55rem] text-text-muted py-4 text-center border border-dashed border-border">
          No targeting rules for {envName}. All users get the default variant.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, idx) => {
            const ruleVariant = variants.find((v) => v.id === rule.variant_id);
            const ruleSegs = rule.segments
              .map((s) => segments.find((seg) => seg.id === s.segment_id))
              .filter(Boolean);

            return (
              <div key={rule.id} className="border border-border bg-bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[0.45rem] text-text-muted border border-border px-1.5 py-0.5">#{idx + 1}</span>
                    {rule.description && (
                      <span className="font-mono text-[0.55rem] text-text-secondary">{rule.description}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={deletingId === rule.id}
                    className="text-text-muted hover:text-accent-red transition-colors p-0.5 flex-shrink-0"
                    title="Delete rule"
                  >
                    {deletingId === rule.id ? (
                      <span className="font-mono text-[0.45rem]">...</span>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                        <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Conditions */}
                {ruleSegs.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[0.45rem] text-text-muted uppercase">If</span>
                    {rule.segments.map((s, i) => {
                      const seg = segments.find((sg) => sg.id === s.segment_id);
                      return (
                        <span key={s.id} className="inline-flex items-center gap-1">
                          {i > 0 && <span className="font-mono text-[0.45rem] text-text-muted">AND</span>}
                          {s.negate && <span className="font-mono text-[0.45rem] text-accent-red">NOT</span>}
                          <span className="font-mono text-[0.5rem] text-text-secondary border border-border px-1.5 py-0.5 bg-bg-card/50">
                            {seg?.name ?? s.segment_id}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Serve */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[0.45rem] text-text-muted uppercase">Serve</span>
                  {rule.variant_id ? (
                    <span className="font-mono text-[0.5rem] text-green-400 border border-green-900/40 bg-green-950/20 px-1.5 py-0.5">
                      {ruleVariant?.key ?? rule.variant_id}
                    </span>
                  ) : rule.distributions.length > 0 ? (
                    rule.distributions.map((d) => {
                      const dv = variants.find((v) => v.id === d.variant_id);
                      return (
                        <span key={d.id} className="font-mono text-[0.5rem] text-text-secondary border border-border px-1.5 py-0.5">
                          {d.percentage}% → {dv?.key ?? d.variant_id}
                        </span>
                      );
                    })
                  ) : (
                    <span className="font-mono text-[0.5rem] text-text-muted">default</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={loadRules}
        className="font-mono text-[0.45rem] text-text-muted hover:text-text-secondary uppercase tracking-wider transition-colors"
      >
        Refresh rules
      </button>

      {/* Create Rule Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={`Add Rule — ${envName}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Rank (priority)</label>
              <input
                type="number"
                value={ruleForm.rank}
                onChange={(e) => setRuleForm({ ...ruleForm, rank: e.target.value })}
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50"
                min={1}
              />
            </div>
            <div>
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Description (optional)</label>
              <input
                type="text"
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                placeholder="Beta users, UK region..."
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50"
              />
            </div>
          </div>

          {/* Segment conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">
                When user matches segments
              </label>
              <button
                onClick={addSegmentToRule}
                disabled={segments.length === 0}
                className="font-mono text-[0.5rem] text-accent-red hover:text-accent-red-hover uppercase tracking-wider transition-colors disabled:opacity-40"
              >
                + Add Segment
              </button>
            </div>
            {ruleForm.segments.length === 0 ? (
              <div className="font-mono text-[0.5rem] text-text-muted border border-dashed border-border px-3 py-2">
                No segment conditions — rule matches all users
              </div>
            ) : (
              <div className="space-y-2">
                {ruleForm.segments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={seg.segmentId}
                      onChange={(e) => {
                        const updated = [...ruleForm.segments];
                        updated[i] = { ...updated[i], segmentId: e.target.value };
                        setRuleForm({ ...ruleForm, segments: updated });
                      }}
                      className="flex-1 bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.6rem] text-text-secondary outline-none"
                    >
                      {segments.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seg.negate}
                        onChange={(e) => {
                          const updated = [...ruleForm.segments];
                          updated[i] = { ...updated[i], negate: e.target.checked };
                          setRuleForm({ ...ruleForm, segments: updated });
                        }}
                        className="accent-accent-red"
                      />
                      <span className="font-mono text-[0.5rem] text-text-muted uppercase">Negate</span>
                    </label>
                    <button
                      onClick={() => removeSegmentFromRule(i)}
                      className="text-text-muted hover:text-accent-red transition-colors p-1"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                        <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Serve mode */}
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-2 block">Serve</label>
            <div className="flex gap-3 mb-3">
              {(["single", "distribution"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setRuleForm({ ...ruleForm, mode: m })}
                  className={`font-mono text-[0.5rem] uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                    ruleForm.mode === m
                      ? "border-accent-red/50 text-accent-red bg-accent-red/[0.06]"
                      : "border-border text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {m === "single" ? "Single Variant" : "Distribution"}
                </button>
              ))}
            </div>

            {ruleForm.mode === "single" ? (
              <select
                value={ruleForm.variantId}
                onChange={(e) => setRuleForm({ ...ruleForm, variantId: e.target.value })}
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.6rem] text-text-secondary outline-none w-full"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.key} ({variantValueToString(v.value)})</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                {ruleForm.distributions.map((d, i) => {
                  const v = variants.find((v) => v.id === d.variantId);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-mono text-[0.6rem] text-text-secondary w-24 truncate">{v?.key ?? d.variantId}</span>
                      <input
                        type="number"
                        value={d.percentage}
                        onChange={(e) => {
                          const updated = [...ruleForm.distributions];
                          updated[i] = { ...updated[i], percentage: e.target.value };
                          setRuleForm({ ...ruleForm, distributions: updated });
                        }}
                        placeholder="0"
                        min={0}
                        max={100}
                        className="w-20 bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50"
                      />
                      <span className="font-mono text-[0.55rem] text-text-muted">%</span>
                    </div>
                  );
                })}
                <div className="font-mono text-[0.45rem] text-text-muted">
                  Total: {ruleForm.distributions.reduce((s, d) => s + (parseInt(d.percentage) || 0), 0)}% (must equal 100)
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCreateRule}
            disabled={savingRule}
            className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50"
          >
            {savingRule ? "Creating..." : "Create Rule"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// Overrides Panel
// ============================================================

interface OverridesPanelProps {
  flag: Flag;
  envId: string;
  variants: FlagVariant[];
  environments: { id: string; name: string }[];
  onEnvChange: (id: string) => void;
}

function OverridesPanel({ flag, envId, variants, environments, onEnvChange }: OverridesPanelProps) {
  const { project, api } = useProject();
  const [overrides, setOverrides] = useState<FlagOverride[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newVariantId, setNewVariantId] = useState(variants[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadOverrides = useCallback(async () => {
    if (!project || !envId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.listOverrides(project.id, flag.key, envId);
      setOverrides(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load overrides");
    } finally {
      setLoading(false);
    }
  }, [project, api, flag.key, envId]);

  useState(() => { loadOverrides(); });

  async function handleUpsert() {
    if (!project || !newKey.trim() || !newVariantId) return;
    setSaving(true);
    try {
      const o = await api.upsertOverride(project.id, flag.key, envId, newKey.trim(), newVariantId);
      setOverrides((prev) => {
        const idx = prev.findIndex((x) => x.targeting_key === o.targeting_key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = o;
          return next;
        }
        return [...prev, o];
      });
      setNewKey("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save override");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(targetingKey: string) {
    if (!project) return;
    setDeletingKey(targetingKey);
    try {
      await api.deleteOverride(project.id, flag.key, envId, targetingKey);
      setOverrides((prev) => prev.filter((o) => o.targeting_key !== targetingKey));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete override");
    } finally {
      setDeletingKey(null);
    }
  }

  const envName = environments.find((e) => e.id === envId)?.name ?? envId;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">User Overrides</span>
        <select
          value={envId}
          onChange={(e) => onEnvChange(e.target.value)}
          className="bg-bg-card border border-border px-2 py-1 font-mono text-[0.5rem] text-text-secondary uppercase tracking-wider outline-none"
        >
          {environments.map((env) => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
      </div>

      <p className="font-mono text-[0.5rem] text-text-muted">
        Pin a specific user (by targeting key) to a variant in {envName}, regardless of rules.
      </p>

      {/* Add override row */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUpsert()}
          placeholder="user_id or email"
          className="flex-1 min-w-[160px] bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50"
        />
        <select
          value={newVariantId}
          onChange={(e) => setNewVariantId(e.target.value)}
          className="bg-bg-card border border-border px-2 py-1.5 font-mono text-[0.6rem] text-text-secondary outline-none"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>{v.key}</option>
          ))}
        </select>
        <button
          onClick={handleUpsert}
          disabled={saving || !newKey.trim()}
          className="font-mono text-[0.55rem] uppercase tracking-wider px-3 py-1.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50"
        >
          {saving ? "..." : "Pin"}
        </button>
      </div>

      {loading ? (
        <div className="font-mono text-[0.5rem] text-text-muted py-2">Loading...</div>
      ) : loadError ? (
        <div className="font-mono text-[0.5rem] text-accent-red">{loadError}</div>
      ) : overrides.length === 0 ? (
        <div className="font-mono text-[0.5rem] text-text-muted border border-dashed border-border px-3 py-2">
          No overrides for {envName}.
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_100px_30px] gap-2 px-2 py-1">
            {["Targeting Key", "Variant", ""].map((h, i) => (
              <span key={i} className="font-mono text-[0.45rem] text-text-muted uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {overrides.map((o) => {
            const v = variants.find((vv) => vv.id === o.variant_id);
            return (
              <div key={o.id} className="grid grid-cols-[1fr_100px_30px] gap-2 px-2 py-1.5 border border-border/50 bg-bg-card items-center">
                <span className="font-mono text-[0.55rem] text-text-primary truncate">{o.targeting_key}</span>
                <span className="font-mono text-[0.5rem] text-green-400">{v?.key ?? o.variant_id}</span>
                <button
                  onClick={() => handleDelete(o.targeting_key)}
                  disabled={deletingKey === o.targeting_key}
                  className="text-text-muted hover:text-accent-red transition-colors"
                  title="Remove override"
                >
                  {deletingKey === o.targeting_key ? (
                    <span className="font-mono text-[0.45rem]">...</span>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={loadOverrides}
        className="font-mono text-[0.45rem] text-text-muted hover:text-text-secondary uppercase tracking-wider transition-colors"
      >
        Refresh overrides
      </button>
    </div>
  );
}

// ============================================================
// Expanded Panel (tabs: Variants | Rules | Overrides)
// ============================================================

type ExpandedTab = "variants" | "rules" | "overrides";

function ExpandedFlagPanel({
  flag,
  environments,
  segments,
  variantDraft,
  savingVariants,
  onVariantUpdate,
  onVariantSave,
}: {
  flag: Flag;
  environments: { id: string; name: string; slug: string }[];
  segments: Segment[];
  variantDraft: VariantInput[];
  savingVariants: boolean;
  onVariantUpdate: (index: number, field: keyof VariantInput, value: string) => void;
  onVariantSave: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ExpandedTab>("variants");
  const defaultEnvId = flag.environments?.[0]?.environment_id ?? environments[0]?.id ?? "";
  const [rulesEnvId, setRulesEnvId] = useState(defaultEnvId);
  const [overridesEnvId, setOverridesEnvId] = useState(defaultEnvId);

  const TABS: { id: ExpandedTab; label: string }[] = [
    { id: "variants", label: "Variants" },
    { id: "rules", label: "Targeting Rules" },
    { id: "overrides", label: "User Overrides" },
  ];

  return (
    <div className="px-5 py-4 bg-bg-card/20 border-t border-border/50 ml-10 mr-5 mb-2 space-y-3">
      {flag.description && (
        <p className="font-mono text-[0.55rem] text-text-secondary">{flag.description}</p>
      )}

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-mono text-[0.5rem] uppercase tracking-wider px-4 py-2 border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? "border-accent-red text-accent-red"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "variants" && (
        <VariantsPanel
          flag={flag}
          variantDraft={variantDraft}
          saving={savingVariants}
          onUpdate={onVariantUpdate}
          onSave={onVariantSave}
        />
      )}

      {activeTab === "rules" && (
        <RulesPanel
          key={`${flag.key}-rules-${rulesEnvId}`}
          flag={flag}
          envId={rulesEnvId}
          variants={flag.variants}
          segments={segments}
          environments={environments}
          onEnvChange={setRulesEnvId}
        />
      )}

      {activeTab === "overrides" && (
        <OverridesPanel
          key={`${flag.key}-overrides-${overridesEnvId}`}
          flag={flag}
          envId={overridesEnvId}
          variants={flag.variants}
          environments={environments}
          onEnvChange={setOverridesEnvId}
        />
      )}
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function FlagsPage() {
  const { project, api, loading: projectLoading } = useProject();
  const [search, setSearch] = useState("");
  const [filterEnv, setFilterEnv] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newFlag, setNewFlag] = useState({
    key: "",
    name: "",
    description: "",
    flag_type: "boolean",
    tags: "",
  });
  const [variants, setVariants] = useState<VariantInput[]>([...DEFAULT_BOOLEAN_VARIANTS]);
  const [defaultVariantKey, setDefaultVariantKey] = useState("false");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editTarget, setEditTarget] = useState<Flag | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", tags: "", archived: false });
  const [updating, setUpdating] = useState(false);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantInput[]>>({});
  const [savingVariants, setSavingVariants] = useState<string | null>(null);

  const { data: flags, loading, error, refetch } = useApiData(
    () => (project ? api.listFlags(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: environments } = useApiData(
    () => (project ? api.listEnvironments(project.id) : Promise.resolve([])),
    [project?.id]
  );

  const { data: segments } = useApiData(
    () => (project ? api.listSegments(project.id) : Promise.resolve([])),
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

  const envList = (environments ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
  }));

  async function handleToggle(flagKey: string, envId: string, currentEnabled: boolean) {
    try {
      await api.toggleFlag(project!.id, flagKey, envId, !currentEnabled);
      refetch();
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    setUpdating(true);
    try {
      await api.updateFlag(project!.id, editTarget.key, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        tags: editForm.tags ? editForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        archived: editForm.archived,
      });
      setEditTarget(null);
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  function openEdit(flag: Flag) {
    setEditTarget(flag);
    setEditForm({
      name: flag.name,
      description: flag.description ?? "",
      tags: flag.tags.join(", "),
      archived: flag.archived,
    });
  }

  function openVariantEditor(flag: Flag) {
    setVariantDrafts((prev) => ({
      ...prev,
      [flag.key]: flag.variants.map((v) => ({
        id: v.id,
        key: v.key,
        value: variantValueToString(v.value),
        description: v.description ?? "",
      })),
    }));
  }

  function toggleExpanded(flag: Flag) {
    const next = expandedFlag === flag.key ? null : flag.key;
    setExpandedFlag(next);
    if (next) openVariantEditor(flag);
  }

  function updateVariantDraft(flagKey: string, index: number, field: keyof VariantInput, value: string) {
    setVariantDrafts((prev) => {
      const draft = [...(prev[flagKey] ?? [])];
      draft[index] = { ...draft[index], [field]: value };
      return { ...prev, [flagKey]: draft };
    });
  }

  async function handleSaveVariants(flag: Flag) {
    const draft = variantDrafts[flag.key];
    if (!draft?.length) return;
    if (draft.some((v) => !v.key.trim())) {
      alert("Variant keys cannot be empty");
      return;
    }
    setSavingVariants(flag.key);
    try {
      const updated = await api.updateFlagVariants(
        project!.id,
        flag.key,
        draft.map((v) => ({
          id: v.id!,
          key: v.key.trim(),
          value: parseVariantValue(v.value, flag.flag_type),
          description: v.description.trim() || undefined,
        }))
      );
      setVariantDrafts((prev) => ({
        ...prev,
        [flag.key]: updated.variants.map((v) => ({
          id: v.id,
          key: v.key,
          value: variantValueToString(v.value),
          description: v.description ?? "",
        })),
      }));
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save variants");
    } finally {
      setSavingVariants(null);
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

  function addVariant() { setVariants([...variants, { key: "", value: "", description: "" }]); }
  function removeVariant(index: number) {
    if (variants.length <= 2) return;
    const next = variants.filter((_, i) => i !== index);
    setVariants(next);
    if (defaultVariantKey === variants[index].key) setDefaultVariantKey(next[0]?.key || "");
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
        <div className="grid grid-cols-[40px_1fr_80px_140px_200px_90px_80px] min-w-[800px] px-5 py-2.5 border-b border-border bg-bg-card">
          {["", "Flag", "Type", "Tags", "Environments", "Updated", ""].map((h, i) => (
            <span key={i} className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border min-w-[800px]">
          {filtered.map((flag) => {
            const prodEnv = flag.environments?.find((e) => e.environment_slug === "production");
            const firstEnvEnabled = prodEnv?.enabled ?? flag.environments?.[0]?.enabled ?? false;
            const isExpanded = expandedFlag === flag.key;
            return (
              <div key={flag.id}>
                <div
                  className={`grid grid-cols-[40px_1fr_80px_140px_200px_90px_80px] px-5 py-3 hover:bg-bg-card/50 transition-colors group items-center ${
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

                  <div className="min-w-0 pr-4 cursor-pointer" onClick={() => toggleExpanded(flag)}>
                    <div className="font-mono text-[0.7rem] text-text-primary group-hover:text-accent-red transition-colors truncate flex items-center gap-2">
                      {flag.key}
                      {isExpanded && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-accent-red flex-shrink-0">
                          <path d="M1 2L4 5L7 2" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      )}
                    </div>
                    <div className="font-mono text-[0.5rem] text-text-muted truncate">{flag.name}</div>
                  </div>

                  <span className="font-mono text-[0.5rem] text-text-muted/70 uppercase tracking-wider border border-border px-1.5 py-0.5 w-fit">{flag.flag_type}</span>

                  <div className="flex gap-1 flex-wrap">
                    {flag.tags.map((tag) => (
                      <span key={tag} className="font-mono text-[0.45rem] text-text-muted uppercase tracking-wider bg-bg-card border border-border px-1.5 py-0.5">{tag}</span>
                    ))}
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {(flag.environments ?? []).map((env) => (
                      <button
                        key={env.environment_id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(flag.key, env.environment_id, env.enabled);
                        }}
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                        title={`${env.environment_name}: click to ${env.enabled ? "disable" : "enable"}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${env.enabled ? "bg-green-500" : "bg-[#333]"}`} />
                        <span className="font-mono text-[0.45rem] text-text-muted uppercase">{env.environment_name.slice(0, 4)}</span>
                      </button>
                    ))}
                  </div>

                  <span className="font-mono text-[0.5rem] text-text-muted/60 text-right">{timeAgo(flag.updated_at)}</span>

                  <div className="flex justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(flag); }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all p-1"
                      title="Edit flag"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8 1l3 3-6 6H2V7l6-6z" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </button>
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

                {isExpanded && (
                  <ExpandedFlagPanel
                    flag={flag}
                    environments={envList}
                    segments={segments ?? []}
                    variantDraft={variantDrafts[flag.key] ?? []}
                    savingVariants={savingVariants === flag.key}
                    onVariantUpdate={(i, f, v) => updateVariantDraft(flag.key, i, f, v)}
                    onVariantSave={() => handleSaveVariants(flag)}
                  />
                )}
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
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Tags</label>
              <input
                type="text"
                value={newFlag.tags}
                onChange={(e) => setNewFlag({ ...newFlag, tags: e.target.value })}
                placeholder="frontend, experiment"
                className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em]">Variants</label>
              <button onClick={addVariant} className="font-mono text-[0.5rem] text-accent-red hover:text-accent-red-hover uppercase tracking-wider transition-colors">
                + Add Variant
              </button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={v.key}
                    onChange={(e) => updateVariant(i, "key", e.target.value)}
                    placeholder="Variant key"
                    readOnly={newFlag.flag_type === "boolean"}
                    className="flex-1 bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50 transition-colors"
                  />
                  <input
                    type="text"
                    value={v.value}
                    onChange={(e) => updateVariant(i, "value", e.target.value)}
                    placeholder="Value"
                    readOnly={newFlag.flag_type === "boolean"}
                    className="flex-1 bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50 transition-colors"
                  />
                  <input
                    type="text"
                    value={v.description}
                    onChange={(e) => updateVariant(i, "description", e.target.value)}
                    placeholder="Description"
                    className="flex-1 bg-bg-card border border-border px-2.5 py-1.5 font-mono text-[0.6rem] text-text-primary outline-none focus:border-accent-red/50 transition-colors"
                  />
                  {variants.length > 2 && (
                    <button onClick={() => removeVariant(i)} className="text-text-muted hover:text-accent-red transition-colors p-1.5 mt-0.5">
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

      {/* Edit Flag Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Flag">
        <div className="space-y-4">
          <SettingsFieldReadonly label="Flag Key" value={editTarget?.key ?? ""} />
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
            />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={2}
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="font-mono text-[0.5rem] text-text-muted uppercase tracking-[0.16em] mb-1.5 block">Tags (comma-separated)</label>
            <input
              type="text"
              value={editForm.tags}
              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              className="bg-bg-card border border-border px-3 py-2 font-mono text-[0.65rem] text-text-primary outline-none w-full focus:border-accent-red/50 transition-colors"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.archived}
              onChange={(e) => setEditForm({ ...editForm, archived: e.target.checked })}
              className="accent-accent-red"
            />
            <span className="font-mono text-[0.6rem] text-text-secondary uppercase tracking-wider">Archived</span>
          </label>
          <button
            onClick={handleUpdate}
            disabled={updating || !editForm.name.trim()}
            className="w-full font-mono text-[0.6rem] uppercase tracking-wider px-5 py-2.5 bg-accent-red text-white hover:bg-accent-red-hover transition-colors disabled:opacity-50"
          >
            {updating ? "Saving..." : "Save Changes"}
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
