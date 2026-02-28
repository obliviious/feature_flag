import type { ReactNode } from "react";
import type {
  FlagForgeClient,
  FlagForgeConfig,
  EvaluationReason,
} from "@flagforge/sdk-js";

/** Props for the <FlagForgeProvider> component. */
export interface FlagForgeProviderProps {
  /** SDK configuration (onUpdate/onReady/onError are managed by the provider). */
  config: Omit<FlagForgeConfig, "onUpdate" | "onReady" | "onError">;
  /** Called when the config is updated (via stream or poll). */
  onUpdate?: FlagForgeConfig["onUpdate"];
  /** Called on errors. */
  onError?: FlagForgeConfig["onError"];
  /** Called when the client has fetched initial config and is ready. */
  onReady?: FlagForgeConfig["onReady"];
  children: ReactNode;
}

/** Value exposed via React context. */
export interface FlagForgeContextValue {
  client: FlagForgeClient;
  isReady: boolean;
  error: Error | null;
  /** Incremented on every SSE/polling update — triggers hook re-evaluation. */
  updateCount: number;
}

/** Return type for flag evaluation hooks. */
export interface UseFlagResult<T> {
  value: T;
  reason: EvaluationReason | null;
  loading: boolean;
}
