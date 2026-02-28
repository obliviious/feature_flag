// ============================================================
// Core Types — mirrors eval-core Rust types
// ============================================================

export type FlagType = "boolean" | "string" | "number" | "json";

export interface Variant {
  id: string;
  key: string;
  value: unknown;
  description?: string;
}

export interface FlagEnvironment {
  enabled: boolean;
  defaultVariantId: string;
  rules: TargetingRule[];
  overrides: FlagOverride[];
}

export interface FlagOverride {
  targetingKey: string;
  variantId: string;
}

export interface TargetingRule {
  id: string;
  rank: number;
  description?: string;
  segments: RuleSegment[];
  distributions: RuleDistribution[];
  variantId?: string;
}

export interface RuleSegment {
  segmentId: string;
  negate: boolean;
}

export interface RuleDistribution {
  variantId: string;
  rolloutPct: number;
}

export interface Segment {
  id: string;
  key: string;
  name: string;
  matchType: MatchType;
  constraints: SegmentConstraint[];
}

export type MatchType = "all" | "any";

export interface SegmentConstraint {
  attribute: string;
  operator: Operator;
  values: string[];
}

export type Operator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "matches"
  | "semver_eq"
  | "semver_gt"
  | "semver_lt";

// ============================================================
// Flag Configuration
// ============================================================

export interface FlagConfig {
  key: string;
  flagType: FlagType;
  variants: Variant[];
  environment: FlagEnvironment;
}

// ============================================================
// Evaluation
// ============================================================

export interface EvaluationContext {
  targetingKey?: string;
  attributes?: Record<string, unknown>;
}

export type EvaluationReason =
  | "FLAG_NOT_FOUND"
  | "DISABLED"
  | "OVERRIDE"
  | "RULE_MATCH"
  | "DEFAULT"
  | "ERROR";

export interface EvaluationResult {
  flagKey: string;
  variantKey: string;
  value: unknown;
  reason: EvaluationReason;
  ruleId?: string;
}

// ============================================================
// Full Config Snapshot (sent to server SDKs)
// ============================================================

export interface FlagsConfig {
  flags: Record<string, FlagConfig>;
  segments: Record<string, Segment>;
  version: number;
}

// ============================================================
// API Types
// ============================================================

export interface EvaluateRequest {
  flagKey: string;
  context: EvaluationContext;
  defaultValue?: unknown;
}

export interface EvaluateBatchRequest {
  flags: EvaluateRequest[];
  context: EvaluationContext;
}

export interface EvaluateBatchResponse {
  results: EvaluationResult[];
}

// ============================================================
// Management API Types
// ============================================================

export interface CreateFlagRequest {
  key: string;
  name: string;
  description?: string;
  flagType: FlagType;
  tags?: string[];
  variants: Array<{
    key: string;
    value: unknown;
    description?: string;
  }>;
  defaultVariantKey: string;
}

export interface UpdateFlagRequest {
  name?: string;
  description?: string;
  tags?: string[];
  archived?: boolean;
}

export interface ToggleFlagRequest {
  enabled: boolean;
}

export interface CreateSegmentRequest {
  key: string;
  name: string;
  description?: string;
  matchType: MatchType;
  constraints: Array<{
    attribute: string;
    operator: Operator;
    values: string[];
  }>;
}

export interface AuditLogEntry {
  id: string;
  projectId: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// SDK Key Types
// ============================================================

export type SdkKeyType = "server" | "client";

export interface SdkKey {
  id: string;
  environmentId: string;
  name: string;
  keyType: SdkKeyType;
  keyPrefix: string;
  lastUsedAt?: string;
  createdAt: string;
}
