export interface FetchWithRetryOptions {
  /** Max retries after HTTP 429 (default: 3). */
  maxRetries?: number;
  /** Called before waiting on a rate-limit response. */
  onRateLimited?: (info: { retryAfterMs: number; attempt: number }) => void;
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const asSeconds = Number(header);
  if (!Number.isNaN(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch wrapper that retries on HTTP 429 using Retry-After when present.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  let attempt = 0;

  while (true) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= maxRetries) {
      return res;
    }

    attempt += 1;
    const retryAfterMs =
      parseRetryAfterMs(res.headers.get("Retry-After")) ??
      Math.min(1000 * Math.pow(2, attempt - 1), 30_000);

    options.onRateLimited?.({ retryAfterMs, attempt });
    await sleep(retryAfterMs);
  }
}
