import type { EvaluationContext } from "@flagforge/sdk-js";
import type { UseFlagResult } from "../types";
import { useEvaluate } from "./use-evaluate";

/** Evaluate a flag and return the raw value. */
export function useFlag(
  flagKey: string,
  defaultValue?: unknown,
  context?: EvaluationContext,
): UseFlagResult<unknown> {
  const { rawValue, reason, loading } = useEvaluate(
    flagKey,
    context,
    defaultValue,
  );
  return { value: rawValue, reason, loading };
}
