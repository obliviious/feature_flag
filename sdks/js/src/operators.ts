import type { Operator } from "./types";

/**
 * Evaluate a constraint operator against a context attribute value.
 */
export function evaluateOperator(
  operator: Operator,
  attributeValue: unknown,
  constraintValues: string[],
): boolean {
  switch (operator) {
    case "eq":
      return opEq(attributeValue, constraintValues);
    case "neq":
      return !opEq(attributeValue, constraintValues);
    case "gt":
      return numericCmp(attributeValue, constraintValues, (a, b) => a > b);
    case "gte":
      return numericCmp(attributeValue, constraintValues, (a, b) => a >= b);
    case "lt":
      return numericCmp(attributeValue, constraintValues, (a, b) => a < b);
    case "lte":
      return numericCmp(attributeValue, constraintValues, (a, b) => a <= b);
    case "in":
      return opIn(attributeValue, constraintValues);
    case "not_in":
      return !opIn(attributeValue, constraintValues);
    case "contains":
      return stringOp(attributeValue, constraintValues, (a, v) =>
        a.includes(v),
      );
    case "starts_with":
      return stringOp(attributeValue, constraintValues, (a, v) =>
        a.startsWith(v),
      );
    case "ends_with":
      return stringOp(attributeValue, constraintValues, (a, v) =>
        a.endsWith(v),
      );
    case "matches":
      return opMatches(attributeValue, constraintValues);
    case "semver_eq":
      return semverCmp(attributeValue, constraintValues, (a, b) => a === b);
    case "semver_gt":
      return semverCmp(
        attributeValue,
        constraintValues,
        (a, b) => compareSemver(a, b) > 0,
      );
    case "semver_lt":
      return semverCmp(
        attributeValue,
        constraintValues,
        (a, b) => compareSemver(a, b) < 0,
      );
    default:
      return false;
  }
}

function toString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value.toString();
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  return null;
}

function opEq(attributeValue: unknown, constraintValues: string[]): boolean {
  const str = toString(attributeValue);
  if (str === null) return false;
  return constraintValues.some((v) => v === str);
}

function opIn(attributeValue: unknown, constraintValues: string[]): boolean {
  if (Array.isArray(attributeValue)) {
    return attributeValue.some((item) => {
      const s = toString(item);
      return s !== null && constraintValues.includes(s);
    });
  }
  return opEq(attributeValue, constraintValues);
}

function numericCmp(
  attributeValue: unknown,
  constraintValues: string[],
  cmp: (a: number, b: number) => boolean,
): boolean {
  const num = toNumber(attributeValue);
  if (num === null) return false;
  return constraintValues.some((v) => {
    const cv = parseFloat(v);
    return !isNaN(cv) && cmp(num, cv);
  });
}

function stringOp(
  attributeValue: unknown,
  constraintValues: string[],
  op: (attr: string, val: string) => boolean,
): boolean {
  const str = toString(attributeValue);
  if (str === null) return false;
  return constraintValues.some((v) => op(str, v));
}

function opMatches(
  attributeValue: unknown,
  constraintValues: string[],
): boolean {
  const str = toString(attributeValue);
  if (str === null) return false;
  return constraintValues.some((pattern) => {
    try {
      return new RegExp(pattern).test(str);
    } catch {
      return false;
    }
  });
}

/**
 * Parse a semver string into [major, minor, patch].
 */
function parseSemver(s: string): [number, number, number] | null {
  const match = s.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * Compare two semver strings. Returns -1, 0, or 1.
 */
function compareSemver(a: string, b: string): number {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av || !bv) return 0;
  for (let i = 0; i < 3; i++) {
    if (av[i] < bv[i]) return -1;
    if (av[i] > bv[i]) return 1;
  }
  return 0;
}

function semverCmp(
  attributeValue: unknown,
  constraintValues: string[],
  cmp: (a: string, b: string) => boolean,
): boolean {
  const str = toString(attributeValue);
  if (str === null || !parseSemver(str)) return false;
  return constraintValues.some((v) => parseSemver(v) !== null && cmp(str, v));
}
