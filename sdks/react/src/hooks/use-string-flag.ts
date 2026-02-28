import type { EvaluationContext } from "@flagforge/sdk-js";
import type { UseFlagResult } from "../types";
import { useEvaluate } from "./use-evaluate";

/** Evaluate a string flag. Returns `defaultValue` if the result is not a string. */
export function useStringFlag(
  flagKey: string,
  defaultValue: string,
  context?: EvaluationContext,
): UseFlagResult<string> {
  const { rawValue, reason, loading } = useEvaluate(
    flagKey,
    context,
    defaultValue,
  );
  const value = typeof rawValue === "string" ? rawValue : defaultValue;
  return { value, reason, loading };
}
