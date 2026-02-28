use std::collections::HashMap;
use uuid::Uuid;

use crate::hasher;
use crate::operators::evaluate_operator;
use crate::types::*;

/// The core evaluation engine. Holds all flag configs and segments in memory
/// for zero-latency evaluation.
pub struct Evaluator {
    flags: HashMap<String, FlagConfig>,
    segments: HashMap<Uuid, Segment>,
}

impl Evaluator {
    /// Create a new evaluator from a config snapshot.
    pub fn new(config: FlagsConfig) -> Self {
        Self {
            flags: config.flags,
            segments: config.segments,
        }
    }

    /// Create an empty evaluator.
    pub fn empty() -> Self {
        Self {
            flags: HashMap::new(),
            segments: HashMap::new(),
        }
    }

    /// Update the evaluator with a new config snapshot (atomic swap).
    pub fn update(&mut self, config: FlagsConfig) {
        self.flags = config.flags;
        self.segments = config.segments;
    }

    /// Evaluate a single flag.
    pub fn evaluate(
        &self,
        flag_key: &str,
        context: &EvaluationContext,
        default_value: &serde_json::Value,
    ) -> EvaluationResult {
        // 1. Lookup flag
        let Some(flag) = self.flags.get(flag_key) else {
            return EvaluationResult {
                flag_key: flag_key.to_string(),
                variant_key: String::new(),
                value: default_value.clone(),
                reason: EvaluationReason::FlagNotFound,
                rule_id: None,
            };
        };

        let env = &flag.environment;

        // 2. Flag disabled?
        if !env.enabled {
            let variant = self.find_variant(&flag.variants, env.default_variant_id);
            return EvaluationResult {
                flag_key: flag_key.to_string(),
                variant_key: variant.map(|v| v.key.clone()).unwrap_or_default(),
                value: variant
                    .map(|v| v.value.clone())
                    .unwrap_or_else(|| default_value.clone()),
                reason: EvaluationReason::Disabled,
                rule_id: None,
            };
        }

        // 3. Check individual overrides
        if let Some(targeting_key) = &context.targeting_key {
            for ovr in &env.overrides {
                if ovr.targeting_key == *targeting_key {
                    let variant = self.find_variant(&flag.variants, ovr.variant_id);
                    return EvaluationResult {
                        flag_key: flag_key.to_string(),
                        variant_key: variant.map(|v| v.key.clone()).unwrap_or_default(),
                        value: variant
                            .map(|v| v.value.clone())
                            .unwrap_or_else(|| default_value.clone()),
                        reason: EvaluationReason::Override,
                        rule_id: None,
                    };
                }
            }
        }

        // 4. Walk targeting rules in rank order
        let mut rules = env.rules.clone();
        rules.sort_by_key(|r| r.rank);

        for rule in &rules {
            if self.evaluate_rule_segments(rule, context) {
                return self.resolve_rule_result(flag, rule, context, default_value);
            }
        }

        // 5. No rule matched → default
        let variant = self.find_variant(&flag.variants, env.default_variant_id);
        EvaluationResult {
            flag_key: flag_key.to_string(),
            variant_key: variant.map(|v| v.key.clone()).unwrap_or_default(),
            value: variant
                .map(|v| v.value.clone())
                .unwrap_or_else(|| default_value.clone()),
            reason: EvaluationReason::Default,
            rule_id: None,
        }
    }

    /// Evaluate all segments referenced by a rule.
    fn evaluate_rule_segments(&self, rule: &TargetingRule, context: &EvaluationContext) -> bool {
        if rule.segments.is_empty() {
            // A rule with no segments always matches (e.g., a catch-all rollout rule)
            return true;
        }

        // All referenced segments must match (AND logic between segments in a rule)
        rule.segments.iter().all(|rule_seg| {
            let matches = self
                .segments
                .get(&rule_seg.segment_id)
                .map(|segment| self.evaluate_segment(segment, context))
                .unwrap_or(false);

            if rule_seg.negate {
                !matches
            } else {
                matches
            }
        })
    }

    /// Evaluate a single segment against context.
    fn evaluate_segment(&self, segment: &Segment, context: &EvaluationContext) -> bool {
        if segment.constraints.is_empty() {
            return true;
        }

        let results = segment
            .constraints
            .iter()
            .map(|constraint| self.evaluate_constraint(constraint, context));

        match segment.match_type {
            MatchType::All => results.fold(true, |acc, r| acc && r),
            MatchType::Any => results.fold(false, |acc, r| acc || r),
        }
    }

