use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// The type of value a flag can hold.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FlagType {
    Boolean,
    String,
    Number,
    Json,
}

/// A single variant of a feature flag.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variant {
    pub id: Uuid,
    pub key: String,
    pub value: serde_json::Value,
    pub description: Option<String>,
}

/// Per-environment flag configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagEnvironment {
    pub enabled: bool,
    pub default_variant_id: Uuid,
    pub rules: Vec<TargetingRule>,
    pub overrides: Vec<FlagOverride>,
}

/// An individual user override.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagOverride {
    pub targeting_key: String,
    pub variant_id: Uuid,
}

/// A targeting rule with optional segment matching + distribution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetingRule {
    pub id: Uuid,
    pub rank: i32,
    pub description: Option<String>,
    pub segments: Vec<RuleSegment>,
    pub distributions: Vec<RuleDistribution>,
    /// If no distributions, serve this variant directly.
    pub variant_id: Option<Uuid>,
}

/// A segment reference within a rule.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleSegment {
    pub segment_id: Uuid,
    pub negate: bool,
}

/// Distribution bucket for percentage rollouts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleDistribution {
    pub variant_id: Uuid,
    /// Cumulative percentage in basis points (0–10000).
    pub rollout_pct: i32,
}

/// A reusable segment with constraints.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Segment {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub match_type: MatchType,
    pub constraints: Vec<SegmentConstraint>,
}

/// How constraints are combined within a segment.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MatchType {
    All,
    Any,
}

/// A single constraint within a segment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentConstraint {
    pub attribute: String,
    pub operator: Operator,
    pub values: Vec<String>,
}

/// All supported comparison operators.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Operator {
    Eq,
    Neq,
    Gt,
    Gte,
    Lt,
    Lte,
    In,
    NotIn,
    Contains,
    StartsWith,
    EndsWith,
    Matches,
    SemverEq,
    SemverGt,
    SemverLt,
}

/// Complete flag configuration for evaluation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagConfig {
    pub key: String,
    pub flag_type: FlagType,
    pub variants: Vec<Variant>,
    pub environment: FlagEnvironment,
}

/// The evaluation context provided by the caller.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EvaluationContext {
    /// The primary key for targeting (usually user ID).
    pub targeting_key: Option<String>,
    /// Arbitrary attributes for segment matching.
    #[serde(default)]
    pub attributes: HashMap<String, serde_json::Value>,
}

/// Why a particular variant was chosen.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EvaluationReason {
    FlagNotFound,
    Disabled,
    Override,
    RuleMatch,
    Default,
    Error,
}

/// The result of evaluating a flag.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationResult {
    pub flag_key: String,
    pub variant_key: String,
    pub value: serde_json::Value,
    pub reason: EvaluationReason,
    pub rule_id: Option<Uuid>,
}

/// Full configuration snapshot sent to server SDKs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagsConfig {
    pub flags: HashMap<String, FlagConfig>,
    pub segments: HashMap<Uuid, Segment>,
    pub version: i64,
}
