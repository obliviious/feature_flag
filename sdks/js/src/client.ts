import type {
  EvaluationContext,
  EvaluationResult,
  FlagsConfig,
} from "./types";
import { Evaluator } from "./evaluator";
import { transformFlagsConfig, transformEvaluationResult } from "./transform";

export interface FlagForgeConfig {
  /** Server SDK key (srv_...) for local evaluation. */
  serverKey?: string;
  /** Client SDK key (cli_...) for remote evaluation. */
  clientKey?: string;
  /** Base URL of the FlagForge server (default: http://localhost:8080). */
  baseUrl?: string;
  /** Default evaluation context (used when no per-call context is provided). */
  context?: EvaluationContext;
  /** Use SSE streaming for real-time config updates (default: true for server SDK). */
  streaming?: boolean;
  /** Polling interval in ms — fallback when streaming is disabled or unavailable (default: 30000). */
  pollingInterval?: number;
  /** Called when the config is updated (via stream or poll). */
  onUpdate?: (config: FlagsConfig) => void;
  /** Called on errors. */
  onError?: (error: Error) => void;
  /** Called when the client has fetched initial config and is ready. */
  onReady?: () => void;
}

/**
 * FlagForge SDK client.
 *
 * Server-side: fetches full config via SSE stream + evaluates locally (nanosecond latency).
 * Client-side: calls the server for evaluation (no rule leakage).
 */
