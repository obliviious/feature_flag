export { FlagForgeClient, type FlagForgeConfig } from "./client";
export { Evaluator } from "./evaluator";
export { murmurhash3, bucket } from "./hasher";
export type {
  FlagConfig,
  FlagType,
  Variant,
  FlagEnvironment,
  EvaluationContext,
  EvaluationResult,
  EvaluationReason,
  FlagsConfig,
  Segment,
  SegmentConstraint,
  Operator,
  MatchType,
} from "@flagforge/shared-types";
