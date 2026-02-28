import type { EvaluationContext } from "@flagforge/sdk-js";
import type { UseFlagResult } from "../types";
import { useEvaluate } from "./use-evaluate";

/** Evaluate a JSON flag. Returns the value cast as `T`. */
export function useJsonFlag<T>(
  flagKey: string,
  defaultValue: T,
  context?: EvaluationContext,
): UseFlagResult<T> {
  const { rawValue, reason, loading } = useEvaluate(
    flagKey,
    context,
    defaultValue,
  );
  return { value: rawValue as T, reason, loading };
}