    /// Evaluate a single constraint against context attributes.
    fn evaluate_constraint(
        &self,
        constraint: &SegmentConstraint,
        context: &EvaluationContext,
    ) -> bool {
        // Check targeting_key as a special attribute
        let attr_value = if constraint.attribute == "targetingKey" {
            context
                .targeting_key
                .as_ref()
                .map(|k| serde_json::Value::String(k.clone()))
        } else {
            context.attributes.get(&constraint.attribute).cloned()
        };

        let Some(value) = attr_value else {
            return false;
        };

        evaluate_operator(&constraint.operator, &value, &constraint.values)
    }

    /// Resolve a matched rule to a concrete variant.
    fn resolve_rule_result(
        &self,
        flag: &FlagConfig,
        rule: &TargetingRule,
        context: &EvaluationContext,
        default_value: &serde_json::Value,
    ) -> EvaluationResult {
        // If a single variant is specified, return it
        if let Some(variant_id) = rule.variant_id {
            let variant = self.find_variant(&flag.variants, variant_id);
            return EvaluationResult {
                flag_key: flag.key.clone(),
                variant_key: variant.map(|v| v.key.clone()).unwrap_or_default(),
                value: variant
                    .map(|v| v.value.clone())
                    .unwrap_or_else(|| default_value.clone()),
                reason: EvaluationReason::RuleMatch,
                rule_id: Some(rule.id),
            };
        }

        // Distribution — percentage-based rollout
        if !rule.distributions.is_empty() {
            let targeting_key = context
                .targeting_key
                .as_deref()
                .unwrap_or("__anonymous__");

            let bucket_value = hasher::bucket(&flag.key, targeting_key);

            let mut cumulative = 0;
            for dist in &rule.distributions {
                cumulative += dist.rollout_pct;
                if bucket_value < cumulative {
                    let variant = self.find_variant(&flag.variants, dist.variant_id);
                    return EvaluationResult {
                        flag_key: flag.key.clone(),
                        variant_key: variant.map(|v| v.key.clone()).unwrap_or_default(),
                        value: variant
                            .map(|v| v.value.clone())
                            .unwrap_or_else(|| default_value.clone()),
                        reason: EvaluationReason::RuleMatch,
                        rule_id: Some(rule.id),
                    };
                }
            }
        }

        // Fallback to default
        let variant = self.find_variant(&flag.variants, flag.environment.default_variant_id);
        EvaluationResult {
            flag_key: flag.key.clone(),
            variant_key: variant.map(|v| v.key.clone()).unwrap_or_default(),
            value: variant
                .map(|v| v.value.clone())
                .unwrap_or_else(|| default_value.clone()),
            reason: EvaluationReason::Default,
            rule_id: None,
        }
    }

