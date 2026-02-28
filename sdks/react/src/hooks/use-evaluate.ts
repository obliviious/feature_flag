import { useEffect, useRef, useState } from "react";
import type { EvaluationContext, EvaluationReason } from "@flagforge/sdk-js";
import { useFlagForge } from "./use-flagforge";

interface UseEvaluateResult {
  rawValue: unknown;
  reason: EvaluationReason | null;
  loading: boolean;
}

/**
 * Internal shared evaluation hook — not exported from the public API.
 * Re-evaluates whenever updateCount changes (SSE/polling update).
 */
export function useEvaluate(
  flagKey: string,
  context: EvaluationContext | undefined,
  defaultValue: unknown,
): UseEvaluateResult {
  const { client, updateCount, isReady } = useFlagForge();
  const [result, setResult] = useState<UseEvaluateResult>({
    rawValue: defaultValue,
    reason: null,
    loading: true,
  });

  // Stale-result guard: ensures only the latest evaluation is applied.
  const evaluationIdRef = useRef(0);

  // Store object args in refs, use serialized versions as effect deps
  // to avoid infinite re-render loops from new object references.
  const contextRef = useRef(context);
  contextRef.current = context;
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const contextJson = context !== undefined ? JSON.stringify(context) : "";
  const defaultValueJson = JSON.stringify(defaultValue);

  useEffect(() => {
    if (!isReady) return;

    const id = ++evaluationIdRef.current;

    client
      .evaluate(flagKey, contextRef.current, defaultValueRef.current)
      .then((evalResult) => {
        if (id === evaluationIdRef.current) {
          setResult({
            rawValue: evalResult.value,
            reason: evalResult.reason,
            loading: false,
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, flagKey, contextJson, defaultValueJson, updateCount, isReady]);

  return result;
}
