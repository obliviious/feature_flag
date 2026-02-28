use crate::types::Operator;

/// Evaluate a constraint operator against context attribute value(s).
///
/// `attribute_value` is the value from the evaluation context.
/// `constraint_values` are the values specified in the segment constraint.
///
/// Returns true if the constraint is satisfied.
pub fn evaluate_operator(
    operator: &Operator,
    attribute_value: &serde_json::Value,
    constraint_values: &[String],
) -> bool {
    match operator {
        Operator::Eq => op_eq(attribute_value, constraint_values),
        Operator::Neq => !op_eq(attribute_value, constraint_values),
        Operator::Gt => numeric_cmp(attribute_value, constraint_values, |a, b| a > b),
        Operator::Gte => numeric_cmp(attribute_value, constraint_values, |a, b| a >= b),
        Operator::Lt => numeric_cmp(attribute_value, constraint_values, |a, b| a < b),
        Operator::Lte => numeric_cmp(attribute_value, constraint_values, |a, b| a <= b),
        Operator::In => op_in(attribute_value, constraint_values),
        Operator::NotIn => !op_in(attribute_value, constraint_values),
        Operator::Contains => string_op(attribute_value, constraint_values, |attr, val| {
            attr.contains(val)
        }),
        Operator::StartsWith => string_op(attribute_value, constraint_values, |attr, val| {
            attr.starts_with(val)
        }),
        Operator::EndsWith => string_op(attribute_value, constraint_values, |attr, val| {
            attr.ends_with(val)
        }),
        Operator::Matches => op_matches(attribute_value, constraint_values),
        Operator::SemverEq => semver_cmp(attribute_value, constraint_values, |a, b| a == b),
        Operator::SemverGt => semver_cmp(attribute_value, constraint_values, |a, b| a > b),
        Operator::SemverLt => semver_cmp(attribute_value, constraint_values, |a, b| a < b),
    }
}

fn to_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(n.to_string()),
        serde_json::Value::Bool(b) => Some(b.to_string()),
        _ => None,
    }
}

fn to_f64(value: &serde_json::Value) -> Option<f64> {
    match value {
        serde_json::Value::Number(n) => n.as_f64(),
        serde_json::Value::String(s) => s.parse::<f64>().ok(),
        _ => None,
    }
}

fn op_eq(attribute_value: &serde_json::Value, constraint_values: &[String]) -> bool {
    let Some(attr_str) = to_string(attribute_value) else {
        return false;
    };
    constraint_values.iter().any(|v| *v == attr_str)
}

fn op_in(attribute_value: &serde_json::Value, constraint_values: &[String]) -> bool {
    // If the attribute is an array, check if any element is in constraint_values
    if let serde_json::Value::Array(arr) = attribute_value {
        return arr.iter().any(|item| {
            if let Some(s) = to_string(item) {
                constraint_values.contains(&s)
            } else {
                false
            }
        });
    }
    // Otherwise treat as scalar
    op_eq(attribute_value, constraint_values)
}

fn numeric_cmp(
    attribute_value: &serde_json::Value,
    constraint_values: &[String],
    cmp: fn(f64, f64) -> bool,
) -> bool {
    let Some(attr_num) = to_f64(attribute_value) else {
        return false;
    };
    constraint_values.iter().any(|v| {
        v.parse::<f64>()
            .map(|cv| cmp(attr_num, cv))
            .unwrap_or(false)
    })
}

fn string_op(
    attribute_value: &serde_json::Value,
    constraint_values: &[String],
    op: fn(&str, &str) -> bool,
) -> bool {
    let Some(attr_str) = to_string(attribute_value) else {
        return false;
    };
    constraint_values.iter().any(|v| op(&attr_str, v))
}

fn op_matches(attribute_value: &serde_json::Value, constraint_values: &[String]) -> bool {
    let Some(attr_str) = to_string(attribute_value) else {
        return false;
    };
    constraint_values.iter().any(|pattern| {
        regex::Regex::new(pattern)
            .map(|re| re.is_match(&attr_str))
            .unwrap_or(false)
    })
}

