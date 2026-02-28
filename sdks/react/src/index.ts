// Components
export { FlagForgeProvider } from "./provider";

// Hooks
export {
  useFlagForge,
  useFlag,
  useBooleanFlag,
  useStringFlag,
  useNumberFlag,
  useJsonFlag,
} from "./hooks";

// React SDK types
export type {
  FlagForgeProviderProps,
  FlagForgeContextValue,
  UseFlagResult,
} from "./types";

// Re-export commonly needed types from the JS SDK
export type {
  EvaluationContext,
  EvaluationResult,
  EvaluationReason,
  FlagForgeConfig,
} from "@flagforge/sdk-js";
