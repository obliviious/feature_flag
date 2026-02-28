import { describe, it, expect } from "vitest";
import { transformFlagsConfig, transformEvaluationResult } from "../transform";
import { parseSSE } from "../client";

describe("transformFlagsConfig", () => {
  it("transforms a full snake_case backend response to camelCase", () => {
    const raw = {
      flags: {
        "my-feature": {
          key: "my-feature",
          flag_type: "boolean",
          variants: [
            { id: "v1", key: "on", value: true, description: "Enabled" },
            { id: "v2", key: "off", value: false },
          ],
          environment: {
            enabled: true,
            default_variant_id: "v2",
            rules: [
              {
                id: "rule-1",
                rank: 1,
                description: "US users",
                segments: [{ segment_id: "seg-1", negate: false }],
                distributions: [
                  { variant_id: "v1", rollout_pct: 5000 },
                  { variant_id: "v2", rollout_pct: 5000 },
                ],
                variant_id: null,
              },
            ],
            overrides: [
              { targeting_key: "user-vip", variant_id: "v1" },
            ],
          },
        },
      },
      segments: {
        "seg-1": {
          id: "seg-1",
          key: "us-users",
          name: "US Users",
          match_type: "all",
          constraints: [
            { attribute: "country", operator: "eq", values: ["US"] },
          ],
        },
      },
      version: 42,
    };

    const config = transformFlagsConfig(raw);

    // Top-level
    expect(config.version).toBe(42);
    expect(Object.keys(config.flags)).toEqual(["my-feature"]);
    expect(Object.keys(config.segments)).toEqual(["seg-1"]);

    // Flag
    const flag = config.flags["my-feature"];
    expect(flag.key).toBe("my-feature");
    expect(flag.flagType).toBe("boolean");
    expect(flag.variants).toHaveLength(2);
    expect(flag.variants[0].description).toBe("Enabled");
    expect(flag.variants[1].description).toBeUndefined();

    // Environment
    expect(flag.environment.enabled).toBe(true);
    expect(flag.environment.defaultVariantId).toBe("v2");

    // Rule
    const rule = flag.environment.rules[0];
    expect(rule.id).toBe("rule-1");
    expect(rule.rank).toBe(1);
    expect(rule.description).toBe("US users");
    expect(rule.segments[0].segmentId).toBe("seg-1");
    expect(rule.segments[0].negate).toBe(false);
    expect(rule.distributions[0].variantId).toBe("v1");
    expect(rule.distributions[0].rolloutPct).toBe(5000);
    expect(rule.distributions[1].variantId).toBe("v2");
    expect(rule.distributions[1].rolloutPct).toBe(5000);

    // Override
    expect(flag.environment.overrides[0].targetingKey).toBe("user-vip");
    expect(flag.environment.overrides[0].variantId).toBe("v1");

    // Segment
    const seg = config.segments["seg-1"];
    expect(seg.id).toBe("seg-1");
    expect(seg.key).toBe("us-users");
    expect(seg.matchType).toBe("all");
    expect(seg.constraints[0].attribute).toBe("country");
    expect(seg.constraints[0].operator).toBe("eq");
    expect(seg.constraints[0].values).toEqual(["US"]);
  });

  it("handles empty config", () => {
    const config = transformFlagsConfig({ flags: {}, segments: {}, version: 0 });
    expect(config.flags).toEqual({});
    expect(config.segments).toEqual({});
    expect(config.version).toBe(0);
  });

  it("preserves flag keys with underscores", () => {
    const raw = {
      flags: {
        "my_feature_flag": {
          key: "my_feature_flag",
          flag_type: "string",
          variants: [{ id: "v1", key: "control", value: "a" }],
          environment: {
            enabled: true,
            default_variant_id: "v1",
            rules: [],
            overrides: [],
          },
        },
      },
      segments: {},
      version: 1,
    };

    const config = transformFlagsConfig(raw);
    // Flag key should NOT be camelCased
    expect(config.flags["my_feature_flag"]).toBeDefined();
    expect(config.flags["my_feature_flag"].key).toBe("my_feature_flag");
    // But struct fields should be
    expect(config.flags["my_feature_flag"].flagType).toBe("string");
  });

  it("handles rule with variantId (single variant, no distributions)", () => {
    const raw = {
      flags: {
        "flag-1": {
          key: "flag-1",
          flag_type: "boolean",
          variants: [
            { id: "v1", key: "on", value: true },
            { id: "v2", key: "off", value: false },
          ],
          environment: {
            enabled: true,
            default_variant_id: "v2",
            rules: [
              {
                id: "rule-1",
                rank: 1,
                segments: [],
                distributions: [],
                variant_id: "v1",
              },
            ],
            overrides: [],
          },
        },
      },
      segments: {},
      version: 1,
    };

    const config = transformFlagsConfig(raw);
    expect(config.flags["flag-1"].environment.rules[0].variantId).toBe("v1");
  });
});

