import type { EvaluationContext } from "@flagforge/sdk-js";
import type { UseFlagResult } from "../types";
import { useEvaluate } from "./use-evaluate";

/** Evaluate a boolean flag. Returns `defaultValue` if the result is not a boolean. */
export function useBooleanFlag(
  flagKey: string,
  defaultValue: boolean,
  context?: EvaluationContext,
): UseFlagResult<boolean> {
  const { rawValue, reason, loading } = useEvaluate(
    flagKey,
    context,
    defaultValue,
  );
  const value = typeof rawValue === "boolean" ? rawValue : defaultValue;
  return { value, reason, loading };
}
