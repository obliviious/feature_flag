import { describe, it, expect } from "vitest";
import { Evaluator } from "../evaluator";
import type {
  FlagsConfig,
  FlagConfig,
  Segment,
  Variant,
  EvaluationContext,
} from "@flagforge/shared-types";

function makeVariant(key: string, value: unknown): Variant {
  return {
    id: `variant-${key}-${Math.random().toString(36).slice(2, 10)}`,
    key,
    value,
  };
}

function makeSimpleFlag(
  key: string,
  enabled: boolean,
): { flag: FlagConfig; onId: string; offId: string } {
  const on = makeVariant("on", true);
  const off = makeVariant("off", false);
  return {
    flag: {
      key,
      flagType: "boolean",
      variants: [on, off],
      environment: {
        enabled,
        defaultVariantId: enabled ? on.id : off.id,
        rules: [],
        overrides: [],
      },
    },
    onId: on.id,
    offId: off.id,
  };
}

function makeEvaluator(
  flags: FlagConfig[],
  segments: Segment[] = [],
): Evaluator {
  const flagMap: Record<string, FlagConfig> = {};
  for (const f of flags) flagMap[f.key] = f;

  const segMap: Record<string, Segment> = {};
  for (const s of segments) segMap[s.id] = s;

  return new Evaluator({ flags: flagMap, segments: segMap, version: 1 });
}

describe("Evaluator", () => {
  it("returns FLAG_NOT_FOUND for unknown flags", () => {
    const evaluator = new Evaluator();
    const result = evaluator.evaluate("nonexistent", {}, false);
    expect(result.reason).toBe("FLAG_NOT_FOUND");
    expect(result.value).toBe(false);
  });

  it("returns DISABLED for disabled flags", () => {
    const { flag } = makeSimpleFlag("my-flag", false);
    const evaluator = makeEvaluator([flag]);
    const result = evaluator.evaluate("my-flag", {}, true);
    expect(result.reason).toBe("DISABLED");
    expect(result.value).toBe(false);
  });

  it("returns DEFAULT for enabled flags with no rules", () => {
    const { flag } = makeSimpleFlag("my-flag", true);
    const evaluator = makeEvaluator([flag]);
    const result = evaluator.evaluate("my-flag", {}, false);
    expect(result.reason).toBe("DEFAULT");
    expect(result.value).toBe(true);
  });

  it("returns OVERRIDE for matching user", () => {
    const { flag, onId, offId } = makeSimpleFlag("my-flag", true);
    flag.environment.defaultVariantId = offId;
    flag.environment.overrides = [
      { targetingKey: "user-123", variantId: onId },
    ];

    const evaluator = makeEvaluator([flag]);

    const result = evaluator.evaluate(
      "my-flag",
      { targetingKey: "user-123" },
      false,
    );
    expect(result.reason).toBe("OVERRIDE");
    expect(result.value).toBe(true);

    const result2 = evaluator.evaluate(
      "my-flag",
      { targetingKey: "user-456" },
      false,
    );
    expect(result2.reason).toBe("DEFAULT");
  });

  it("matches segment rules", () => {
    const on = makeVariant("on", true);
    const off = makeVariant("off", false);

    const segment: Segment = {
      id: "seg-us",
      key: "us-users",
      name: "US Users",
      matchType: "all",
      constraints: [
        { attribute: "country", operator: "eq", values: ["US"] },
      ],
    };

    const flag: FlagConfig = {
      key: "us-feature",
      flagType: "boolean",
      variants: [on, off],
      environment: {
        enabled: true,
        defaultVariantId: off.id,
        rules: [
          {
            id: "rule-1",
            rank: 1,
            segments: [{ segmentId: segment.id, negate: false }],
            distributions: [],
            variantId: on.id,
          },
        ],
        overrides: [],
      },
    };

    const evaluator = makeEvaluator([flag], [segment]);

    const usResult = evaluator.evaluate(
      "us-feature",
      { targetingKey: "user-1", attributes: { country: "US" } },
      false,
    );
    expect(usResult.reason).toBe("RULE_MATCH");
    expect(usResult.value).toBe(true);

    const ukResult = evaluator.evaluate(
      "us-feature",
      { targetingKey: "user-2", attributes: { country: "UK" } },
      false,
    );
    expect(ukResult.reason).toBe("DEFAULT");
    expect(ukResult.value).toBe(false);
  });

  it("handles percentage rollouts correctly", () => {
    const on = makeVariant("on", true);
    const off = makeVariant("off", false);

    const flag: FlagConfig = {
      key: "rollout-flag",
      flagType: "boolean",
      variants: [on, off],
      environment: {
        enabled: true,
        defaultVariantId: off.id,
        rules: [
          {
            id: "rule-1",
            rank: 1,
            segments: [],
            distributions: [
              { variantId: on.id, rolloutPct: 5000 },
              { variantId: off.id, rolloutPct: 5000 },
            ],
          },
        ],
        overrides: [],
      },
    };

    const evaluator = makeEvaluator([flag]);

    let onCount = 0;
    const total = 10000;
    for (let i = 0; i < total; i++) {
      const result = evaluator.evaluate(
        "rollout-flag",
        { targetingKey: `user-${i}` },
        false,
      );
      if (result.value === true) onCount++;
      expect(result.reason).toBe("RULE_MATCH");
    }

    const pct = (onCount / total) * 100;
    expect(pct).toBeGreaterThan(45);
    expect(pct).toBeLessThan(55);
  });

  it("evaluates rules in rank order", () => {
    const varA = makeVariant("a", "alpha");
    const varB = makeVariant("b", "beta");
    const varDefault = makeVariant("default", "default");

    const segment: Segment = {
      id: "seg-all",
      key: "everyone",
      name: "Everyone",
      matchType: "all",
      constraints: [],
    };

    const flag: FlagConfig = {
      key: "ordered-flag",
      flagType: "string",
      variants: [varA, varB, varDefault],
      environment: {
        enabled: true,
        defaultVariantId: varDefault.id,
        rules: [
          // Out of order — rank 2 listed first
          {
            id: "rule-2",
            rank: 2,
            segments: [{ segmentId: segment.id, negate: false }],
            distributions: [],
            variantId: varB.id,
          },
          {
            id: "rule-1",
            rank: 1,
            segments: [{ segmentId: segment.id, negate: false }],
            distributions: [],
            variantId: varA.id,
          },
        ],
        overrides: [],
      },
    };

    const evaluator = makeEvaluator([flag], [segment]);
    const result = evaluator.evaluate("ordered-flag", {}, "default");
    expect(result.reason).toBe("RULE_MATCH");
    expect(result.value).toBe("alpha"); // rank 1 wins
  });

  it("typed convenience methods work correctly", () => {
    const { flag } = makeSimpleFlag("bool-flag", true);
    const evaluator = makeEvaluator([flag]);

    expect(evaluator.getBooleanValue("bool-flag", false)).toBe(true);
    expect(evaluator.getBooleanValue("nonexistent", false)).toBe(false);
  });
});
