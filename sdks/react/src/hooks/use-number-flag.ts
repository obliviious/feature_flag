import type { EvaluationContext } from "@flagforge/sdk-js";
import type { UseFlagResult } from "../types";
import { useEvaluate } from "./use-evaluate";

/** Evaluate a number flag. Returns `defaultValue` if the result is not a number. */
export function useNumberFlag(
  flagKey: string,
  defaultValue: number,
  context?: EvaluationContext,
): UseFlagResult<number> {
  const { rawValue, reason, loading } = useEvaluate(
    flagKey,
    context,
    defaultValue,
  );
  const value = typeof rawValue === "number" ? rawValue : defaultValue;
  return { value, reason, loading };
}