    fn find_variant<'a>(&self, variants: &'a [Variant], id: Uuid) -> Option<&'a Variant> {
        variants.iter().find(|v| v.id == id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn make_variant(key: &str, value: serde_json::Value) -> Variant {
        Variant {
            id: Uuid::new_v4(),
            key: key.to_string(),
            value,
            description: None,
        }
    }

    fn make_simple_flag(key: &str, enabled: bool) -> (FlagConfig, Uuid, Uuid) {
        let on_variant = make_variant("on", json!(true));
        let off_variant = make_variant("off", json!(false));
        let on_id = on_variant.id;
        let off_id = off_variant.id;
        let default_id = if enabled { on_id } else { off_id };

        let config = FlagConfig {
            key: key.to_string(),
            flag_type: FlagType::Boolean,
            variants: vec![on_variant, off_variant],
            environment: FlagEnvironment {
                enabled,
                default_variant_id: default_id,
                rules: vec![],
                overrides: vec![],
            },
        };

        (config, on_id, off_id)
    }

    fn make_evaluator(
        flags: Vec<FlagConfig>,
        segments: Vec<Segment>,
    ) -> Evaluator {
        let mut flag_map = HashMap::new();
        for f in flags {
            flag_map.insert(f.key.clone(), f);
        }
        let mut seg_map = HashMap::new();
        for s in segments {
            seg_map.insert(s.id, s);
        }
        Evaluator::new(FlagsConfig {
            flags: flag_map,
            segments: seg_map,
            version: 1,
        })
    }

    #[test]
    fn test_flag_not_found() {
        let evaluator = Evaluator::empty();
        let result = evaluator.evaluate("nonexistent", &EvaluationContext::default(), &json!(false));
        assert_eq!(result.reason, EvaluationReason::FlagNotFound);
        assert_eq!(result.value, json!(false));
    }

    #[test]
    fn test_disabled_flag() {
        let (flag, _, _) = make_simple_flag("my-flag", false);
        let evaluator = make_evaluator(vec![flag], vec![]);
        let result = evaluator.evaluate("my-flag", &EvaluationContext::default(), &json!(true));
        assert_eq!(result.reason, EvaluationReason::Disabled);
        assert_eq!(result.value, json!(false));
    }

    #[test]
    fn test_enabled_flag_default() {
        let (flag, _, _) = make_simple_flag("my-flag", true);
        let evaluator = make_evaluator(vec![flag], vec![]);
        let result = evaluator.evaluate("my-flag", &EvaluationContext::default(), &json!(false));
        assert_eq!(result.reason, EvaluationReason::Default);
        assert_eq!(result.value, json!(true));
    }

    #[test]
    fn test_override() {
        let (mut flag, on_id, _off_id) = make_simple_flag("my-flag", true);
        flag.environment.default_variant_id = flag.variants[1].id; // default to off
        flag.environment.overrides.push(FlagOverride {
            targeting_key: "user-123".to_string(),
            variant_id: on_id,
        });

        let evaluator = make_evaluator(vec![flag], vec![]);

        let ctx = EvaluationContext {
            targeting_key: Some("user-123".to_string()),
            attributes: HashMap::new(),
        };
        let result = evaluator.evaluate("my-flag", &ctx, &json!(false));
        assert_eq!(result.reason, EvaluationReason::Override);
        assert_eq!(result.value, json!(true));

        // Different user should get default
        let ctx2 = EvaluationContext {
            targeting_key: Some("user-456".to_string()),
            attributes: HashMap::new(),
        };
        let result2 = evaluator.evaluate("my-flag", &ctx2, &json!(false));
        assert_eq!(result2.reason, EvaluationReason::Default);
    }

    #[test]
    fn test_rule_with_segment() {
        let on_variant = make_variant("on", json!(true));
        let off_variant = make_variant("off", json!(false));
        let on_id = on_variant.id;

        let segment = Segment {
            id: Uuid::new_v4(),
            key: "us-users".to_string(),
            name: "US Users".to_string(),
            match_type: MatchType::All,
            constraints: vec![SegmentConstraint {
                attribute: "country".to_string(),
                operator: Operator::Eq,
                values: vec!["US".to_string()],
            }],
        };

        let rule = TargetingRule {
            id: Uuid::new_v4(),
            rank: 1,
            description: Some("Target US users".to_string()),
            segments: vec![RuleSegment {
                segment_id: segment.id,
                negate: false,
            }],
            distributions: vec![],
            variant_id: Some(on_id),
        };

        let flag = FlagConfig {
            key: "us-feature".to_string(),
            flag_type: FlagType::Boolean,
            variants: vec![on_variant, off_variant.clone()],
            environment: FlagEnvironment {
                enabled: true,
                default_variant_id: off_variant.id,
                rules: vec![rule],
                overrides: vec![],
            },
        };

        let evaluator = make_evaluator(vec![flag], vec![segment]);

        // US user should match
        let ctx_us = EvaluationContext {
            targeting_key: Some("user-1".to_string()),
            attributes: HashMap::from([("country".to_string(), json!("US"))]),
        };
        let result = evaluator.evaluate("us-feature", &ctx_us, &json!(false));
        assert_eq!(result.reason, EvaluationReason::RuleMatch);
        assert_eq!(result.value, json!(true));

        // UK user should get default
        let ctx_uk = EvaluationContext {
            targeting_key: Some("user-2".to_string()),
            attributes: HashMap::from([("country".to_string(), json!("UK"))]),
        };
        let result = evaluator.evaluate("us-feature", &ctx_uk, &json!(false));
        assert_eq!(result.reason, EvaluationReason::Default);
        assert_eq!(result.value, json!(false));
    }

    #[test]
    fn test_percentage_rollout() {
        let on_variant = make_variant("on", json!(true));
        let off_variant = make_variant("off", json!(false));
        let on_id = on_variant.id;
        let off_id = off_variant.id;

        let rule = TargetingRule {
            id: Uuid::new_v4(),
            rank: 1,
            description: Some("50/50 rollout".to_string()),
            segments: vec![], // catch-all
            distributions: vec![
                RuleDistribution {
                    variant_id: on_id,
                    rollout_pct: 5000, // 50%
                },
                RuleDistribution {
                    variant_id: off_id,
                    rollout_pct: 5000, // 50%
                },
            ],
            variant_id: None,
        };

        let flag = FlagConfig {
            key: "rollout-flag".to_string(),
            flag_type: FlagType::Boolean,
            variants: vec![on_variant, off_variant.clone()],
            environment: FlagEnvironment {
                enabled: true,
                default_variant_id: off_variant.id,
                rules: vec![rule],
                overrides: vec![],
            },
        };

        let evaluator = make_evaluator(vec![flag], vec![]);

        let mut on_count = 0;
        let total = 10_000;
        for i in 0..total {
            let ctx = EvaluationContext {
                targeting_key: Some(format!("user-{i}")),
                attributes: HashMap::new(),
            };
            let result = evaluator.evaluate("rollout-flag", &ctx, &json!(false));
            if result.value == json!(true) {
                on_count += 1;
            }
            assert_eq!(result.reason, EvaluationReason::RuleMatch);
        }

        // Should be roughly 50% — allow 5% tolerance
        let pct = (on_count as f64 / total as f64) * 100.0;
        assert!(
            (45.0..55.0).contains(&pct),
            "Expected ~50% on, got {pct:.1}%"
        );
    }

    #[test]
    fn test_rule_ordering() {
        let variant_a = make_variant("a", json!("alpha"));
        let variant_b = make_variant("b", json!("beta"));
        let variant_default = make_variant("default", json!("default"));

        let segment = Segment {
            id: Uuid::new_v4(),
            key: "everyone".to_string(),
            name: "Everyone".to_string(),
            match_type: MatchType::All,
            constraints: vec![], // matches everyone
        };

        // Rule with rank 2 (should be evaluated second)
        let rule2 = TargetingRule {
            id: Uuid::new_v4(),
            rank: 2,
            description: None,
            segments: vec![RuleSegment {
                segment_id: segment.id,
                negate: false,
            }],
            distributions: vec![],
            variant_id: Some(variant_b.id),
        };

        // Rule with rank 1 (should be evaluated first — wins)
        let rule1 = TargetingRule {
            id: Uuid::new_v4(),
            rank: 1,
            description: None,
            segments: vec![RuleSegment {
                segment_id: segment.id,
                negate: false,
            }],
            distributions: vec![],
            variant_id: Some(variant_a.id),
        };

        let flag = FlagConfig {
            key: "ordered-flag".to_string(),
            flag_type: FlagType::String,
            variants: vec![variant_a, variant_b, variant_default.clone()],
            environment: FlagEnvironment {
                enabled: true,
                default_variant_id: variant_default.id,
                // Intentionally put rule2 before rule1 in vec — evaluator should sort by rank
                rules: vec![rule2, rule1],
                overrides: vec![],
            },
        };

        let evaluator = make_evaluator(vec![flag], vec![segment]);
        let result =
            evaluator.evaluate("ordered-flag", &EvaluationContext::default(), &json!("default"));
        assert_eq!(result.reason, EvaluationReason::RuleMatch);
        assert_eq!(result.value, json!("alpha")); // rule1 (rank 1) should win
    }

    #[test]
    fn test_negated_segment() {
        let on_variant = make_variant("on", json!(true));
        let off_variant = make_variant("off", json!(false));
        let on_id = on_variant.id;

        let beta_segment = Segment {
            id: Uuid::new_v4(),
            key: "beta-users".to_string(),
            name: "Beta Users".to_string(),
            match_type: MatchType::All,
            constraints: vec![SegmentConstraint {
                attribute: "beta".to_string(),
                operator: Operator::Eq,
                values: vec!["true".to_string()],
            }],
        };

        // Negate the segment — target everyone NOT in beta
        let rule = TargetingRule {
            id: Uuid::new_v4(),
            rank: 1,
            description: None,
            segments: vec![RuleSegment {
                segment_id: beta_segment.id,
                negate: true,
            }],
            distributions: vec![],
            variant_id: Some(on_id),
        };

        let flag = FlagConfig {
            key: "non-beta-feature".to_string(),
            flag_type: FlagType::Boolean,
            variants: vec![on_variant, off_variant.clone()],
            environment: FlagEnvironment {
                enabled: true,
                default_variant_id: off_variant.id,
                rules: vec![rule],
                overrides: vec![],
            },
        };

        let evaluator = make_evaluator(vec![flag], vec![beta_segment]);

        // Non-beta user should match (negated segment)
        let ctx = EvaluationContext {
            targeting_key: Some("user-1".to_string()),
            attributes: HashMap::from([("beta".to_string(), json!("false"))]),
        };
        let result = evaluator.evaluate("non-beta-feature", &ctx, &json!(false));
        assert_eq!(result.reason, EvaluationReason::RuleMatch);
        assert_eq!(result.value, json!(true));

        // Beta user should NOT match
        let ctx_beta = EvaluationContext {
            targeting_key: Some("user-2".to_string()),
            attributes: HashMap::from([("beta".to_string(), json!("true"))]),
        };
        let result = evaluator.evaluate("non-beta-feature", &ctx_beta, &json!(false));
        assert_eq!(result.reason, EvaluationReason::Default);
    }
}
