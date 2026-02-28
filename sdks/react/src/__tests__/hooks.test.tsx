import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FlagForgeProvider } from "../provider";
import { useFlag } from "../hooks/use-flag";
import { useBooleanFlag } from "../hooks/use-boolean-flag";
import { useStringFlag } from "../hooks/use-string-flag";
import { useNumberFlag } from "../hooks/use-number-flag";
import { useJsonFlag } from "../hooks/use-json-flag";

// ── Mock FlagForgeClient ──────────────────────────────────────────────
const mockInit = vi.fn().mockResolvedValue(undefined);
const mockDestroy = vi.fn();
const mockEvaluate = vi.fn();

let capturedConfig: Record<string, unknown>;

vi.mock("@flagforge/sdk-js", () => ({
  FlagForgeClient: class MockClient {
    constructor(config: Record<string, unknown>) {
      capturedConfig = config;
    }
    init = mockInit;
    destroy = mockDestroy;
    evaluate = mockEvaluate;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FlagForgeProvider config={{ clientKey: "cli_test" }}>
        {children}
      </FlagForgeProvider>
    );
  };
}

function fireReady() {
  (capturedConfig.onReady as () => void)();
}

function fireUpdate() {
  (capturedConfig.onUpdate as (cfg: unknown) => void)({});
}

// ── Tests ─────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFlag", () => {
  it("returns loading: true initially, then evaluates", async () => {
    mockEvaluate.mockResolvedValue({
      flagKey: "test-flag",
      variantKey: "on",
      value: "hello",
      reason: "DEFAULT",
    });

    const { result } = renderHook(
      () => useFlag("test-flag", "fallback"),
      { wrapper: createWrapper() },
    );

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.value).toBe("fallback");

    // Fire ready to trigger evaluation
    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe("hello");
    expect(result.current.reason).toBe("DEFAULT");
  });

  it("re-evaluates on updateCount change", async () => {
    mockEvaluate
      .mockResolvedValueOnce({
        flagKey: "test-flag",
        variantKey: "v1",
        value: "first",
        reason: "DEFAULT",
      })
      .mockResolvedValueOnce({
        flagKey: "test-flag",
        variantKey: "v2",
        value: "second",
        reason: "RULE_MATCH",
      });

    const { result } = renderHook(
      () => useFlag("test-flag", "fallback"),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.value).toBe("first");
    });

    // Trigger an update
    await act(async () => {
      fireUpdate();
    });

    await waitFor(() => {
      expect(result.current.value).toBe("second");
    });

    expect(result.current.reason).toBe("RULE_MATCH");
  });
});

describe("useBooleanFlag", () => {
  it("returns the boolean value when type matches", async () => {
    mockEvaluate.mockResolvedValue({
      flagKey: "bool-flag",
      variantKey: "on",
      value: true,
      reason: "DEFAULT",
    });

    const { result } = renderHook(
      () => useBooleanFlag("bool-flag", false),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe(true);
  });

  it("returns defaultValue when type does not match", async () => {
    mockEvaluate.mockResolvedValue({
      flagKey: "bool-flag",
      variantKey: "variant",
      value: "not-a-boolean",
      reason: "DEFAULT",
    });

    const { result } = renderHook(
      () => useBooleanFlag("bool-flag", false),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe(false);
  });
});

describe("useStringFlag", () => {
  it("returns the string value when type matches", async () => {
    mockEvaluate.mockResolvedValue({
      flagKey: "str-flag",
      variantKey: "v1",
      value: "hello",
      reason: "RULE_MATCH",
    });

    const { result } = renderHook(
      () => useStringFlag("str-flag", "default"),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe("hello");
  });

  it("returns defaultValue when type does not match", async () => {
    mockEvaluate.mockResolvedValue({
      flagKey: "str-flag",
      variantKey: "v1",
      value: 42,
      reason: "DEFAULT",
    });

    const { result } = renderHook(
      () => useStringFlag("str-flag", "fallback"),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe("fallback");
  });
});

describe("useNumberFlag", () => {
  it("returns the number value when type matches", async () => {
    mockEvaluate.mockResolvedValue({
      flagKey: "num-flag",
      variantKey: "v1",
      value: 42,
      reason: "DEFAULT",
    });

    const { result } = renderHook(
      () => useNumberFlag("num-flag", 0),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe(42);
  });
});

describe("useJsonFlag", () => {
  it("returns the JSON value as the generic type", async () => {
    const jsonValue = { theme: "dark", fontSize: 14 };
    mockEvaluate.mockResolvedValue({
      flagKey: "json-flag",
      variantKey: "v1",
      value: jsonValue,
      reason: "DEFAULT",
    });

    const { result } = renderHook(
      () =>
        useJsonFlag<{ theme: string; fontSize: number }>(
          "json-flag",
          { theme: "light", fontSize: 12 },
        ),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      fireReady();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toEqual({ theme: "dark", fontSize: 14 });
  });
});
