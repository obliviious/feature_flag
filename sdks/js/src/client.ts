import type {
  EvaluationContext,
  EvaluationResult,
  FlagsConfig,
} from "@flagforge/shared-types";
import { Evaluator } from "./evaluator";

export interface FlagForgeConfig {
  /** Server SDK key (srv_...) for local evaluation, or client key (cli_...) for remote evaluation. */
  serverKey?: string;
  clientKey?: string;
  /** Base URL of the FlagForge server. */
  baseUrl?: string;
  /** Default evaluation context (client-side SDK). */
  context?: EvaluationContext;
  /** Polling interval in milliseconds (default: 30000). */
  pollingInterval?: number;
  /** Called when the config is updated. */
  onUpdate?: (config: FlagsConfig) => void;
  /** Called on errors. */
  onError?: (error: Error) => void;
}

/**
 * FlagForge SDK client.
 *
 * Server-side: fetches full config + evaluates locally (nanosecond latency).
 * Client-side: calls the server for evaluation (no rule leakage).
 */
export class FlagForgeClient {
  private config: FlagForgeConfig;
  private evaluator: Evaluator;
  private apiKey: string;
  private isServerSdk: boolean;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: FlagForgeConfig) {
    this.config = {
      baseUrl: "http://localhost:8080",
      pollingInterval: 30_000,
      ...config,
    };

    this.apiKey = config.serverKey ?? config.clientKey ?? "";
    this.isServerSdk = !!config.serverKey;
    this.evaluator = new Evaluator();

    if (!this.apiKey) {
      throw new Error(
        "FlagForge: either serverKey or clientKey must be provided",
      );
    }
  }

  /** Initialize the client — fetches initial config and starts polling. */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      if (this.isServerSdk) {
        const config = await this.fetchFlagsConfig();
        this.evaluator.update(config);
      }
      this.initialized = true;
      this.startPolling();
    } catch (error) {
      this.config.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      // Fail-static: SDK remains usable, returns defaults
      this.initialized = true;
    }
  }

  /** Evaluate a flag — returns the full evaluation result. */
  async evaluate(
    flagKey: string,
    context?: EvaluationContext,
    defaultValue?: unknown,
  ): Promise<EvaluationResult> {
    if (!this.initialized) await this.init();

    if (this.isServerSdk) {
      // Local evaluation
      const ctx = context ?? this.config.context ?? {};
      return this.evaluator.evaluate(flagKey, ctx, defaultValue ?? null);
    }

    // Remote evaluation (client SDK)
    return this.remoteEvaluate(flagKey, context, defaultValue);
  }

  /** Get a boolean flag value. */
  async getBooleanValue(
    flagKey: string,
    defaultValue: boolean,
    context?: EvaluationContext,
  ): Promise<boolean> {
    const result = await this.evaluate(flagKey, context, defaultValue);
    return typeof result.value === "boolean" ? result.value : defaultValue;
  }

  /** Get a string flag value. */
  async getStringValue(
    flagKey: string,
    defaultValue: string,
    context?: EvaluationContext,
  ): Promise<string> {
    const result = await this.evaluate(flagKey, context, defaultValue);
    return typeof result.value === "string" ? result.value : defaultValue;
  }

  /** Get a number flag value. */
  async getNumberValue(
    flagKey: string,
    defaultValue: number,
    context?: EvaluationContext,
  ): Promise<number> {
    const result = await this.evaluate(flagKey, context, defaultValue);
    return typeof result.value === "number" ? result.value : defaultValue;
  }

  /** Get a JSON flag value. */
  async getJsonValue<T = unknown>(
    flagKey: string,
    defaultValue: T,
    context?: EvaluationContext,
  ): Promise<T> {
    const result = await this.evaluate(flagKey, context, defaultValue);
    return result.value as T;
  }

  /** Stop polling and clean up resources. */
  destroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // ============================================================
  // Private methods
  // ============================================================

  private async fetchFlagsConfig(): Promise<FlagsConfig> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/flags-config`, {
      headers: { Authorization: this.apiKey },
    });

    if (!res.ok) {
      throw new Error(`FlagForge: failed to fetch config (${res.status})`);
    }

    return res.json() as Promise<FlagsConfig>;
  }

  private async remoteEvaluate(
    flagKey: string,
    context?: EvaluationContext,
    defaultValue?: unknown,
  ): Promise<EvaluationResult> {
    try {
      const ctx = context ?? this.config.context ?? {};
      const res = await fetch(`${this.config.baseUrl}/api/v1/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.apiKey,
        },
        body: JSON.stringify({
          flag_key: flagKey,
          context: {
            targeting_key: ctx.targetingKey,
            attributes: ctx.attributes ?? {},
          },
          default_value: defaultValue ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Evaluation failed (${res.status})`);
      }

      const result = (await res.json()) as Record<string, unknown>;
      return {
        flagKey: result.flag_key as string,
        variantKey: result.variant_key as string,
        value: result.value,
        reason: result.reason as EvaluationResult["reason"],
        ruleId: result.rule_id as string | undefined,
      };
    } catch (error) {
      this.config.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        flagKey,
        variantKey: "",
        value: defaultValue ?? null,
        reason: "ERROR",
      };
    }
  }

  private startPolling(): void {
    if (!this.isServerSdk || !this.config.pollingInterval) return;

    this.pollingTimer = setInterval(async () => {
      try {
        const config = await this.fetchFlagsConfig();
        this.evaluator.update(config);
        this.config.onUpdate?.(config);
      } catch (error) {
        this.config.onError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }, this.config.pollingInterval);
  }
}