export class FlagForgeClient {
  private config: FlagForgeConfig;
  private evaluator: Evaluator;
  private apiKey: string;
  private isServerSdk: boolean;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private streamAbort: AbortController | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: FlagForgeConfig) {
    this.config = {
      baseUrl: "http://35.173.133.219:8080",
      pollingInterval: 30_000,
      streaming: true,
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

  /** Initialize the client — fetches initial config and starts streaming/polling. */
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
      this.config.onReady?.();

      // Start real-time updates for server SDK
      if (this.isServerSdk) {
        if (this.config.streaming) {
          this.connectStream();
        } else {
          this.startPolling();
        }
      }
    } catch (error) {
      this.config.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      // Fail-static: SDK remains usable, returns defaults
      this.initialized = true;

      // Fall back to polling if streaming init failed
      if (this.isServerSdk) {
        this.startPolling();
      }
    }
  }

  // ============================================================
  // Evaluation methods
  // ============================================================

  /** Evaluate a single flag. */
  async evaluate(
    flagKey: string,
    context?: EvaluationContext,
    defaultValue?: unknown,
  ): Promise<EvaluationResult> {
    if (!this.initialized) await this.init();

    if (this.isServerSdk) {
      const ctx = context ?? this.config.context ?? {};
      return this.evaluator.evaluate(flagKey, ctx, defaultValue ?? null);
    }

    return this.remoteEvaluate(flagKey, context, defaultValue);
  }

  /** Evaluate multiple flags at once. */
  async evaluateBatch(
    flags: Array<{ flagKey: string; defaultValue?: unknown }>,
    context?: EvaluationContext,
  ): Promise<EvaluationResult[]> {
    if (!this.initialized) await this.init();

    if (this.isServerSdk) {
      const ctx = context ?? this.config.context ?? {};
      return flags.map((f) =>
        this.evaluator.evaluate(f.flagKey, ctx, f.defaultValue ?? null),
      );
    }

    return this.remoteBatchEvaluate(flags, context);
  }

  // ============================================================
  // Typed convenience methods
  // ============================================================

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

  // ============================================================
  // Lifecycle
  // ============================================================

  /** Stop streaming/polling and clean up resources. */
  destroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.streamAbort) {
      this.streamAbort.abort();
      this.streamAbort = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** Whether the client has finished initialization. */
  get isReady(): boolean {
    return this.initialized;
  }

  // ============================================================
  // SSE Streaming (fetch + ReadableStream)
  // ============================================================

  /**
   * Connect to the SSE stream for real-time config updates.
   * Uses fetch instead of EventSource because EventSource doesn't support
   * custom Authorization headers.
   */
  private async connectStream(): Promise<void> {
    this.streamAbort?.abort();
    const abort = new AbortController();
    this.streamAbort = abort;

    try {
      const res = await fetch(`${this.config.baseUrl}/api/v1/stream`, {
        headers: {
          Authorization: this.apiKey,
          Accept: "text/event-stream",
        },
        signal: abort.signal,
      });

      if (!res.ok) {
        throw new Error(`Stream connect failed (${res.status})`);
      }

      if (!res.body) {
        throw new Error("Stream body is null — environment may not support ReadableStream");
      }

      // Successful connection — reset backoff
      this.reconnectAttempts = 0;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!abort.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSE(buffer);
        buffer = remaining;

        for (const event of events) {
          if (event.type === "config" && event.data) {
            try {
              const raw = JSON.parse(event.data);
              const config = transformFlagsConfig(raw);
              this.evaluator.update(config);
              this.config.onUpdate?.(config);
            } catch (e) {
              this.config.onError?.(
                new Error(`Failed to parse config event: ${e}`),
              );
            }
          } else if (event.type === "error") {
            this.config.onError?.(
              new Error(`Stream error: ${event.data}`),
            );
          }
        }
      }
    } catch (error) {
      // Don't report errors from intentional disconnect
      if (abort.signal.aborted) return;
      this.config.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Auto-reconnect if not intentionally destroyed
    if (!abort.signal.aborted) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connectStream(), delay);
  }

  // ============================================================
  // HTTP API calls
  // ============================================================

  private async fetchFlagsConfig(): Promise<FlagsConfig> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/flags-config`, {
      headers: { Authorization: this.apiKey },
    });

    if (!res.ok) {
      throw new Error(`FlagForge: failed to fetch config (${res.status})`);
    }

    const raw = await res.json();
    return transformFlagsConfig(raw);
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

      const raw = await res.json();
      return transformEvaluationResult(raw);
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

  private async remoteBatchEvaluate(
    flags: Array<{ flagKey: string; defaultValue?: unknown }>,
    context?: EvaluationContext,
  ): Promise<EvaluationResult[]> {
    try {
      const ctx = context ?? this.config.context ?? {};
      const res = await fetch(
        `${this.config.baseUrl}/api/v1/evaluate/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.apiKey,
          },
          body: JSON.stringify({
            flags: flags.map((f) => ({
              flag_key: f.flagKey,
              default_value: f.defaultValue ?? null,
            })),
            context: {
              targeting_key: ctx.targetingKey,
              attributes: ctx.attributes ?? {},
            },
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`Batch evaluation failed (${res.status})`);
      }

      const raw = (await res.json()) as unknown[];
      return raw.map(transformEvaluationResult);
    } catch (error) {
      this.config.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      // Return defaults for all flags on error
      return flags.map((f) => ({
        flagKey: f.flagKey,
        variantKey: "",
        value: f.defaultValue ?? null,
        reason: "ERROR" as const,
      }));
    }
  }

  // ============================================================
  // Polling fallback
  // ============================================================

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

// ============================================================
// SSE Parser
// ============================================================

interface SSEEvent {
  type: string;
  data: string;
}

/**
 * Parse SSE events from a text buffer.
 * Returns fully parsed events and the remaining incomplete buffer.
 */
export function parseSSE(buffer: string): {
  events: SSEEvent[];
  remaining: string;
} {
  const events: SSEEvent[] = [];

  // Events are delimited by blank lines (\n\n)
  const lastDelim = buffer.lastIndexOf("\n\n");
  if (lastDelim === -1) {
    return { events: [], remaining: buffer };
  }

  const complete = buffer.slice(0, lastDelim);
  const remaining = buffer.slice(lastDelim + 2);

  // Split into raw event blocks
  const blocks = complete.split("\n\n");

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventType = "message";
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith(":")) {
        // Comment line (keepalive), skip
        continue;
      } else if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length > 0) {
      events.push({ type: eventType, data: dataLines.join("\n") });
    }
  }

  return { events, remaining };
}
