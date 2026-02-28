import type {
  FlagConfig,
  FlagsConfig,
  EvaluationContext,
  EvaluationResult,
  EvaluationReason,
  Segment,
  TargetingRule,
  Variant,
} from "./types";
import { bucket } from "./hasher";
import { evaluateOperator } from "./operators";

/**
 * Client-side evaluation engine — mirrors the Rust eval-core logic exactly.
 * Used by server-side SDKs for local, in-memory flag evaluation.
 */
export class Evaluator {
  private flags: Record<string, FlagConfig>;
  private segments: Record<string, Segment>;

  constructor(config?: FlagsConfig) {
    this.flags = config?.flags ?? {};
    this.segments = config?.segments ?? {};
  }

  /** Atomically update the config snapshot. */
  update(config: FlagsConfig): void {
    this.flags = config.flags;
    this.segments = config.segments;
  }

  /** Evaluate a single flag. */
  evaluate(
    flagKey: string,
    context: EvaluationContext,
    defaultValue: unknown,
  ): EvaluationResult {
    // 1. Lookup flag
    const flag = this.flags[flagKey];
    if (!flag) {
      return {
        flagKey,
        variantKey: "",
        value: defaultValue,
        reason: "FLAG_NOT_FOUND",
      };
    }

    const env = flag.environment;

    // 2. Flag disabled?
    if (!env.enabled) {
      const variant = this.findVariant(flag.variants, env.defaultVariantId);
      return {
        flagKey,
        variantKey: variant?.key ?? "",
        value: variant?.value ?? defaultValue,
        reason: "DISABLED",
      };
    }

    // 3. Check individual overrides
    if (context.targetingKey) {
      for (const ovr of env.overrides) {
        if (ovr.targetingKey === context.targetingKey) {
          const variant = this.findVariant(flag.variants, ovr.variantId);
          return {
            flagKey,
            variantKey: variant?.key ?? "",
            value: variant?.value ?? defaultValue,
            reason: "OVERRIDE",
          };
        }
      }
    }

    // 4. Walk targeting rules in rank order
    const sortedRules = [...env.rules].sort((a, b) => a.rank - b.rank);

    for (const rule of sortedRules) {
      if (this.evaluateRuleSegments(rule, context)) {
        return this.resolveRuleResult(flag, rule, context, defaultValue);
      }
    }

    // 5. No rule matched → default
    const variant = this.findVariant(flag.variants, env.defaultVariantId);
    return {
      flagKey,
      variantKey: variant?.key ?? "",
      value: variant?.value ?? defaultValue,
      reason: "DEFAULT",
    };
  }

  // ============================================================
  // Typed convenience methods
  // ============================================================

  getBooleanValue(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext = {},
  ): boolean {
    const result = this.evaluate(flagKey, context, defaultValue);
    return typeof result.value === "boolean" ? result.value : defaultValue;
  }

  getStringValue(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext = {},
  ): string {
    const result = this.evaluate(flagKey, context, defaultValue);
    return typeof result.value === "string" ? result.value : defaultValue;
  }

  getNumberValue(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext = {},
  ): number {
    const result = this.evaluate(flagKey, context, defaultValue);
    return typeof result.value === "number" ? result.value : defaultValue;
  }

  getJsonValue<T = unknown>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext = {},
  ): T {
    const result = this.evaluate(flagKey, context, defaultValue);
    return result.value as T;
  }

  // ============================================================
  // Private methods
  // ============================================================

  private evaluateRuleSegments(
    rule: TargetingRule,
    context: EvaluationContext,
  ): boolean {
    if (rule.segments.length === 0) return true;

    return rule.segments.every((ruleSeg) => {
      const segment = this.segments[ruleSeg.segmentId];
      const matches = segment
        ? this.evaluateSegment(segment, context)
        : false;
      return ruleSeg.negate ? !matches : matches;
    });
  }

  private evaluateSegment(
    segment: Segment,
    context: EvaluationContext,
  ): boolean {
    if (segment.constraints.length === 0) return true;

    const results = segment.constraints.map((c) =>
      this.evaluateConstraint(c.attribute, c.operator, c.values, context),
    );

    return segment.matchType === "all"
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  private evaluateConstraint(
    attribute: string,
    operator: string,
    values: string[],
    context: EvaluationContext,
  ): boolean {
    const attrValue =
      attribute === "targetingKey"
        ? context.targetingKey
        : context.attributes?.[attribute];

    if (attrValue === undefined || attrValue === null) return false;
    return evaluateOperator(
      operator as import("./types").Operator,
      attrValue,
      values,
    );
  }

  private resolveRuleResult(
    flag: FlagConfig,
    rule: TargetingRule,
    context: EvaluationContext,
    defaultValue: unknown,
  ): EvaluationResult {
    // Single variant
    if (rule.variantId) {
      const variant = this.findVariant(flag.variants, rule.variantId);
      return {
        flagKey: flag.key,
        variantKey: variant?.key ?? "",
        value: variant?.value ?? defaultValue,
        reason: "RULE_MATCH" as EvaluationReason,
        ruleId: rule.id,
      };
    }

    // Distribution (percentage rollout)
    if (rule.distributions.length > 0) {
      const targetingKey = context.targetingKey ?? "__anonymous__";
      const bucketValue = bucket(flag.key, targetingKey);

      let cumulative = 0;
      for (const dist of rule.distributions) {
        cumulative += dist.rolloutPct;
        if (bucketValue < cumulative) {
          const variant = this.findVariant(flag.variants, dist.variantId);
          return {
            flagKey: flag.key,
            variantKey: variant?.key ?? "",
            value: variant?.value ?? defaultValue,
            reason: "RULE_MATCH" as EvaluationReason,
            ruleId: rule.id,
          };
        }
      }
    }

    // Fallback to default
    const variant = this.findVariant(
      flag.variants,
      flag.environment.defaultVariantId,
    );
    return {
      flagKey: flag.key,
      variantKey: variant?.key ?? "",
      value: variant?.value ?? defaultValue,
      reason: "DEFAULT" as EvaluationReason,
    };
  }

  private findVariant(variants: Variant[], id: string): Variant | undefined {
    return variants.find((v) => v.id === id);
  }
}
