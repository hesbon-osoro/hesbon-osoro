/**
 * Retries with exponential backoff and "full jitter" (AWS Architecture Blog,
 * "Exponential Backoff And Jitter"), so a fleet of clients recovering from
 * the same outage doesn't retry in lockstep and knock the dependency over again.
 */

export interface RetryOptions {
  /** Total attempts including the first one. */
  maxAttempts?: number;
  /** Delay cap for the first retry, in ms. */
  baseDelayMs?: number;
  /** Upper bound for any single delay, in ms. */
  maxDelayMs?: number;
  /** Return false for errors that will never succeed (4xx, validation...). */
  isRetryable?: (error: unknown) => boolean;
  /** Hook for logs/metrics before each retry. */
  onRetry?: (info: {
    attempt: number;
    delayMs: number;
    error: unknown;
  }) => void;
  signal?: AbortSignal;
  /** Injected for deterministic tests. */
  random?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export class RetryError extends Error {
  readonly attempts: number;

  constructor(attempts: number, cause: unknown) {
    super(`gave up after ${attempts} attempt(s)`, { cause });
    this.name = 'RetryError';
    this.attempts = attempts;
  }
}

export function backoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number = Math.random
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  return Math.floor(random() * ceiling);
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 5,
    baseDelayMs = 100,
    maxDelayMs = 10_000,
    isRetryable = () => true,
    onRetry,
    signal,
    random = Math.random,
    sleep: wait = sleep,
  } = options;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError('maxAttempts must be a positive integer');
  }

  for (let attempt = 1; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw new RetryError(attempt, error);
      }
      const delayMs = backoffDelay(attempt, baseDelayMs, maxDelayMs, random);
      onRetry?.({ attempt, delayMs, error });
      await wait(delayMs, signal);
    }
  }
}
