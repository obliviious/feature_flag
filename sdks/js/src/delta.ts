import type { FlagConfig, FlagsConfig } from "./types";
import { transformFlagsConfig } from "./transform";

export interface ConfigDelta {
  seq?: number;
  from_version: number;
  to_version: number;
  changed_flags: Record<string, unknown>;
  deleted_flags: string[];
}

export type ApplyDeltaResult =
  | { ok: true; config: FlagsConfig }
  | { ok: false; reason: "version_mismatch" | "no_current_config" };

/** Apply an SSE config_delta payload onto a local config snapshot. */
export function applyConfigDelta(
  current: FlagsConfig | null,
  delta: ConfigDelta,
): ApplyDeltaResult {
  if (!current) {
    return { ok: false, reason: "no_current_config" };
  }
  if (delta.from_version !== current.version) {
    return { ok: false, reason: "version_mismatch" };
  }

  const changedTransformed = transformFlagsConfig({
    flags: delta.changed_flags ?? {},
    segments: {},
    version: delta.to_version,
  });

  const nextFlags: Record<string, FlagConfig> = {
    ...current.flags,
    ...changedTransformed.flags,
  };
  for (const deletedKey of delta.deleted_flags ?? []) {
    delete nextFlags[deletedKey];
  }

  return {
    ok: true,
    config: {
      flags: nextFlags,
      // Segment deltas are not streamed yet; keep existing map.
      segments: current.segments,
      version: delta.to_version,
    },
  };
}