describe("transformEvaluationResult", () => {
  it("transforms snake_case evaluation result", () => {
    const raw = {
      flag_key: "my-feature",
      variant_key: "on",
      value: true,
      reason: "RULE_MATCH",
      rule_id: "rule-123",
    };

    const result = transformEvaluationResult(raw);
    expect(result.flagKey).toBe("my-feature");
    expect(result.variantKey).toBe("on");
    expect(result.value).toBe(true);
    expect(result.reason).toBe("RULE_MATCH");
    expect(result.ruleId).toBe("rule-123");
  });

  it("omits ruleId when not present", () => {
    const raw = {
      flag_key: "my-feature",
      variant_key: "off",
      value: false,
      reason: "DEFAULT",
    };

    const result = transformEvaluationResult(raw);
    expect(result.ruleId).toBeUndefined();
  });
});

describe("parseSSE", () => {
  it("parses a single complete event", () => {
    const buffer = 'event: config\ndata: {"version":1}\n\n';
    const { events, remaining } = parseSSE(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("config");
    expect(events[0].data).toBe('{"version":1}');
    expect(remaining).toBe("");
  });

  it("parses multiple events", () => {
    const buffer =
      'event: config\ndata: {"version":1}\n\nevent: config\ndata: {"version":2}\n\n';
    const { events, remaining } = parseSSE(buffer);
    expect(events).toHaveLength(2);
    expect(events[0].data).toBe('{"version":1}');
    expect(events[1].data).toBe('{"version":2}');
  });

  it("keeps incomplete events in remaining buffer", () => {
    const buffer = 'event: config\ndata: {"ver';
    const { events, remaining } = parseSSE(buffer);
    expect(events).toHaveLength(0);
    expect(remaining).toBe(buffer);
  });

  it("ignores comment lines (keepalive)", () => {
    const buffer = ': keepalive\n\nevent: config\ndata: {"v":1}\n\n';
    const { events, remaining } = parseSSE(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("config");
  });

  it("handles error events", () => {
    const buffer = 'event: error\ndata: Failed to load config\n\n';
    const { events, remaining } = parseSSE(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(events[0].data).toBe("Failed to load config");
  });

  it("handles multi-line data", () => {
    const buffer = 'event: config\ndata: {"flags":\ndata: {}}\n\n';
    const { events, remaining } = parseSSE(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('{"flags":\n{}}');
  });

  it("returns empty events for empty buffer", () => {
    const { events, remaining } = parseSSE("");
    expect(events).toHaveLength(0);
    expect(remaining).toBe("");
  });

  it("separates complete events from partial", () => {
    const buffer =
      'event: config\ndata: {"v":1}\n\nevent: config\ndata: {"v":2';
    const { events, remaining } = parseSSE(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('{"v":1}');
    expect(remaining).toBe('event: config\ndata: {"v":2');
  });
});
