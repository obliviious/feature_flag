import type {
  FlagsConfig,
  FlagConfig,
  FlagEnvironment,
  TargetingRule,
  RuleSegment,
  RuleDistribution,
  FlagOverride,
  Segment,
  SegmentConstraint,
  Variant,
  EvaluationResult,
} from "./types";

/**
 * Transform backend snake_case JSON responses into SDK camelCase types.
 *
 * The backend serializes all struct fields as snake_case (e.g. flag_type,
 * default_variant_id, rollout_pct). The SDK uses camelCase internally.
 * These functions perform the explicit field-by-field mapping so flag keys
 * and attribute names (which may contain underscores) are never mangled.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function transformFlagsConfig(raw: any): FlagsConfig {
  const flags: Record<string, FlagConfig> = {};
  for (const [key, rawFlag] of Object.entries(raw.flags ?? {})) {
    flags[key] = transformFlagConfig(rawFlag);
  }

  const segments: Record<string, Segment> = {};
  for (const [key, rawSeg] of Object.entries(raw.segments ?? {})) {
    segments[key] = transformSegment(rawSeg);
  }

  return { flags, segments, version: raw.version };
}

function transformFlagConfig(raw: any): FlagConfig {
  return {
    key: raw.key,
    flagType: raw.flag_type,
    variants: (raw.variants ?? []).map(transformVariant),
    environment: transformFlagEnvironment(raw.environment),
  };
}

function transformVariant(raw: any): Variant {
  return {
    id: raw.id,
    key: raw.key,
    value: raw.value,
    ...(raw.description != null && { description: raw.description }),
  };
}

function transformFlagEnvironment(raw: any): FlagEnvironment {
  return {
    enabled: raw.enabled,
    defaultVariantId: raw.default_variant_id,
    rules: (raw.rules ?? []).map(transformTargetingRule),
    overrides: (raw.overrides ?? []).map(transformFlagOverride),
  };
}

function transformTargetingRule(raw: any): TargetingRule {
  return {
    id: raw.id,
    rank: raw.rank,
    ...(raw.description != null && { description: raw.description }),
    segments: (raw.segments ?? []).map(transformRuleSegment),
    distributions: (raw.distributions ?? []).map(transformRuleDistribution),
    ...(raw.variant_id != null && { variantId: raw.variant_id }),
  };
}

function transformRuleSegment(raw: any): RuleSegment {
  return {
    segmentId: raw.segment_id,
    negate: raw.negate,
  };
}

function transformRuleDistribution(raw: any): RuleDistribution {
  return {
    variantId: raw.variant_id,
    rolloutPct: raw.rollout_pct,
  };
}

function transformFlagOverride(raw: any): FlagOverride {
  return {
    targetingKey: raw.targeting_key,
    variantId: raw.variant_id,
  };
}

function transformSegment(raw: any): Segment {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    matchType: raw.match_type,
    constraints: (raw.constraints ?? []).map(transformConstraint),
  };
}

function transformConstraint(raw: any): SegmentConstraint {
  return {
    attribute: raw.attribute,
    operator: raw.operator,
    values: raw.values,
  };
}

export function transformEvaluationResult(raw: any): EvaluationResult {
  return {
    flagKey: raw.flag_key,
    variantKey: raw.variant_key,
    value: raw.value,
    reason: raw.reason,
    ...(raw.rule_id != null && { ruleId: raw.rule_id }),
  };
}
