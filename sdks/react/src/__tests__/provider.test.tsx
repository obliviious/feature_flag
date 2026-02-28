import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { FlagForgeProvider } from "../provider";
import { useFlagForge } from "../hooks/use-flagforge";

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
function wrapper({ children }: { children: ReactNode }) {
  return (
    <FlagForgeProvider config={{ clientKey: "cli_test" }}>
      {children}
    </FlagForgeProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

describe("FlagForgeProvider", () => {
  it("creates client with correct config and calls init()", () => {
    render(
      <FlagForgeProvider config={{ clientKey: "cli_abc" }}>
        <div />
      </FlagForgeProvider>,
    );

    expect(capturedConfig.clientKey).toBe("cli_abc");
    expect(mockInit).toHaveBeenCalledOnce();
  });

  it("calls destroy() on unmount", () => {
    const { unmount } = render(
      <FlagForgeProvider config={{ clientKey: "cli_abc" }}>
        <div />
      </FlagForgeProvider>,
    );

    unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it("sets isReady when onReady callback fires", async () => {
    const { result } = renderHook(() => useFlagForge(), { wrapper });

    expect(result.current.isReady).toBe(false);

    await act(async () => {
      (capturedConfig.onReady as () => void)();
    });

    expect(result.current.isReady).toBe(true);
  });

  it("sets error when onError callback fires", async () => {
    const { result } = renderHook(() => useFlagForge(), { wrapper });

    expect(result.current.error).toBeNull();

    await act(async () => {
      (capturedConfig.onError as (e: Error) => void)(new Error("boom"));
    });

    expect(result.current.error?.message).toBe("boom");
  });

  it("increments updateCount when onUpdate callback fires", async () => {
    const { result } = renderHook(() => useFlagForge(), { wrapper });

    expect(result.current.updateCount).toBe(0);

    await act(async () => {
      (capturedConfig.onUpdate as (cfg: unknown) => void)({});
    });

    expect(result.current.updateCount).toBe(1);

    await act(async () => {
      (capturedConfig.onUpdate as (cfg: unknown) => void)({});
    });

    expect(result.current.updateCount).toBe(2);
  });

  it("forwards user callbacks via refs", async () => {
    const userOnReady = vi.fn();
    const userOnError = vi.fn();
    const userOnUpdate = vi.fn();

    render(
      <FlagForgeProvider
        config={{ clientKey: "cli_test" }}
        onReady={userOnReady}
        onError={userOnError}
        onUpdate={userOnUpdate}
      >
        <div />
      </FlagForgeProvider>,
    );

    await act(async () => {
      (capturedConfig.onReady as () => void)();
    });
    expect(userOnReady).toHaveBeenCalledOnce();

    const err = new Error("test");
    await act(async () => {
      (capturedConfig.onError as (e: Error) => void)(err);
    });
    expect(userOnError).toHaveBeenCalledWith(err);

    const cfg = { flags: {}, segments: {}, version: 1 };
    await act(async () => {
      (capturedConfig.onUpdate as (c: unknown) => void)(cfg);
    });
    expect(userOnUpdate).toHaveBeenCalledWith(cfg);
  });
});

describe("useFlagForge", () => {
  it("throws when used outside provider", () => {
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useFlagForge());
    }).toThrow("useFlagForge must be used within a <FlagForgeProvider>");

    spy.mockRestore();
  });
});
