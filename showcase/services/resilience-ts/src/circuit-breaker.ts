/**
 * Circuit breaker: after `failureThreshold` consecutive failures, calls fail
 * fast for `resetTimeoutMs` instead of piling load onto an unhealthy
 * dependency. Then a single trial call decides whether to close the circuit
 * or open it again.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  /** Errors that should not count against the dependency (e.g. 404s). */
  isFailure?: (error: unknown) => boolean;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  now?: () => number;
}

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`circuit open; retry in ${retryAfterMs}ms`);
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  #state: CircuitState = 'closed';
  #failures = 0;
  #openedAt = 0;
  #trialInFlight = false;

  readonly #failureThreshold: number;
  readonly #resetTimeoutMs: number;
  readonly #isFailure: (error: unknown) => boolean;
  readonly #onStateChange?: (from: CircuitState, to: CircuitState) => void;
  readonly #now: () => number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.#failureThreshold = options.failureThreshold ?? 5;
    this.#resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.#isFailure = options.isFailure ?? (() => true);
    this.#onStateChange = options.onStateChange;
    this.#now = options.now ?? Date.now;
  }

  get state(): CircuitState {
    if (
      this.#state === 'open' &&
      this.#now() - this.#openedAt >= this.#resetTimeoutMs
    ) {
      this.#transition('half-open');
    }
    return this.#state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const state = this.state;
    if (state === 'open') {
      throw new CircuitOpenError(
        this.#resetTimeoutMs - (this.#now() - this.#openedAt)
      );
    }
    if (state === 'half-open') {
      if (this.#trialInFlight) throw new CircuitOpenError(0);
      this.#trialInFlight = true;
    }

    try {
      const result = await operation();
      this.#onSuccess();
      return result;
    } catch (error) {
      if (this.#isFailure(error)) this.#onFailure();
      else this.#onSuccess();
      throw error;
    } finally {
      if (state === 'half-open') this.#trialInFlight = false;
    }
  }

  #onSuccess(): void {
    this.#failures = 0;
    if (this.#state !== 'closed') this.#transition('closed');
  }

  #onFailure(): void {
    this.#failures++;
    if (
      this.#state === 'half-open' ||
      this.#failures >= this.#failureThreshold
    ) {
      this.#openedAt = this.#now();
      this.#transition('open');
    }
  }

  #transition(to: CircuitState): void {
    const from = this.#state;
    if (from === to) return;
    this.#state = to;
    this.#onStateChange?.(from, to);
  }
}