fn semver_cmp(
    attribute_value: &serde_json::Value,
    constraint_values: &[String],
    cmp: fn(&semver::Version, &semver::Version) -> bool,
) -> bool {
    let Some(attr_str) = to_string(attribute_value) else {
        return false;
    };
    let Ok(attr_ver) = semver::Version::parse(&attr_str) else {
        return false;
    };
    constraint_values.iter().any(|v| {
        semver::Version::parse(v)
            .map(|cv| cmp(&attr_ver, &cv))
            .unwrap_or(false)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_eq_string() {
        assert!(evaluate_operator(
            &Operator::Eq,
            &json!("US"),
            &["US".into()]
        ));
        assert!(!evaluate_operator(
            &Operator::Eq,
            &json!("UK"),
            &["US".into()]
        ));
    }

    #[test]
    fn test_eq_number() {
        assert!(evaluate_operator(
            &Operator::Eq,
            &json!(42),
            &["42".into()]
        ));
    }

    #[test]
    fn test_neq() {
        assert!(evaluate_operator(
            &Operator::Neq,
            &json!("UK"),
            &["US".into()]
        ));
        assert!(!evaluate_operator(
            &Operator::Neq,
            &json!("US"),
            &["US".into()]
        ));
    }

    #[test]
    fn test_gt_gte_lt_lte() {
        assert!(evaluate_operator(
            &Operator::Gt,
            &json!(10),
            &["5".into()]
        ));
        assert!(!evaluate_operator(
            &Operator::Gt,
            &json!(5),
            &["5".into()]
        ));
        assert!(evaluate_operator(
            &Operator::Gte,
            &json!(5),
            &["5".into()]
        ));
        assert!(evaluate_operator(
            &Operator::Lt,
            &json!(3),
            &["5".into()]
        ));
        assert!(evaluate_operator(
            &Operator::Lte,
            &json!(5),
            &["5".into()]
        ));
    }

    #[test]
    fn test_in_not_in() {
        assert!(evaluate_operator(
            &Operator::In,
            &json!("US"),
            &["US".into(), "UK".into(), "CA".into()]
        ));
        assert!(!evaluate_operator(
            &Operator::In,
            &json!("DE"),
            &["US".into(), "UK".into()]
        ));
        assert!(evaluate_operator(
            &Operator::NotIn,
            &json!("DE"),
            &["US".into(), "UK".into()]
        ));
    }

    #[test]
    fn test_contains() {
        assert!(evaluate_operator(
            &Operator::Contains,
            &json!("hello world"),
            &["world".into()]
        ));
        assert!(!evaluate_operator(
            &Operator::Contains,
            &json!("hello"),
            &["world".into()]
        ));
    }

    #[test]
    fn test_starts_with_ends_with() {
        assert!(evaluate_operator(
            &Operator::StartsWith,
            &json!("user@example.com"),
            &["user".into()]
        ));
        assert!(evaluate_operator(
            &Operator::EndsWith,
            &json!("user@example.com"),
            &[".com".into()]
        ));
    }

    #[test]
    fn test_matches_regex() {
        assert!(evaluate_operator(
            &Operator::Matches,
            &json!("user-123"),
            &[r"^user-\d+$".into()]
        ));
        assert!(!evaluate_operator(
            &Operator::Matches,
            &json!("admin-abc"),
            &[r"^user-\d+$".into()]
        ));
    }

    #[test]
    fn test_semver() {
        assert!(evaluate_operator(
            &Operator::SemverEq,
            &json!("1.2.3"),
            &["1.2.3".into()]
        ));
        assert!(evaluate_operator(
            &Operator::SemverGt,
            &json!("2.0.0"),
            &["1.9.9".into()]
        ));
        assert!(evaluate_operator(
            &Operator::SemverLt,
            &json!("1.0.0"),
            &["2.0.0".into()]
        ));
    }

    #[test]
    fn test_in_with_array_attribute() {
        assert!(evaluate_operator(
            &Operator::In,
            &json!(["admin", "editor"]),
            &["admin".into()]
        ));
        assert!(!evaluate_operator(
            &Operator::In,
            &json!(["viewer"]),
            &["admin".into()]
        ));
    }
}
