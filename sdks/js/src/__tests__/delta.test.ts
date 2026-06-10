import { describe, expect, it } from "vitest";
import { applyConfigDelta } from "../delta";
import type { FlagConfig, FlagsConfig, Variant } from "../types";

function makeVariant(key: string, value: unknown): Variant {
  return {
    id: `variant-${key}`,
    key,
    value,
  };
}

function makeFlag(key: string): FlagConfig {
  const on = makeVariant("on", true);
  const off = makeVariant("off", false);
  return {
    key,
    flagType: "boolean",
    variants: [on, off],
    environment: {
      enabled: true,
      defaultVariantId: off.id,
      rules: [],
      overrides: [],
    },
  };
}

const baseConfig: FlagsConfig = {
  version: 5,
  flags: {
    "flag-a": makeFlag("flag-a"),
    "flag-b": makeFlag("flag-b"),
  },
  segments: {},
};

describe("applyConfigDelta", () => {
  it("patches changed flags and deletes removed keys", () => {
    const on = makeVariant("on", true);
    const result = applyConfigDelta(baseConfig, {
      seq: 42,
      from_version: 5,
      to_version: 6,
      changed_flags: {
        "flag-a": {
          key: "flag-a",
          flag_type: "boolean",
          variants: [on],
          environment: {
            enabled: true,
            default_variant_id: on.id,
            rules: [],
            overrides: [],
          },
        },
      },
      deleted_flags: ["flag-b"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.config.version).toBe(6);
    expect(result.config.flags["flag-a"].environment.defaultVariantId).toBe(on.id);
    expect(result.config.flags["flag-b"]).toBeUndefined();
    expect(result.config.segments).toEqual({});
  });

  it("returns version_mismatch when from_version does not match", () => {
    const result = applyConfigDelta(baseConfig, {
      from_version: 4,
      to_version: 6,
      changed_flags: {},
      deleted_flags: [],
    });

    expect(result).toEqual({ ok: false, reason: "version_mismatch" });
  });

  it("returns no_current_config when snapshot is missing", () => {
    const result = applyConfigDelta(null, {
      from_version: 5,
      to_version: 6,
      changed_flags: {},
      deleted_flags: [],
    });

    expect(result).toEqual({ ok: false, reason: "no_current_config" });
  });
});
